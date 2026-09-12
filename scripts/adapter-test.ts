import {VM} from '@ethereumjs/vm';
import {Common,Hardfork} from '@ethereumjs/common';
import {Address} from '@ethereumjs/util';
import {encodeDeployData,encodeFunctionData,hexToBytes,keccak256,toHex} from 'viem';
import {readFileSync} from 'node:fs';
import solc from 'solc';
import assert from 'node:assert/strict';
const sources={'SepoliaSimulationAdapter.sol':{content:readFileSync('contracts/SepoliaSimulationAdapter.sol','utf8')},'Receiver.sol':{content:'pragma solidity ^0.8.30; contract Receiver { bool public fail; function setFail(bool v) external {fail=v;} function onReport(bytes calldata, bytes calldata) external view {require(!fail);}}'}};
const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings:{evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode']}}}})));
assert.ok(!(output.errors||[]).some((e:any)=>e.severity==='error'));
const owner=Address.fromString('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),forwarder=Address.fromString('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
const vm=await VM.create({common:Common.custom({chainId:11155111},{hardfork:Hardfork.Shanghai})});
async function deploy(file:string,name:string,args:any[]){const c=output.contracts[file][name];const r=await vm.evm.runCall({caller:owner,data:hexToBytes(encodeDeployData({abi:c.abi,bytecode:`0x${c.evm.bytecode.object}`,args})),gasLimit:10000000n});assert.ok(!r.execResult.exceptionError);return{address:r.createdAddress!,abi:c.abi};}
async function call(c:any,fn:string,args:any[],sender=owner){const r=await vm.evm.runCall({caller:sender,to:c.address,data:hexToBytes(encodeFunctionData({abi:c.abi,functionName:fn,args})),gasLimit:10000000n});return !r.execResult.exceptionError;}
const a=await deploy('SepoliaSimulationAdapter.sol','SepoliaSimulationAdapter',[owner.toString(),forwarder.toString(),keccak256(toHex('test'))]);
const r=await deploy('Receiver.sol','Receiver',[]);const report='0x1234';
assert.equal(await call(a,'onReport',['0x',report],forwarder),false);
assert.equal(await call(a,'authorize',[r.address.toString(),keccak256(report)],forwarder),false);
assert.equal(await call(a,'authorize',[r.address.toString(),keccak256(report)]),true);
assert.equal(await call(a,'authorize',[r.address.toString(),keccak256(report)]),false);
assert.equal(await call(a,'onReport',['0x',report]),false);
assert.equal(await call(a,'onReport',['0x','0x4321'],forwarder),false);
assert.equal(await call(r,'setFail',[true]),true);
assert.equal(await call(a,'onReport',['0x',report],forwarder),false);
assert.equal(await call(r,'setFail',[false]),true);
assert.equal(await call(a,'onReport',['0x',report],forwarder),true);
assert.equal(await call(a,'onReport',['0x',report],forwarder),false);
console.log('11 adapter checks passed: authorization, exact hash, sender, replay, and downstream rollback.');
