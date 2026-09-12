import {createPublicClient,createWalletClient,http,keccak256,toHex,decodeAbiParameters,formatEther} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {sepolia} from 'viem/chains';
import solc from 'solc';
import {readFileSync,writeFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {batchFixture,batchManifest,evaluateBatch,batchReportAbi} from '../src/batch';

const rpc='https://ethereum-sepolia-rpc.publicnode.com';
const keyFile='/home/ubuntu/.secrets/velum-sepolia.env';
const key=readFileSync(keyFile,'utf8').match(/^CRE_ETH_PRIVATE_KEY=(.+)$/m)?.[1];
assert.ok(key && /^[0-9a-fA-F]{64}$/.test(key),'Dedicated wallet missing');
const account=privateKeyToAccount(`0x${key}`);
const client=createPublicClient({chain:sepolia,transport:http(rpc)});
const wallet=createWalletClient({account,chain:sepolia,transport:http(rpc)});
assert.equal(await client.getChainId(),11155111);
const balance=await client.getBalance({address:account.address});
console.log(`Wallet ${account.address}: ${formatEther(balance)} Sepolia ETH`);
assert.ok(balance>1000000000000000n,'Fund wallet with Sepolia test ETH');
const forwarder='0x15fC6ae953E024d975e77382eEeC56A9101f9F88';
assert.ok(((await client.getCode({address:forwarder}))?.length ?? 0) > 2,'Mock forwarder missing');
const sources=Object.fromEntries(['BatchTreasury','TestToken','SepoliaSimulationAdapter'].map(n=>[`${n}.sol`,{content:readFileSync(`contracts/${n}.sol`,'utf8')} ]));
const compiled=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings:{evmVersion:'shanghai',optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['abi','evm.bytecode']}}}})));
assert.equal((compiled.errors||[]).filter((e:any)=>e.severity==='error').length,0,JSON.stringify(compiled.errors));
mkdirSync('artifacts',{recursive:true});
const transactions:any[]=[];
async function receipt(hash:any,label:string){
 const r=await client.waitForTransactionReceipt({hash,timeout:180000});assert.equal(r.status,'success',label);
 transactions.push({label,hash,blockNumber:r.blockNumber.toString(),gasUsed:r.gasUsed.toString()});
 writeFileSync('artifacts/sepolia-progress.json',JSON.stringify({wallet:account.address,transactions},null,2));
 console.log(`${label}: https://sepolia.etherscan.io/tx/${hash}`);return r;
}
async function deploy(name:string,args:any[]){const c=compiled.contracts[`${name}.sol`][name];const r=await receipt(await wallet.deployContract({abi:c.abi,bytecode:`0x${c.evm.bytecode.object}`,args}),`Deploy ${name}`);assert.ok(r.contractAddress);return {address:r.contractAddress,abi:c.abi};}
async function send(c:any,functionName:string,args:any[]=[]){const {request}=await client.simulateContract({...c,functionName,args,account});return receipt(await wallet.writeContract(request),functionName);}
async function read(c:any,functionName:string,args:any[]=[]){return client.readContract({...c,functionName,args});}
const workflowId=keccak256(toHex('velum-sepolia-simulation-only'));
const adapter=await deploy('SepoliaSimulationAdapter',[account.address,forwarder,workflowId]);
const treasury=await deploy('BatchTreasury',[account.address,adapter.address,workflowId]);
const token=await deploy('TestToken',[]);
await send(token,'mint',[treasury.address,20000000000n]);
const now=Math.floor(Date.now()/1000);
const batch=batchFixture(now,6000,treasury.address,token.address);
const payments=batch.entries.map(e=>({...e.bundle.request,amount:BigInt(e.bundle.request.amount),expiresAt:BigInt(e.bundle.request.expiresAt)}));
const expected=evaluateBatch(batch,now).encodedPayload;
await send(treasury,'openBatch',[batch.batchId,payments]);
assert.equal(await read(treasury,'activeManifest'),batchManifest(batch));
await send(adapter,'authorize',[treasury.address,keccak256(expected)]);
const secret=randomBytes(32).toString('hex');
const server=createServer((req,res)=>{if(req.url!='/batch'||req.headers.authorization!==`Bearer ${secret}`){res.writeHead(401);res.end();return;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({...batch,snapshotAt:Math.floor(Date.now()/1000)}));});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert.ok(address&&typeof address!=='string');
const config={schedule:'0 */5 * * * *',apiUrl:`http://127.0.0.1:${address.port}/batch`,apiSecretId:'INVOICE_API_TOKEN',consumer:treasury.address,reportReceiver:adapter.address,chainId:11155111,deliverOnchain:true};
writeFileSync('artifacts/sepolia.config.json',JSON.stringify(config));
const envFile=`${process.cwd()}/artifacts/sepolia.env`;
writeFileSync(envFile,`CRE_ETH_PRIVATE_KEY=${key}\nSECRET_INVOICE_API_TOKEN=${secret}\n`,{mode:0o600});
let log='';
try{await new Promise<void>((resolve,reject)=>{const child=spawn('cre',['workflow','simulate','batch-workflow','--target','staging-settings','--non-interactive','--trigger-index','0','--broadcast','--config',`${process.cwd()}/artifacts/sepolia.config.json`,'--env',envFile],{stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(`CRE failed ${code}`)));});}
finally{server.close();unlinkSync(envFile);log=log.split(key).join('[REDACTED]').split(secret).join('[REDACTED]');writeFileSync('artifacts/cre-sepolia.log',log);}
const line=log.split('✓ Workflow Simulation Result:\n')[1]?.split('\n')[0];assert.ok(line,'Missing CRE result; inspect sanitized artifacts/cre-sepolia.log');
const result=JSON.parse(JSON.parse(line));assert.equal(result.encodedPayload,expected);assert.ok(result.deliveryRequested&&result.txHash);
await receipt(result.txHash,'CRE report delivery');assert.equal(await read(treasury,'decided'),true);
const before=await read(token,'balanceOf',[treasury.address]) as bigint;
const settlements=[];
for(const i of [0,4]){const p=payments[i];const old=await read(token,'balanceOf',[p.recipient]) as bigint;const r=await send(treasury,'settle',[p.id]);const current=await read(token,'balanceOf',[p.recipient]) as bigint;assert.equal(current-old,p.amount);settlements.push({requestId:p.id,recipient:p.recipient,amount:p.amount.toString(),txHash:r.transactionHash});}
for(const i of [1,2,3])assert.equal(await read(treasury,'status',[payments[i].id]),3);
const after=await read(token,'balanceOf',[treasury.address]) as bigint;assert.equal(before-after,5800000000n);
await send(treasury,'closeBatch');
const evidence={recordedAt:new Date().toISOString(),chainId:11155111,success:true,environment:'Sepolia testnet; actual CRE CLI simulation with broadcast through public mock forwarder. Owner pinned exact report hash. Adapter supplies synthetic workflow metadata. No DON signature verification or deployed TEE attestation. Test tokens only.',wallet:account.address,contracts:{treasury:treasury.address,token:token.address,adapter:adapter.address,mockForwarder:forwarder,workflowId},report:{encodedPayload:expected,hash:keccak256(expected),txHash:result.txHash},accounting:{before:before.toString(),after:after.toString(),paid:'5800000000',decimals:6},settlements,transactions};
writeFileSync('public/sepolia-evidence.json',JSON.stringify(evidence,null,2)+'\n');writeFileSync('evidence/sepolia.json',JSON.stringify(evidence,null,2)+'\n');
console.log('Verified Sepolia settlement: 5800 synthetic USD.');
