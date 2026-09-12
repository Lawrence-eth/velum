import { agentBatch, proposalSchema } from '../src/agent';
import { evaluateBatch } from '../src/batch';
import { unlinkSync } from 'node:fs';
import { VM } from '@ethereumjs/vm';
import { Common, Hardfork } from '@ethereumjs/common';
import { Address, Account } from '@ethereumjs/util';
import { Block } from '@ethereumjs/block';
import solc from 'solc';
import { encodeDeployData, encodeFunctionData, decodeFunctionResult, encodePacked, keccak256, toHex, hexToBytes, bytesToHex, decodeAbiParameters, encodeAbiParameters, type Hex } from 'viem';
import { batchManifest, batchReportAbi } from '../src/batch';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';

const sources = Object.fromEntries(['BatchTreasury.sol','TestToken.sol'].map(n => [n, { content: readFileSync(`contracts/${n}`, 'utf8') }]));
const compiled = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources, settings: { evmVersion: 'shanghai', optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi','evm.bytecode'] } } } })));
assert.equal((compiled.errors || []).filter((e: any) => e.severity === 'error').length, 0, JSON.stringify(compiled.errors));
const runs: unknown[]=[]; let combinedLog='';
for(const scenario of ['clean','malicious','injected']) {
const capture=JSON.parse(readFileSync(`artifacts/agent-${scenario}.json`,'utf8'));
assert.ok(capture.ok,`Missing successful ${scenario} inference capture`);
const common = Common.custom({ chainId: 11155111 }, { hardfork: Hardfork.Shanghai });
const vm = await VM.create({ common });
const owner = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const forwarder = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
const attacker = '0xcccccccccccccccccccccccccccccccccccccccc' as const;
await vm.stateManager.putAccount(Address.fromString(owner), Account.fromAccountData({ balance: 10n ** 20n }));
const now = Math.floor(Date.now() / 1000);
let timestamp = now;
const block = () => Block.fromBlockData({ header: { timestamp: BigInt(timestamp), gasLimit: 30000000n } }, { common });
const workflowId = keccak256(toHex('velum-batch-local-test-identity'));
const metadata = encodePacked(['bytes32','bytes10','address','bytes2'], [workflowId,'0x00000000000000000000',owner,'0x0000']);
async function deploy(name: string, args: unknown[]) {
  const c = compiled.contracts[`${name}.sol`][name];
  const result = await vm.evm.runCall({ caller: Address.fromString(owner), data: hexToBytes(encodeDeployData({ abi: c.abi, bytecode: `0x${c.evm.bytecode.object}`, args })), gasLimit: 10000000n, block: block() });
  assert.equal(result.execResult.exceptionError, undefined);
  return { address: result.createdAddress!.toString() as Hex, abi: c.abi };
}
const treasury = await deploy('BatchTreasury', [owner, forwarder, workflowId]);
const token = await deploy('TestToken', []);
type Contract = typeof treasury;
async function call(c: Contract, fn: string, args: unknown[] = [], sender: string = owner) {
  const r = await vm.evm.runCall({ caller: Address.fromString(sender), to: Address.fromString(c.address), data: hexToBytes(encodeFunctionData({ abi: c.abi, functionName: fn, args })), gasLimit: 10000000n, block: block() });
  return { success: !r.execResult.exceptionError, output: r.execResult.returnValue, gas: r.execResult.executionGasUsed.toString(), logs: r.execResult.logs || [] };
}
async function read(c: Contract, fn: string, args: unknown[] = []) {
  const r = await call(c, fn, args); assert.ok(r.success);
  return decodeFunctionResult({ abi: c.abi, functionName: fn, data: bytesToHex(r.output) });
}
const checks: string[] = [];
async function pass(name: string, c: Contract, fn: string, args: unknown[] = [], sender: string = owner) {
  const r = await call(c,fn,args,sender); assert.ok(r.success,name); checks.push(name); return r;
}
async function reject(name: string, c: Contract, fn: string, args: unknown[] = [], sender: string = owner) {
  const r = await call(c,fn,args,sender); assert.ok(!r.success,name); checks.push(name);
}

const proposal=proposalSchema.parse(capture.proposal);
const batch=agentBatch(proposal,now,`${capture.runId}:e2e`);
const bundle=batch.entries[0].bundle;
bundle.request.consumer=treasury.address;bundle.request.token=token.address;bundle.policy.token=token.address;
const expected=evaluateBatch(batch,now);
const payment={id:bundle.request.id,recipient:bundle.request.recipient,token:token.address,amount:BigInt(bundle.request.amount),expiresAt:BigInt(bundle.request.expiresAt)};
await pass('fund treasury',token,'mint',[treasury.address,10000000000n]);
await pass('register exact proposal',treasury,'openBatch',[batch.batchId,[payment]]);
await reject('agent cannot settle before report',treasury,'settle',[payment.id]);
const secret=randomBytes(32).toString('hex');let fetched=0;
const server=createServer((req,res)=>{if(req.url!=='/batch'||req.headers.authorization!==`Bearer ${secret}`){res.writeHead(401);res.end();return;}fetched++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(batch));});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();assert.ok(address&&typeof address!=='string');
const configPath=`${process.cwd()}/artifacts/agent-e2e.config.json`,envPath=`${process.cwd()}/artifacts/agent-e2e.env`;
writeFileSync(configPath,JSON.stringify({schedule:'0 */5 * * * *',apiUrl:`http://127.0.0.1:${address.port}/batch`,apiSecretId:'INVOICE_API_TOKEN',consumer:treasury.address,chainId:11155111}));
writeFileSync(envPath,`SECRET_INVOICE_API_TOKEN=${secret}\nCRE_ETH_PRIVATE_KEY=${'0'.repeat(63)}1\n`,{mode:0o600});
let log='';
try {await new Promise<void>((resolve,reject)=>{const child=spawn('cre',['workflow','simulate','batch-workflow','--target','staging-settings','--non-interactive','--trigger-index','0','--config',configPath,'--env',envPath],{env:process.env,stdio:['ignore','pipe','pipe']});const timer=setTimeout(()=>child.kill('SIGTERM'),120000);child.stdout.on('data',d=>log+=d.toString());child.stderr.on('data',d=>log+=d.toString());child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Error(log.slice(-3000)))});});}
finally{server.close();unlinkSync(envPath);}
assert.ok(fetched>0);assert.ok(!log.includes(secret));
const line=log.split('✓ Workflow Simulation Result:\n')[1]?.split('\n')[0];assert.ok(line,'CRE result missing');
const report=JSON.parse(JSON.parse(line));assert.ok(report.reportGenerated&&!report.deliveryRequested);assert.equal(report.encodedPayload,expected.encodedPayload);
const approved=expected.decisions[0].approved;
await pass('actual CRE report accepted with local mock identity',treasury,'onReport',[metadata,report.encodedPayload],forwarder);
await reject('report replay blocked',treasury,'onReport',[metadata,report.encodedPayload],forwarder);
if(approved)await pass('approved proposal settles',treasury,'settle',[payment.id]);
else await reject('denied proposal cannot settle',treasury,'settle',[payment.id]);
const balance=await read(token,'balanceOf',[treasury.address]) as bigint;
assert.equal(balance,approved?7600000000n:10000000000n);
assert.equal(await read(token,'balanceOf',[payment.recipient]),approved?2400000000n:0n);
await pass('close completed run',treasury,'closeBatch');
combinedLog+=`\n=== ${scenario}: ${capture.source} ===\n${log}`;
runs.push({label:scenario==='clean'?'Clean invoice':scenario==='malicious'?'Malicious invoice':'Compromised proposal',source:capture.source,model:capture.model||null,capturedAt:capture.createdAt,raw:capture.raw||null,proposal,approved,settled:approved,treasuryBalanceBefore:'10000000000',treasuryBalanceAfter:balance.toString(),batch,encodedPayload:report.encodedPayload,checks});
console.log(`${scenario}: ${capture.source}, CRE approved=${approved}, treasury balance=${balance}, ${checks.length} checks passed`);
}
const evidence={generatedAt:new Date().toISOString(),mode:'live-model-capture + real CRE CLI simulation + local EVM',chainId:11155111,teeAttestation:false,donSignatures:false,onchainBroadcast:false,independentScenarios:true,runs};
writeFileSync('public/agent-evidence.json',JSON.stringify(evidence,null,2)+'\n');
writeFileSync('evidence/agent.json',JSON.stringify(evidence,null,2)+'\n');
writeFileSync('evidence/cre-agent.log',combinedLog);writeFileSync('public/logs/cre-agent.log',combinedLog);
