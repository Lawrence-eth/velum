import {workTerms,workIdentity,workRequestId,workReasons} from './work-order';
import {paymentCommitment} from './policy';
import type {WorkView} from './work-view';
import {checkJobResult,type AgentCapture,type JobResponse} from './cre-jobs';
import { agentResult, invoiceText, model, modelResponseText, parseProposal, systemPrompt } from './agent';
import { DurableObject } from 'cloudflare:workers';
import { emptyLedger, ledgerView, review, reserve, releasePreview, seedSepolia, reconcile, importInvoices, type LedgerState } from './ledger';
import { verifySepoliaPayment } from './chain-reconciliation';

export class AccountingLedger extends DurableObject<Env> {
 constructor(ctx: DurableObjectState, env: Env) {
  super(ctx,env);
  ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY CHECK(id=1), state TEXT NOT NULL)');
  ctx.storage.sql.exec('INSERT OR IGNORE INTO ledger(id,state) VALUES(1,?)',JSON.stringify(emptyLedger()));
 }
 private jobsInit(){
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS cre_jobs (id TEXT PRIMARY KEY, access TEXT NOT NULL, capture TEXT NOT NULL, created INTEGER NOT NULL, status TEXT NOT NULL, updated INTEGER NOT NULL, result TEXT)');
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS cre_runner (id INTEGER PRIMARY KEY, heartbeat INTEGER NOT NULL)');
 }
 private saveCapture(capture:AgentCapture):AgentCapture{this.jobsInit();if(this.ctx.storage.sql.exec<{n:number}>('SELECT COUNT(*) n FROM cre_jobs WHERE created>?',Math.floor(Date.now()/1000)-86400).one().n>=500)throw Error('Demo capacity reached');const now=Math.floor(Date.now()/1000),access=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');this.ctx.storage.sql.exec("DELETE FROM cre_jobs WHERE created<? AND json_extract(capture,'$.work') IS NULL",now-86400);this.ctx.storage.sql.exec('INSERT INTO cre_jobs VALUES(?,?,?,?,?,?,NULL)',capture.runId,access,JSON.stringify(capture),now,'ready',now);return {...capture,creAccess:access};}
 private job(id:string,access:string){this.jobsInit();const rows=this.ctx.storage.sql.exec<{id:string,access:string,capture:string,created:number,status:string,updated:number,result:string|null}>('SELECT * FROM cre_jobs WHERE id=? AND access=?',id,access).toArray();return rows[0];}
 jobView(id:string,access:string):JobResponse{const job=this.job(id,access);if(!job)return {ok:false,error:'Payment run not found'};const stale=['queued','running'].includes(job.status)&&Math.floor(Date.now()/1000)-job.updated>180;return {ok:true,status:stale?'failed':job.status,...(stale?{error:'The CRE runner did not finish in time. No network payment was sent.'}:job.result?JSON.parse(job.result):{})};}
 enqueueJob(id:string,access:string){return this.ctx.storage.transactionSync(()=>{const job=this.job(id,access),now=Math.floor(Date.now()/1000);if(!job)return {ok:false,error:'Payment run not found'};if(job.status!=='ready')return {ok:true,status:job.status};if(now-job.created>900)return {ok:false,error:'Proposal expired. Read the invoice again.'};const heartbeat=this.ctx.storage.sql.exec<{heartbeat:number}>('SELECT heartbeat FROM cre_runner WHERE id=1').toArray()[0]?.heartbeat||0;if(now-heartbeat>20)return {ok:false,error:'The live CRE runner is offline. Please retry when it is available.'};const active=this.ctx.storage.sql.exec<{n:number}>("SELECT COUNT(*) n FROM cre_jobs WHERE status IN ('queued','running') AND updated>?",now-180).one().n;const today=Math.floor(now/86400)*86400;const daily=this.ctx.storage.sql.exec<{n:number}>("SELECT COUNT(*) n FROM cre_jobs WHERE status!='ready' AND created>=?",today).one().n;if(active>=3||daily>=40)return {ok:false,error:'The public CRE demo is at capacity. Please try later.'};this.ctx.storage.sql.exec("UPDATE cre_jobs SET status='queued',updated=? WHERE id=?",now,id);return {ok:true,status:'queued'};});}
 correctCapture(id:string,access:string):AgentCapture|{ok:false;error:string}{const job=this.job(id,access);if(!job)return {ok:false,error:'Payment run not found'};const original=JSON.parse(job.capture) as AgentCapture;if(original.gate.approved)return {ok:false,error:'This proposal already matches the verified record'};const now=Math.floor(Date.now()/1000),runId=crypto.randomUUID();return this.saveCapture({ok:true,runId,createdAt:now,source:'operator-corrected',scenario:original.scenario,synthetic:true,creExecution:false,settlement:false,...agentResult({invoiceRef:'NS-101',recipient:'0x2222222222222222222222222222222222222222',amount:'2400.00'},now,runId)});}
 claimJob():{job:null|{id:string;capture:AgentCapture}}{this.jobsInit();return this.ctx.storage.transactionSync(()=>{const now=Math.floor(Date.now()/1000);this.ctx.storage.sql.exec('INSERT INTO cre_runner VALUES(1,?) ON CONFLICT(id) DO UPDATE SET heartbeat=excluded.heartbeat',now);this.ctx.storage.sql.exec("UPDATE cre_jobs SET status='failed',result=? WHERE status IN ('running','queued') AND updated<?",JSON.stringify({error:'CRE execution timed out. No network payment was sent.'}),now-180);if(this.ctx.storage.sql.exec<{n:number}>("SELECT COUNT(*) n FROM cre_jobs WHERE status='running'").one().n)return {job:null};const job=this.ctx.storage.sql.exec<{id:string,capture:string}>("SELECT id,capture FROM cre_jobs WHERE status='queued' ORDER BY created,id LIMIT 1").toArray()[0];if(!job)return {job:null};this.ctx.storage.sql.exec("UPDATE cre_jobs SET status='running',updated=? WHERE id=?",now,job.id);return {job:{id:job.id,capture:JSON.parse(job.capture)}};});}
 completeJob(id:string,result:unknown,failed:boolean){this.workInit();return this.ctx.storage.transactionSync(()=>{const job=this.ctx.storage.sql.exec<{capture:string,status:string,result:string|null}>('SELECT capture,status,result FROM cre_jobs WHERE id=?',id).toArray()[0];if(!job)return {ok:false,error:'No running job'};if(job.status==='complete')return {ok:true};if(!['running','failed','queued'].includes(job.status))return {ok:false,error:'No running job'};const source=JSON.parse(job.capture) as AgentCapture;let payload;
 try{payload=failed?{error:'CRE execution incomplete. Reservation retained; no successful payment is claimed.'}:{execution:checkJobResult(result,source.proposal)};if('execution' in payload&&payload.execution){const e=payload.execution;if(e.requestId!==source.bundle.request.id)throw Error('Source mismatch');if(source.work){if(!e.workEvidence||e.settlementMode!=='Journal-backed local Solidity with mock forwarder')throw Error('Missing work evidence');if((workReasons(source.work,e.workEvidence,e.workEvidence.observedAt).length===0&&source.gate.approved)!==e.policyApproved)throw Error('Work decision mismatch');}else if(e.policyApproved!==source.gate.approved)throw Error('Policy mismatch');}}catch{return {ok:false,error:'Invalid execution result'};}
 const status=failed?'failed':'complete';this.ctx.storage.sql.exec('UPDATE cre_jobs SET status=?,updated=?,result=? WHERE id=?',status,Math.floor(Date.now()/1000),JSON.stringify(payload),id);
 if(source.work){const paid='execution' in payload&&payload.execution?.settlementAccepted;this.ctx.storage.sql.exec('UPDATE work_attempts SET result=? WHERE id=?',JSON.stringify({status,...payload}),id);this.ctx.storage.sql.exec('UPDATE workspaces SET status=?,active=? WHERE id=? AND active=?',failed?'uncertain':paid?'paid':'held',failed?id:null,source.work.workspace,id);}return {ok:true};});}
 private workInit(){this.jobsInit();this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS work_retries(id TEXT PRIMARY KEY,n INTEGER NOT NULL)');this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,access TEXT UNIQUE NOT NULL,status TEXT NOT NULL,active TEXT,created INTEGER NOT NULL)');this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS work_attempts(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,retry TEXT NOT NULL,scenario TEXT NOT NULL,result TEXT,UNIQUE(workspace,retry))');}
 workResume(access:string):{ok:boolean;error?:string}{this.workInit();return this.ctx.storage.transactionSync(()=>{
 const w=this.ctx.storage.sql.exec<{id:string,active:string|null}>('SELECT id,active FROM workspaces WHERE access=?',access).toArray()[0];if(!w?.active)return {ok:false,error:'No pending work-order job to resume'};
 const job=this.ctx.storage.sql.exec<{status:string}>('SELECT status FROM cre_jobs WHERE id=?',w.active).toArray()[0];if(job?.status==='queued'||job?.status==='running')return {ok:true};if(job?.status!=='failed')return {ok:false,error:'This job is not eligible for recovery'};
 const now=Math.floor(Date.now()/1000),heartbeat=this.ctx.storage.sql.exec<{heartbeat:number}>('SELECT heartbeat FROM cre_runner WHERE id=1').toArray()[0]?.heartbeat||0;if(now-heartbeat>20)return {ok:false,error:'The CRE runner is offline. Reservation retained.'};
 const active=this.ctx.storage.sql.exec<{n:number}>("SELECT COUNT(*) n FROM cre_jobs WHERE status IN ('queued','running') AND updated>?",now-180).one().n;if(active>=3)return {ok:false,error:'Executor queue is full. Reservation retained.'};
 const count=this.ctx.storage.sql.exec<{n:number}>('SELECT n FROM work_retries WHERE id=?',w.active).toArray()[0]?.n||0;if(count>=3)return {ok:false,error:'Recovery limit reached. Operator investigation required.'};
 this.ctx.storage.sql.exec('INSERT INTO work_retries VALUES(?,1) ON CONFLICT(id) DO UPDATE SET n=n+1',w.active);this.ctx.storage.sql.exec("UPDATE cre_jobs SET status='queued',updated=?,result=NULL WHERE id=?",now,w.active);this.ctx.storage.sql.exec('UPDATE work_attempts SET result=NULL WHERE id=?',w.active);this.ctx.storage.sql.exec("UPDATE workspaces SET status='reserved' WHERE id=?",w.id);return {ok:true};
 });}

 workOpen():{ok:boolean;access?:string;error?:string}{this.workInit();if(this.ctx.storage.sql.exec<{n:number}>('SELECT COUNT(*) n FROM workspaces').one().n>=2000)return {ok:false,error:'Demo workspace capacity reached'};const access=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');this.ctx.storage.sql.exec('INSERT INTO workspaces VALUES(?,?,?,NULL,?)',crypto.randomUUID(),access,'ready',Math.floor(Date.now()/1000));return {ok:true,access};}
 workView(access:string):WorkView{this.workInit();const w=this.ctx.storage.sql.exec<{id:string,status:string,active:string|null}>('SELECT id,status,active FROM workspaces WHERE access=?',access).toArray()[0];if(!w)return {ok:false,error:'Workspace not found'};const attempts=this.ctx.storage.sql.exec<{id:string,scenario:string,result:string|null}>('SELECT id,scenario,result FROM work_attempts WHERE workspace=? ORDER BY rowid',w.id).toArray().map(a=>({id:a.id,scenario:a.scenario,recoveries:this.ctx.storage.sql.exec<{n:number}>('SELECT n FROM work_retries WHERE id=?',a.id).toArray()[0]?.n||0,...(a.result?JSON.parse(a.result):{status:this.ctx.storage.sql.exec<{status:string}>('SELECT status FROM cre_jobs WHERE id=?',a.id).toArray()[0]?.status||'uncertain'})}));if(w.status==='reserved'&&attempts.at(-1)?.status==='failed')w.status='uncertain';const reserved=['reserved','uncertain'].includes(w.status)?2400000000n:0n,paid=w.status==='paid'?2400000000n:0n;return {ok:true,status:w.status,terms:workTerms,budget:{total:workTerms.budget,reserved:reserved.toString(),paid:paid.toString(),available:(BigInt(workTerms.budget)-reserved-paid).toString()},attempts};}
 workRun(access:string,scenario:string,retry:string):{ok:boolean;capture?:AgentCapture;error?:string}{
 this.workInit();return this.ctx.storage.transactionSync(()=>{
  const w=this.ctx.storage.sql.exec<{id:string,status:string,active:string|null}>('SELECT id,status,active FROM workspaces WHERE access=?',access).toArray()[0];if(!w)return {ok:false,error:'Workspace not found'};
  if(!['earlier','accepted'].includes(scenario)||!/^[-a-zA-Z0-9]{16,80}$/.test(retry))return {ok:false,error:'Invalid work review'};
  const previous=this.ctx.storage.sql.exec<{id:string,scenario:string}>('SELECT id,scenario FROM work_attempts WHERE workspace=? AND retry=?',w.id,retry).toArray()[0];
  if(previous){if(previous.scenario!==scenario)return {ok:false,error:'Retry key already used for different evidence'};const old=this.ctx.storage.sql.exec<{capture:string,access:string}>('SELECT capture,access FROM cre_jobs WHERE id=?',previous.id).toArray()[0];return old?{ok:true,capture:{...JSON.parse(old.capture),creAccess:old.access}}:{ok:false,error:'Saved run is no longer available; inspect history'};}
  if(w.status==='paid')return {ok:false,error:'This work order is already paid. A new request cannot pay it again.'};
  if(w.active)return {ok:false,error:'This work order has a pending reservation. Check its history before retrying.'};
  if(this.ctx.storage.sql.exec<{n:number}>('SELECT COUNT(*) n FROM work_attempts WHERE workspace=?',w.id).one().n>=10)return {ok:false,error:'Work order review limit reached'};
  const now=Math.floor(Date.now()/1000),runId=crypto.randomUUID(),work={workspace:w.id,identity:workIdentity(w.id),evidenceRun:scenario==='earlier'?workTerms.earlierRun:workTerms.acceptedRun,termsRevision:workTerms.revision};
  const data=agentResult({invoiceRef:'NS-101',recipient:workTerms.recipient,amount:workTerms.amount},now,runId);data.bundle.request.id=workRequestId(runId,work);data.commitment=paymentCommitment(data.bundle.request);
  const capture=this.saveCapture({ok:true,runId,createdAt:now,source:'operator-corrected',scenario:'clean',synthetic:true,creExecution:false,settlement:false,...data,work});
  const queued=this.enqueueJob(runId,capture.creAccess!);if(!queued.ok)throw Error(queued.error);
  this.ctx.storage.sql.exec('INSERT INTO work_attempts VALUES(?,?,?,?,NULL)',runId,w.id,retry,scenario);this.ctx.storage.sql.exec("UPDATE workspaces SET status='reserved',active=? WHERE id=?",runId,w.id);return {ok:true,capture};
 });}

 private load(): LedgerState { return JSON.parse(this.ctx.storage.sql.exec<{state:string}>('SELECT state FROM ledger WHERE id=1').one().state); }
 private save(state: LedgerState) { this.ctx.storage.sql.exec('UPDATE ledger SET state=? WHERE id=1',JSON.stringify(state)); }
 view() { return ledgerView(this.load()); }
 snapshot() {
  const state=this.load();
  if(!state.snapshot || state.snapshot.revision!==state.revision) return {error:'Reserve a new run after the latest ledger change'};
  const now=Math.floor(Date.now()/1000);
  if(state.snapshot.batch.entries.some(e=>e.bundle.request.expiresAt<=now))return {error:'Snapshot payment window expired; reserve a new run'};
  return {...state.snapshot.batch,snapshotAt:now};
 }
 async runAgent(scenario: 'clean'|'malicious', compromised: boolean):Promise<AgentCapture|{ok:false;error:string}> {
  const runId=crypto.randomUUID(), now=Math.floor(Date.now()/1000);
  if(compromised) return this.saveCapture({ok:true,runId,createdAt:now,source:'injected-proposal',scenario,synthetic:true,creExecution:false,settlement:false,...agentResult({invoiceRef:'NS-101',recipient:'0x4444444444444444444444444444444444444444',amount:'2400.00'},now,runId)});
  // One global object serializes quota claims before any external inference.
  const allowed=this.ctx.storage.transactionSync(()=>{
   this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS ai_quota (day TEXT PRIMARY KEY, count INTEGER NOT NULL, last INTEGER NOT NULL)');
   const day=new Date().toISOString().slice(0,10);
   const rows=this.ctx.storage.sql.exec<{count:number,last:number}>('SELECT count,last FROM ai_quota WHERE day=?',day).toArray();
   if(rows.length && (rows[0].count>=50 || now-rows[0].last<5))return false;
   this.ctx.storage.sql.exec('INSERT INTO ai_quota(day,count,last) VALUES(?,1,?) ON CONFLICT(day) DO UPDATE SET count=count+1,last=excluded.last',day,now);
   return true;
  });
  if(!allowed)return {ok:false,error:'Live inference is limited to 50 runs per day and one every five seconds across this public demo. Try the injected-proposal test.'};
  try {
   // Wrangler is pinned for this ARM64 host; its generated model catalog predates the fast variant.
   const output=await (this.env.AI as unknown as {run(model:string,input:{messages:{role:string,content:string}[],max_tokens:number,temperature:number}):Promise<unknown>}).run(model,{messages:[{role:'system',content:systemPrompt},{role:'user',content:invoiceText[scenario]}],max_tokens:180,temperature:0});
   const raw=modelResponseText(output);
   const proposal=parseProposal(raw);
   return this.saveCapture({ok:true,runId,createdAt:now,source:'live-model',model,scenario,synthetic:true,creExecution:false,settlement:false,raw,...agentResult(proposal,now,runId)});
  }catch{return {ok:false,error:'The model was unavailable or did not return a valid payment proposal. The gate remains closed; no payment was authorized.'};}
 }
 async act(action: string, input: Record<string,unknown>) {
  try {
   // External RPC must finish before entering the synchronous storage transaction.
   const payment=action==='reconcile'?await verifySepoliaPayment(String(input.txHash||'')):undefined;
   return this.ctx.storage.transactionSync(()=>{
    const state=this.load();
    if(action==='import'){return {ok:true,rows:importInvoices(String(input.csv||''))};}
    if(action==='reserve'){
     if(input.mode==='review')return {ok:true,review:review(state,input.rows,Math.floor(Date.now()/1000))};
     if(input.requestKey!==undefined && (typeof input.requestKey!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(input.requestKey)))throw new Error('Invalid request key');
     if(input.expectedRevision!==undefined && (!Number.isSafeInteger(input.expectedRevision)||Number(input.expectedRevision)<0))throw new Error('Invalid revision');
     const result=reserve(state,input.rows,Math.floor(Date.now()/1000),typeof input.requestKey==='string'?input.requestKey:crypto.randomUUID(),typeof input.expectedRevision==='number'?input.expectedRevision:undefined);this.save(result.state);
     return {ok:true,ledger:ledgerView(result.state),result:result.result};
    }
    const next=action==='release'?releasePreview(state,String(input.run||'')):action==='seed'?seedSepolia(state,Math.floor(Date.now()/1000)):action==='reconcile'&&payment?reconcile(state,payment):null;
    if(!next)throw new Error('Unknown action');this.save(next);return {ok:true,ledger:ledgerView(next)};
   });
  } catch(error) {
   // Avoid serializing input-bearing schema/RPC exceptions into public errors.
   const safe=['Ledger changed since review; review this draft again','Request key already used for different invoices','Import 1–20 invoice rows','Only unpaid preview reservations can be released','Load the Sepolia example into an empty workspace','Payment is not finalized yet; retry later','Confirmed payment does not match a reserved invoice','Invoice already reconciled from another transaction','Expected one payment event from the configured Sepolia treasury','Demo workspace limit reached; start a new workspace'];
   const message=error instanceof Error?error.message:'';
   return {ok:false,error:safe.includes(message)||/^Row \d+:|^CSV columns|^CSV must|^Unclosed CSV|^Unexpected .*CSV|^Remove blank CSV/.test(message)?message:'Invalid request or chain verification unavailable; no ledger changes were saved'};
  }
 }
}
