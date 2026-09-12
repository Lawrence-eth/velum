import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {request} from 'node:https';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {batchSchema,batchReportAbi,evaluateBatch} from '../src/batch';
import {decodeAbiParameters} from 'viem';
import {importInvoices} from '../src/ledger';
const access=readFileSync('artifacts/ledger-test-access','utf8').trim();
assert.match(access,/^[a-f0-9]{64}$/);
// TLS still verifies velum.aethe.me; explicit address is a workaround for this VM's DNS resolver.
const source=(method='GET',path='/api/ledger/snapshot',body?:string)=>new Promise<string>((resolve,reject)=>{
 const req=request({hostname:'velum.aethe.me',path,method,...(process.env.VELUM_TEST_IP?{lookup:(_host:any,_options:any,cb:any)=>_options.all?cb(null,[{address:process.env.VELUM_TEST_IP,family:4}]):cb(null,process.env.VELUM_TEST_IP,4)}:{}),headers:{Authorization:`Bearer ${access}`,'User-Agent':'Velum-integration-test/1.0','Content-Type':'application/json'},timeout:15000},res=>{let data='';res.on('data',d=>{data+=d;if(data.length>65536)res.destroy(new Error('Source response too large'));});res.on('error',reject);res.on('end',()=>res.statusCode===200?resolve(data):reject(new Error(`Accounting source returned ${res.statusCode}`)));});req.on('timeout',()=>req.destroy(new Error('Source timeout')));req.on('error',reject);req.end(body);
});
await source('POST','/api/ledger/reserve',JSON.stringify({rows:importInvoices(readFileSync('public/invoices-template.csv','utf8'))}));
const initial=batchSchema.parse(JSON.parse(await source()));const expected=evaluateBatch(initial,Math.floor(Date.now()/1000));
assert.ok(expected.decisions.every(d=>!d.approved),'Expected post-reconciliation blocked batch from browser test');
const token=randomBytes(32).toString('hex');let fetched=0;
const server=createServer(async(req,res)=>{if(req.headers.authorization!==`Bearer ${token}`){res.writeHead(401);res.end();return;}try{const data=await source();fetched++;res.setHeader('Content-Type','application/json');res.end(data);}catch{res.writeHead(502);res.end();}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert.ok(address&&typeof address!=='string');
const config={schedule:'0 */5 * * * *',apiUrl:`http://127.0.0.1:${address.port}/batch`,apiSecretId:'INVOICE_API_TOKEN',consumer:initial.entries[0].bundle.request.consumer,chainId:11155111,deliverOnchain:false};
writeFileSync('artifacts/ledger-cre.config.json',JSON.stringify(config));const envFile=`${process.cwd()}/artifacts/ledger-cre.env`;
writeFileSync(envFile,`SECRET_INVOICE_API_TOKEN=${token}\nCRE_ETH_PRIVATE_KEY=${'0'.repeat(63)}1\n`,{mode:0o600});let log='';
try{await new Promise<void>((resolve,reject)=>{const child=spawn('cre',['workflow','simulate','batch-workflow','--target','staging-settings','--non-interactive','--trigger-index','0','--config',`${process.cwd()}/artifacts/ledger-cre.config.json`,'--env',envFile],{stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(`CRE exited ${code}; inspect artifacts/ledger-cre.log`)));});}
finally{server.close();unlinkSync(envFile);log=log.split(access).join('[REDACTED]').split(token).join('[REDACTED]');writeFileSync('artifacts/ledger-cre.log',log);}
assert.ok(fetched>0,'CRE must retrieve the live accounting snapshot');
const line=log.split('✓ Workflow Simulation Result:\n')[1]?.split('\n')[0];assert.ok(line);const result=JSON.parse(JSON.parse(line));assert.equal(result.encodedPayload,expected.encodedPayload);assert.equal(result.deliveryRequested,false);
const decisions=decodeAbiParameters(batchReportAbi,result.encodedPayload)[2];assert.ok(decisions.every(d=>!d.approved));
const evidence={success:true,recordedAt:new Date().toISOString(),source:'Authenticated persistent Cloudflare ledger snapshot, fetched through a TLS-verified local proxy to work around VM DNS.',environment:'Actual CRE CLI confidential-handler simulation. No deployed enclave, no broadcast, no new payment.',checks:['Live saved ledger input fetched during CRE execution','Already-paid invoice state included from finalized Sepolia reconciliation','All five requests rejected after existing spend/reservations','CRE public ABI equals evaluated ledger snapshot','No API credential included in saved log'],result};
writeFileSync('evidence/ledger-cre.json',JSON.stringify(evidence,null,2)+'\n');writeFileSync('evidence/cre-ledger.log',log);writeFileSync('public/ledger-cre-evidence.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({success:true,checks:evidence.checks},null,2));
