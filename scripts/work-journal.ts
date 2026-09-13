import {mkdirSync,readFileSync,writeFileSync,renameSync,readdirSync,openSync,fsyncSync,closeSync} from 'node:fs';
import {join} from 'node:path';
import type {Batch} from '../src/batch';
import type {JobResult} from '../src/cre-jobs';
const root=process.env.VELUM_WORK_JOURNAL_DIR||'artifacts/work-journals';
export type WorkEntry={id:string;now:number;batch:Batch;report:string;result:JobResult;acknowledged:boolean};
export type WorkJournal={workspace:string;entries:WorkEntry[]};
function file(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid journal identity');return join(root,id+'.json');}
export function loadJournal(workspace:string):WorkJournal{mkdirSync(root,{recursive:true,mode:0o700});try{const data=JSON.parse(readFileSync(file(workspace),'utf8'));if(data.workspace!==workspace||!Array.isArray(data.entries))throw Error('Invalid journal');return data;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return {workspace,entries:[]};throw e;}}
export function saveJournal(journal:WorkJournal){const path=file(journal.workspace),temp=path+'.tmp';writeFileSync(temp,JSON.stringify(journal),{mode:0o600});const fd=openSync(temp,'r');try{fsyncSync(fd)}finally{closeSync(fd)}renameSync(temp,path);const dir=openSync(root,'r');try{fsyncSync(dir)}finally{closeSync(dir)}}
export function pendingWorkResults(){mkdirSync(root,{recursive:true,mode:0o700});return readdirSync(root).filter(n=>/^[a-f0-9-]{36}\.json$/.test(n)).flatMap(n=>{const j=loadJournal(n.slice(0,-5));return j.entries.filter(e=>!e.acknowledged).map(e=>({workspace:j.workspace,id:e.id,execution:e.result}));});}
export function acknowledgeWork(workspace:string,id:string){const j=loadJournal(workspace),entry=j.entries.find(e=>e.id===id);if(!entry)throw Error('Journal entry missing');entry.acknowledged=true;saveJournal(j);}
