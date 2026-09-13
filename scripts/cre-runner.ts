import https from 'node:https';
import dns from 'node:dns';
import {executeJob} from './cre-job-executor';
const token=process.env.CRE_RUNNER_TOKEN;if(!token||!/^[a-f0-9]{64}$/.test(token))throw Error('Missing runner credential');
async function api(body:unknown):Promise<any>{return new Promise((resolve,reject)=>{const req=https.request('https://velum.aethe.me/api/agent',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'User-Agent':'Velum-CRE-runner/1.0'},lookup:(host,options,callback)=>{const ip=process.env.VELUM_TEST_IP;if(ip&&host==='velum.aethe.me'){if(typeof options==='object'&&options.all)(callback as Function)(null,[{address:ip,family:4}]);else(callback as Function)(null,ip,4);}else dns.lookup(host,options,callback);}},res=>{let text='';res.on('data',d=>{text+=d.toString();if(text.length>100000)req.destroy(Error('Response too large'))});res.on('end',()=>{try{const result=JSON.parse(text);if(res.statusCode!==200||result.ok===false)reject(Error('Runner API rejected request'));else resolve(result);}catch{reject(Error('Invalid runner response'));}})});req.setTimeout(15000,()=>req.destroy(Error('Runner request timed out')));req.on('error',reject);req.end(JSON.stringify(body));});}
console.log('Velum CRE executor started: fixed workflow, synthetic proposals, no broadcast.');
while(true){
 try{const {job}=await api({action:'runner-claim'});if(job){console.log(`Executing ${job.id}`);const heartbeat=setInterval(()=>{void api({action:'runner-claim'}).catch(()=>{});},10000);try{const execution=await executeJob(job);await api({action:'runner-result',id:job.id,execution});console.log(`Completed ${job.id}: approved=${execution.policyApproved}`);}catch(error){console.error(`Failed ${job.id}: ${error instanceof Error?error.message:'Execution failed'}`);await api({action:'runner-result',id:job.id,failed:true});}finally{clearInterval(heartbeat);}}}
 catch{console.error('Runner transport unavailable; retrying.');}
 await new Promise(resolve=>setTimeout(resolve,5000));
}
