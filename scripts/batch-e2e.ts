import { VM } from '@ethereumjs/vm';
import { Common, Hardfork } from '@ethereumjs/common';
import { Address, Account } from '@ethereumjs/util';
import { Block } from '@ethereumjs/block';
import solc from 'solc';
import { encodeDeployData, encodeFunctionData, decodeFunctionResult, encodePacked, keccak256, toHex, hexToBytes, bytesToHex, decodeAbiParameters, encodeAbiParameters, type Hex } from 'viem';
import { batchFixture, batchManifest, batchReportAbi } from '../src/batch';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';

const sources = Object.fromEntries(['BatchTreasury.sol','TestToken.sol'].map(n => [n, { content: readFileSync(`contracts/${n}`, 'utf8') }]));
const compiled = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources, settings: { evmVersion: 'shanghai', optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi','evm.bytecode'] } } } })));
assert.equal((compiled.errors || []).filter((e: any) => e.severity === 'error').length, 0, JSON.stringify(compiled.errors));
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
const batch = batchFixture(now, 6000, treasury.address, token.address);
const payments = batch.entries.map(e => ({ id: e.bundle.request.id, recipient: e.bundle.request.recipient, token: e.bundle.request.token, amount: BigInt(e.bundle.request.amount), expiresAt: BigInt(e.bundle.request.expiresAt) }));
await pass('fund test treasury',token,'mint',[treasury.address,20000000000n]);
await reject('outsider cannot open batch',treasury,'openBatch',[batch.batchId,payments],attacker);
await pass('register exact ordered payment manifest',treasury,'openBatch',[batch.batchId,payments]);
assert.equal(await read(treasury,'activeManifest'),batchManifest(batch)); checks.push('TypeScript and Solidity commitments match');
await reject('concurrent active batch rejected',treasury,'openBatch',[keccak256(toHex('another')),payments]);
await reject('payment before report rejected',treasury,'settle',[payments[0].id]);

mkdirSync('artifacts', { recursive: true }); mkdirSync('public/logs', { recursive: true });
const syntheticToken = randomBytes(32).toString('hex');
const server = createServer((req,res) => {
  if (req.url !== '/batch' || req.headers.authorization !== `Bearer ${syntheticToken}`) { res.writeHead(401); res.end(); return; }
  res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(batch));
});
await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
const address = server.address(); assert.ok(address && typeof address !== 'string');
const config = { schedule: '0 */5 * * * *', apiUrl: `http://127.0.0.1:${address.port}/batch`, apiSecretId: 'INVOICE_API_TOKEN', consumer: treasury.address, chainId: 11155111 };
writeFileSync('artifacts/batch-e2e.config.json', JSON.stringify(config));
writeFileSync('artifacts/batch-e2e.env', `SECRET_INVOICE_API_TOKEN=${syntheticToken}\nCRE_ETH_PRIVATE_KEY=${'0'.repeat(63)}1\n`, { mode: 0o600 });
let log = '';
try {
  await new Promise<void>((resolve,reject) => {
    const child = spawn('cre',['workflow','simulate','batch-workflow','--target','staging-settings','--non-interactive','--trigger-index','0','--config',`${process.cwd()}/artifacts/batch-e2e.config.json`,'--env',`${process.cwd()}/artifacts/batch-e2e.env`], { env: process.env, stdio: ['ignore','pipe','pipe'] });
    child.stdout.on('data',d => { log += d.toString(); }); child.stderr.on('data',d => { log += d.toString(); });
    child.on('error',reject); child.on('close',code => code === 0 ? resolve() : reject(new Error(`CRE simulation failed (${code}): ${log.slice(-3500)}`)));
  });
} finally { server.close(); }
assert.ok(!log.includes(syntheticToken));
writeFileSync('evidence/cre-batch.log',log); copyFileSync('evidence/cre-batch.log','public/logs/cre-batch.log');
const line = log.split('✓ Workflow Simulation Result:\n')[1]?.split('\n')[0]; assert.ok(line,'Missing CRE result');
const result = JSON.parse(JSON.parse(line));
assert.ok(result.reportGenerated && !result.deliveryRequested); checks.push('actual CRE TEE-handler simulation produced ABI report');
const report = result.encodedPayload as Hex;
const [batchId, manifest, decisions] = decodeAbiParameters(batchReportAbi,report);
assert.equal(batchId,batch.batchId); assert.equal(manifest,batchManifest(batch));
assert.deepEqual(decisions.map(d => d.approved),[true,false,false,false,true]);
checks.push('actual report approves only first and fifth invoice');
await reject('forged forwarder rejected',treasury,'onReport',[metadata,report],attacker);
const badMetadata = encodePacked(['bytes32','bytes10','address'],[keccak256(toHex('bad')),'0x00000000000000000000',owner]);
await reject('wrong workflow identity rejected',treasury,'onReport',[badMetadata,report],forwarder);
const reordered = encodeAbiParameters(batchReportAbi,[batchId,manifest,[...decisions].reverse()]);
await reject('reordered decisions rejected',treasury,'onReport',[metadata,reordered],forwarder);
const omitted = encodeAbiParameters(batchReportAbi,[batchId,manifest,decisions.slice(1)]);
await reject('omitted decisions rejected',treasury,'onReport',[metadata,omitted],forwarder);
const tampered = encodeAbiParameters(batchReportAbi,[batchId,manifest,decisions.map((d,i) => i === 0 ? {...d,commitment:keccak256(toHex('altered-payment'))} : d)]);
await reject('tampered payment commitment rejected',treasury,'onReport',[metadata,tampered],forwarder);
await pass('actual CRE report accepted by local mock-forwarder adapter',treasury,'onReport',[metadata,report],forwarder);
await reject('report replay rejected',treasury,'onReport',[metadata,report],forwarder);
await reject('outsider cannot settle',treasury,'settle',[payments[0].id],attacker);
await reject('rejected invoice cannot settle',treasury,'settle',[payments[1].id]);
await reject('cannot close with outstanding authorizations',treasury,'closeBatch');
await pass('test token configured to fail transfers',token,'setFailTransfers',[true]);
await reject('failed token transfer reverts settlement',treasury,'settle',[payments[0].id]);
assert.equal(await read(treasury,'status',[payments[0].id]),2); assert.equal(await read(treasury,'unsettled'),2n); checks.push('failed transfer preserved approval and outstanding counter');
await pass('test token transfers restored',token,'setFailTransfers',[false]);
const before = await read(token,'balanceOf',[treasury.address]) as bigint;
const settlement = [];
for (const index of [0,4]) {
  const p=payments[index], oldBalance=await read(token,'balanceOf',[p.recipient]) as bigint;
  const r=await pass(`settle authorized payment ${index+1}`,treasury,'settle',[p.id]);
  const newBalance=await read(token,'balanceOf',[p.recipient]) as bigint;
  assert.equal(newBalance-oldBalance,p.amount);
  settlement.push({requestId:p.id,recipient:p.recipient,amount:p.amount.toString(),balanceBefore:oldBalance.toString(),balanceAfter:newBalance.toString(),gasUsed:r.gas,status:'paid'});
}
await reject('payment replay rejected',treasury,'settle',[payments[0].id]);
const after=await read(token,'balanceOf',[treasury.address]) as bigint;
assert.equal(before-after,5800000000n);checks.push('treasury debited exactly 5800 synthetic USD');
for (const index of [1,2,3]) assert.equal(await read(treasury,'status',[payments[index].id]),3);
await pass('close settled batch',treasury,'closeBatch');
await reject('batch identifier cannot be reused',treasury,'openBatch',[batch.batchId,payments]);

