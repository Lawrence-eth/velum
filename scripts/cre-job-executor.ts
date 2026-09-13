import {loadJournal,saveJournal} from './work-journal';
import {workBindingSchema,bindWorkBatch,workReasons,workEvidenceSchema,workTerms,workRequestId,type WorkBinding} from '../src/work-order';
import {execFileSync} from 'node:child_process';
import {VM} from '@ethereumjs/vm';
import {Common,Hardfork} from '@ethereumjs/common';
import {Address} from '@ethereumjs/util';
import {Block} from '@ethereumjs/block';
import {encodeDeployData,encodeFunctionData,decodeFunctionResult,encodePacked,keccak256,toHex,hexToBytes,bytesToHex,type Hex} from 'viem';
import {agentBatch,proposalSchema} from '../src/agent';
import {evaluateBatch} from '../src/batch';
import {checkJobResult} from '../src/cre-jobs';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const artifacts=JSON.parse(readFileSync('public/lab-contracts.json','utf8'));
for(const [name,hash] of Object.entries(artifacts.sourceSha256))assert.equal(createHash('sha256').update(readFileSync('contracts/'+name)).digest('hex'),hash,'Compiled contract source changed');
export async function executeJob(job:{id:string,capture:{runId:string,proposal:unknown;work?:WorkBinding}}){
 const work=job.capture.work?workBindingSchema.parse(job.capture.work):undefined;const journal=work?loadJournal(work.workspace):undefined;const cached=journal?.entries.find(e=>e.id===job.id);if(cached){checkJobResult(cached.result,job.capture.proposal);assert.equal(cached.result.requestId,workRequestId(job.capture.runId,work!));return cached.result;}if(journal?.entries.some(e=>e.result.settlementAccepted))throw Error('Work order already paid in the execution journal');
 const proposal=proposalSchema.parse(job.capture.proposal),now=Math.floor(Date.now()/1000),common=Common.custom({chainId:11155111},{hardfork:Hardfork.Shanghai});
 const vm=await VM.create({common}),owner=Address.fromString('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),forwarder=Address.fromString('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
 let block=Block.fromBlockData({header:{timestamp:BigInt(now),gasLimit:30000000n}},{common});
 async function deploy(name:string,args:unknown[]){const c=artifacts.contracts[name];const r=await vm.evm.runCall({caller:owner,data:hexToBytes(encodeDeployData({...c,args})),gasLimit:10000000n,block});assert.ok(!r.execResult.exceptionError);return {address:r.createdAddress!,abi:c.abi};}
 const workflowId=keccak256(toHex('velum-live-cli-job')),treasury=await deploy('BatchTreasury',[owner.toString(),forwarder.toString(),workflowId]),token=await deploy('TestToken',[]);
 async function call(c:any,fn:string,args:unknown[]=[],sender=owner){const r=await vm.evm.runCall({caller:sender,to:c.address,data:hexToBytes(encodeFunctionData({abi:c.abi,functionName:fn,args})),gasLimit:10000000n,block});return {success:!r.execResult.exceptionError,data:bytesToHex(r.execResult.returnValue),gas:r.execResult.executionGasUsed.toString()};}
 async function read(c:any,fn:string,args:unknown[]=[]){const r=await call(c,fn,args);assert.ok(r.success);return decodeFunctionResult({abi:c.abi,functionName:fn,data:r.data});}
 let batch=agentBatch(proposal,now,job.capture.runId);if(work)batch=bindWorkBatch(batch,job.capture.runId,work);const bundle=batch.entries[0].bundle;bundle.request.consumer=treasury.address.toString() as Hex;bundle.request.token=token.address.toString() as Hex;bundle.policy.token=token.address.toString() as Hex;
 if(work)bundle.policy.remainingPurchaseOrder=workTerms.budget;
 let expected=evaluateBatch(batch,now);const payment={...bundle.request,amount:BigInt(bundle.request.amount),expiresAt:BigInt(bundle.request.expiresAt)};
 assert.ok((await call(token,'mint',[treasury.address.toString(),20000000000n])).success);
 const metadata=encodePacked(['bytes32','bytes10','address','bytes2'],[workflowId,'0x00000000000000000000',owner.toString() as Hex,'0x0000']);
 for(const entry of journal?.entries||[]){
  assert.deepEqual(entry.result.sourceSha256,artifacts.sourceSha256,'Journal contract version mismatch');
  block=Block.fromBlockData({header:{timestamp:BigInt(entry.now),gasLimit:30000000n}},{common});const r=entry.batch.entries[0].bundle.request;
  assert.ok((await call(treasury,'openBatch',[entry.batch.batchId,[{...r,amount:BigInt(r.amount),expiresAt:BigInt(r.expiresAt)}]])).success);
  assert.ok((await call(treasury,'onReport',[metadata,entry.report],forwarder)).success);
  assert.equal((await call(treasury,'settle',[r.id])).success,entry.result.settlementAccepted);
  assert.equal((await read(token,'balanceOf',[treasury.address.toString()]) as bigint).toString(),entry.result.treasuryAfter);
  assert.ok((await call(treasury,'closeBatch')).success);
 }
 block=Block.fromBlockData({header:{timestamp:BigInt(now),gasLimit:30000000n}},{common});
 assert.ok((await call(treasury,'openBatch',[batch.batchId,[payment]])).success);
 assert.equal((await call(treasury,'settle',[payment.id])).success,false,'Settlement before CRE report must fail');
 const secret=randomBytes(32).toString('hex'),dir=mkdtempSync(join(tmpdir(),'velum-cre-job-'));let reads=0;
 const server=createServer((req,res)=>{if(req.url!=='/batch'||req.headers.authorization!==`Bearer ${secret}`){res.writeHead(401);res.end();return;}reads++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(work?{batch,work,requestRunId:job.capture.runId}:batch));});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');
 const config=join(dir,'config.json'),envFile=join(dir,'job.env');
 writeFileSync(config,JSON.stringify({workOrder:!!work,schedule:'0 */5 * * * *',apiUrl:`http://127.0.0.1:${address.port}/batch`,apiSecretId:'INVOICE_API_TOKEN',consumer:treasury.address.toString(),chainId:11155111}),{mode:0o600});
 const githubToken=work?execFileSync('gh',['auth','token'],{encoding:'utf8'}).trim():'';
 writeFileSync(envFile,`SECRET_INVOICE_API_TOKEN=${secret}\nCRE_ETH_PRIVATE_KEY=${'0'.repeat(63)}1\n${work?`SECRET_GITHUB_TOKEN=${githubToken}\n`:''}`,{mode:0o600});
 let log='';const cliEnv={...process.env};delete cliEnv.CRE_RUNNER_TOKEN;delete cliEnv.CLOUDFLARE_API_TOKEN;
 try{await new Promise<void>((resolve,reject)=>{const child=spawn('/home/ubuntu/.local/bin/cre',['workflow','simulate',work?'work-workflow':'batch-workflow','--target','staging-settings','--non-interactive','--trigger-index','0','--config',config,'--env',envFile],{stdio:['ignore','pipe','pipe'],env:cliEnv});const timer=setTimeout(()=>child.kill('SIGTERM'),100000);const collect=(d:Buffer)=>{log+=d.toString();if(log.length>60000)child.kill('SIGTERM');};child.stdout.on('data',collect);child.stderr.on('data',collect);child.on('error',error=>{clearTimeout(timer);reject(error)});child.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(Error('CRE CLI execution failed: '+log.slice(-3000).split(secret).join('[redacted]').split(githubToken||'__no_token__').join('[redacted]')))});});}finally{server.close();rmSync(dir,{recursive:true,force:true});}
 assert.ok(reads>0,'CLI did not retrieve the source');assert.ok(!log.includes(secret)&&(!githubToken||!log.includes(githubToken)),'Credential appeared in output');
 const line=log.split('✓ Workflow Simulation Result:\n')[1]?.split('\n')[0];assert.ok(line,'Missing CLI result');const report=JSON.parse(JSON.parse(line));assert.ok(report.reportGenerated&&!report.deliveryRequested);const workEvidence=work?workEvidenceSchema.parse(report.workEvidence):undefined;if(work&&workEvidence)expected=evaluateBatch(batch,now,workReasons(work,workEvidence,workEvidence.observedAt));assert.equal(report.encodedPayload,expected.encodedPayload,'Actual report differs from evaluated proposal');
 const delivery=await call(treasury,'onReport',[metadata,report.encodedPayload],forwarder);assert.ok(delivery.success);
 const before=await read(token,'balanceOf',[treasury.address.toString()]) as bigint,settlement=await call(treasury,'settle',[payment.id]),after=await read(token,'balanceOf',[treasury.address.toString()]) as bigint;
 assert.equal(settlement.success,expected.decisions[0].approved);assert.equal(before-after,settlement.success?payment.amount:0n);
 assert.equal((await call(treasury,'onReport',[metadata,report.encodedPayload],forwarder)).success,false,'Report replay allowed');
 const result=checkJobResult({...(workEvidence?{workEvidence}:{}),creExecution:true,proposal,policyApproved:expected.decisions[0].approved,policyReasons:expected.details[0].reasons,deliveryAccepted:true,settlementAccepted:settlement.success,treasuryBefore:before.toString(),treasuryAfter:after.toString(),paid:(before-after).toString(),requestStatus:await read(treasury,'status',[payment.id]),requestId:payment.id,commitment:expected.decisions[0].commitment,encodedPayload:report.encodedPayload,reportBytes:(report.encodedPayload.length-2)/2,deliveryGas:delivery.gas,settlementGas:settlement.gas,compiler:artifacts.compiler,sourceSha256:artifacts.sourceSha256,treasury:treasury.address.toString(),token:token.address.toString(),workflowMode:'CRE CLI confidential-handler simulation',settlementMode:work?'Journal-backed local Solidity with mock forwarder':'VM-local Solidity execution with mock forwarder',creLog:log,executedAt:new Date().toISOString()},proposal);
 if(journal){journal.entries.push({id:job.id,now,batch,report:report.encodedPayload,result,acknowledged:false});saveJournal(journal);}
 return result;
}
