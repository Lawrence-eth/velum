import './lab-runtime';
import {VM} from '@ethereumjs/vm';
import {Common,Hardfork} from '@ethereumjs/common';
import {Address} from '@ethereumjs/util';
import {Block} from '@ethereumjs/block';
import {encodeDeployData,encodeFunctionData,decodeFunctionResult,encodePacked,keccak256,toHex,hexToBytes,bytesToHex,encodeAbiParameters,type Hex} from 'viem';
import {batchFixture,evaluateBatch,batchReportAbi} from './batch';

self.onmessage=async(event:MessageEvent)=>{
 try{const result=await run(event.data);self.postMessage({ok:true,result});}catch(error){console.error(error);self.postMessage({ok:false,error:'Local EVM execution failed. Reload the lab and try again.'});}
};
async function run(input:{attack:string;contracts:Record<string,{abi:any;bytecode:Hex}>}){
 const allowed=['valid','recipient','amount','reorder','omit','identity','caller','replay','transfer'];
 if(!allowed.includes(input.attack))throw new Error('Invalid experiment');
 const now=Math.floor(Date.now()/1000),common=Common.custom({chainId:11155111},{hardfork:Hardfork.Shanghai});
 const vm=await VM.create({common});const owner=Address.fromString('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),forwarder=Address.fromString('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
 const block=Block.fromBlockData({header:{timestamp:BigInt(now),gasLimit:30000000n}},{common});
 async function deploy(name:string,args:any[]){const c=input.contracts[name];const r=await vm.evm.runCall({caller:owner,data:hexToBytes(encodeDeployData({...c,args})),gasLimit:10000000n,block});if(r.execResult.exceptionError)throw new Error('Deploy failed');return{address:r.createdAddress!,abi:c.abi};}
 const workflowId=keccak256(toHex('velum-local-lab'));const treasury=await deploy('BatchTreasury',[owner.toString(),forwarder.toString(),workflowId]);const token=await deploy('TestToken',[]);
 async function call(c:any,fn:string,args:any[]=[],sender=owner){const r=await vm.evm.runCall({caller:sender,to:c.address,data:hexToBytes(encodeFunctionData({abi:c.abi,functionName:fn,args})),gasLimit:10000000n,block});return{success:!r.execResult.exceptionError,data:bytesToHex(r.execResult.returnValue),gas:r.execResult.executionGasUsed.toString()};}
 async function read(c:any,fn:string,args:any[]=[]){const r=await call(c,fn,args);return decodeFunctionResult({abi:c.abi,functionName:fn,data:r.data});}
 const batch=batchFixture(now,6000,treasury.address.toString(),token.address.toString() as Hex),evaluation=evaluateBatch(batch,now);
 const payments=batch.entries.map(e=>({...e.bundle.request,amount:BigInt(e.bundle.request.amount),expiresAt:BigInt(e.bundle.request.expiresAt)}));
 await call(token,'mint',[treasury.address.toString(),20000000000n]);await call(treasury,'openBatch',[batch.batchId,payments]);
 let decisions=[...evaluation.decisions];let metadata=encodePacked(['bytes32','bytes10','address','bytes2'],[workflowId,'0x00000000000000000000',owner.toString() as Hex,'0x0000']);let sender=forwarder;
 if(input.attack==='recipient'||input.attack==='amount'){
  const modified=structuredClone(batch);if(input.attack==='recipient')modified.entries[0].bundle.request.recipient='0x4444444444444444444444444444444444444444';else modified.entries[0].bundle.request.amount='4200000001';
  const altered=evaluateBatch(modified,now);decisions[0]={...decisions[0],commitment:altered.decisions[0].commitment};
 }
 if(input.attack==='reorder')decisions.reverse();if(input.attack==='omit')decisions=decisions.slice(1);
 if(input.attack==='identity')metadata=encodePacked(['bytes32','bytes10','address'],[keccak256(toHex('wrong')),'0x00000000000000000000',owner.toString() as Hex]);
 if(input.attack==='caller')sender=owner;
 const report=encodeAbiParameters(batchReportAbi,[batch.batchId as Hex,evaluation.manifest,decisions]);
 let delivery=await call(treasury,'onReport',[metadata,report],sender);
 if(input.attack==='replay'){if(!delivery.success)throw new Error('Control report failed');delivery=await call(treasury,'onReport',[metadata,report],sender);}
 if(input.attack==='transfer')await call(token,'setFailTransfers',[true]);
 const before=await read(token,'balanceOf',[treasury.address.toString()]) as bigint;
 const settlement=await call(treasury,'settle',[payments[0].id]);
 const after=await read(token,'balanceOf',[treasury.address.toString()]) as bigint;
 const status=await read(treasury,'status',[payments[0].id]);
 let reason='';if(!delivery.success&&delivery.data.startsWith('0x08c379a0')){try{reason=decodeFunctionResult({abi:[{name:'Error',type:'function',stateMutability:'pure',inputs:[],outputs:[{type:'string'}]}],functionName:'Error',data:('0x'+delivery.data.slice(10)) as Hex}) as string;}catch{}}
 return {attack:input.attack,deliveryAccepted:delivery.success,settlementAccepted:settlement.success,revertReason:reason,treasuryBefore:before.toString(),treasuryAfter:after.toString(),paid:(before-after).toString(),requestStatus:status,reportBytes:(report.length-2)/2,deliveryGas:delivery.gas,settlementGas:settlement.gas,mode:'Browser-local Solidity bytecode execution; policy evaluated locally, not CRE. Mock forwarder caller; no DON signatures, TEE or network transaction.'};
}