// A new batch can be revoked before execution; revoked reports cannot revive it.
const next=batchFixture(now+1,6000,treasury.address,token.address);
const nextPayments=payments.map((p,i)=>({...p,id:keccak256(toHex(`next-${i}`))}));
await pass('new unique batch can open after close',treasury,'openBatch',[next.batchId,nextPayments]);
await reject('outsider cannot cancel',treasury,'cancelBatch',[],attacker);
await pass('owner can revoke pending batch',treasury,'cancelBatch');
await reject('revoked request cannot settle',treasury,'settle',[nextPayments[0].id]);
await reject('old report cannot revive revoked batch',treasury,'onReport',[metadata,report],forwarder);
const document = {
  version:2, recordedAt:new Date().toISOString(), success:true,
  environment:'Actual CRE CLI simulation followed by local EthereumJS EVM; mock forwarder caller, no Chainlink signature verification, no network transaction, no real assets.',
  source:'scripts/batch-e2e.ts', binaryHash:log.match(/Binary hash: ([a-f0-9]+)/)?.[1],
  report:{batchId,manifest,encodedPayload:report,sha256:createHash('sha256').update(hexToBytes(report)).digest('hex'),decisions:decisions.map(d=>({...d,expiresAt:d.expiresAt.toString()}))},
  contracts:{treasury:treasury.address,token:token.address,workflowId,compiler:solc.version()},
  accounting:{treasuryBefore:before.toString(),treasuryAfter:after.toString(),paid:'5800000000',unit:'synthetic USD, 6 decimals'},
  settlements:settlement,checks,
};
writeFileSync('public/settlement-evidence.json',JSON.stringify(document,null,2)+'\n');
writeFileSync('evidence/batch-e2e.json',JSON.stringify(document,null,2)+'\n');
console.log(JSON.stringify({success:true,checks:checks.length,paid:'5800 synthetic USD',reportSha256:document.report.sha256,environment:document.environment},null,2));
