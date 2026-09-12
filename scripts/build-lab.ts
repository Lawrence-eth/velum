import solc from 'solc';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
const sources=Object.fromEntries(['BatchTreasury','TestToken'].map(n=>[`${n}.sol`,{content:readFileSync(`contracts/${n}.sol`,'utf8')}]));
const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings:{evmVersion:'shanghai',optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}})));
if(out.errors?.some((e:any)=>e.severity==='error'))throw new Error('Solidity compilation failed');
writeFileSync('public/lab-contracts.json',JSON.stringify({compiler:solc.version(),sourceSha256:Object.fromEntries(Object.entries(sources).map(([name,source])=>[name,createHash('sha256').update(source.content).digest('hex')])),contracts:Object.fromEntries(['BatchTreasury','TestToken'].map(n=>[n,{abi:out.contracts[`${n}.sol`][n].abi,bytecode:'0x'+out.contracts[`${n}.sol`][n].evm.bytecode.object}]))}));
