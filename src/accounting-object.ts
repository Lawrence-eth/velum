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
 async runAgent(scenario: 'clean'|'malicious', compromised: boolean) {
  const runId=crypto.randomUUID(), now=Math.floor(Date.now()/1000);
  if(compromised) return {ok:true,runId,createdAt:now,source:'injected-proposal',scenario,synthetic:true,creExecution:false,settlement:false,...agentResult({invoiceRef:'NS-101',recipient:'0x4444444444444444444444444444444444444444',amount:'2400.00'},now,runId)};
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
   return {ok:true,runId,createdAt:now,source:'live-model',model,scenario,synthetic:true,creExecution:false,settlement:false,raw,...agentResult(proposal,now,runId)};
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
