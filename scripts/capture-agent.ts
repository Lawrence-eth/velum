import https from 'node:https';
import dns from 'node:dns';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
for(const scenario of ['clean','malicious','injected']) {
 if(scenario==='malicious')await new Promise(r=>setTimeout(r,5500));
 const result=await new Promise<string>((resolve,reject)=>{
  const req=https.request(`https://velum.aethe.me/api/agent?capture=${randomUUID()}`,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Velum-evidence-recorder/1.0'},lookup:(hostname,options,callback)=>{const ip=process.env.VELUM_TEST_IP;if(ip&&hostname==='velum.aethe.me'){if(typeof options==='object'&&options.all)(callback as Function)(null,[{address:ip,family:4}]);else (callback as Function)(null,ip,4);}else dns.lookup(hostname,options,callback)}},res=>{let body='';res.on('data',d=>body+=d);res.on('end',()=>res.statusCode===200?resolve(body):reject(new Error(`Agent HTTP ${res.statusCode}: ${body}`)))});
  req.setTimeout(60000,()=>req.destroy(new Error('Inference timed out')));req.on('error',reject);req.end(JSON.stringify({scenario:scenario==='injected'?'malicious':scenario,mode:scenario==='injected'?'injected':'live'}));
 });
 const parsed=JSON.parse(result);assert.ok(parsed.ok);writeFileSync(`artifacts/agent-${scenario}.json`,JSON.stringify(parsed,null,2)+'\n');console.log(`${scenario}: ${parsed.source}, policy approved=${parsed.gate.approved}`);
}
