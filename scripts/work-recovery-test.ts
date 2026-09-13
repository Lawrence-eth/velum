import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readdirSync,writeFileSync} from 'node:fs';
import {loadJournal,saveJournal} from './work-journal';
try{const active=execFileSync('pgrep',['-x','cre'],{encoding:'utf8'}).trim();if(active)throw Error('CRE is running; retry recovery check when idle');}catch(e){if((e as {status?:number}).status!==1)throw e;}
const names=readdirSync('artifacts/work-journals').filter(n=>/^[a-f0-9-]{36}\.json$/.test(n));const journal=names.map(n=>loadJournal(n.slice(0,-5))).find(j=>j.entries.some(e=>e.result.settlementAccepted&&e.acknowledged));assert.ok(journal,'Complete a deployed work order first');
const entry=journal.entries.findLast(e=>e.result.settlementAccepted)!;const count=journal.entries.length,balance=entry.result.treasuryAfter;
execFileSync('systemctl',['--user','stop','velum-cre-runner']);
try{entry.acknowledged=false;saveJournal(journal);}finally{execFileSync('systemctl',['--user','start','velum-cre-runner']);}
let restored;for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,1000));restored=loadJournal(journal.workspace);if(restored.entries.find(e=>e.id===entry.id)?.acknowledged)break;}
assert.ok(restored);assert.equal(restored.entries.length,count);const acknowledged=restored.entries.find(e=>e.id===entry.id)!;assert.ok(acknowledged.acknowledged);assert.equal(acknowledged.result.treasuryAfter,balance);
const record={checkedAt:new Date().toISOString(),mode:'Actual service restart and saved-result redelivery to deployed backend',checks:['simulated missing acknowledgement retained the actual completed result','service restart redelivered and acknowledged the existing result','journal entry count and paid balance unchanged'],job:entry.id};writeFileSync('evidence/work-recovery.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));
