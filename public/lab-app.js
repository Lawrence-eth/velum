const $=s=>document.querySelector(s);let selected='valid',last;
const cases={
 valid:['Valid payment','The unmodified report approves the first invoice. Its exact payment can settle once.'],
 recipient:['Swap the recipient','A report containing a different recipient commitment cannot authorize the registered payment.'],
 amount:['Add one micro-unit','Even a 0.000001 USD change breaks the exact payment commitment.'],
 reorder:['Reorder the decisions','The report must preserve the owner’s complete ordered manifest.'],
 omit:['Hide a held invoice','Dropping one decision fails the complete-manifest check.'],
 identity:['Use another workflow','A different workflow ID cannot approve this treasury’s batch.'],
 caller:['Forge the sender','A caller other than the configured forwarder cannot deliver the report.'],
 replay:['Replay the report','The second delivery is rejected. The first approval can still settle its payment once.'],
 transfer:['Make the token fail','A valid report cannot force a failed token transfer through. Approval and budget state roll back.'],
};
for(const [id,[title,description]] of Object.entries(cases)){const b=document.createElement('button');b.className='lab-case';b.textContent=title;b.setAttribute('aria-pressed',String(id===selected));b.addEventListener('click',()=>{selected=id;document.querySelectorAll('.lab-case').forEach(e=>e.setAttribute('aria-pressed',String(e===b)));$('#lab-title').textContent=title;$('#lab-explanation').textContent=description;$('#lab-verdict').textContent='NOT RUN';for(const id of ['delivery','paid','before','after'])$('#lab-'+id).textContent='—';$('#lab-reason').textContent='';$('#lab-state').textContent='';last=undefined;$('#lab-download').disabled=true;});$('#lab-experiments').append(b);}
$('#lab-run').addEventListener('click',async()=>{
 const attack=selected;document.querySelectorAll('button').forEach(b=>b.disabled=true);$('#lab-progress').textContent='Loading the local EVM and executing actual contract bytecode…';let worker;
 try{
 const response=await fetch('/lab-contracts.json');if(!response.ok)throw new Error('Contract artifacts unavailable');const artifacts=await response.json();
 worker=new Worker('/lab-worker.js',{type:'module'});
 const result=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Experiment timed out; try again.')),30000);worker.onmessage=e=>{clearTimeout(timeout);e.data.ok?resolve(e.data.result):reject(new Error(e.data.error));};worker.onerror=()=>{clearTimeout(timeout);reject(new Error('Your browser could not start the local EVM. Use a current desktop browser.'));};worker.postMessage({attack,contracts:artifacts.contracts});});
 last={...result,recordedAt:new Date().toISOString(),compiler:artifacts.compiler,sourceSha256:artifacts.sourceSha256};$('#lab-verdict').textContent='EXECUTED';$('#lab-title').textContent=cases[attack][0];$('#lab-explanation').textContent=cases[attack][1];$('#lab-delivery').textContent=result.deliveryAccepted?'Accepted':'Rejected';$('#lab-paid').textContent=result.settlementAccepted?'Transferred':'No transfer';const money=s=>'$'+(Number(s)/1e6).toLocaleString('en-US');$('#lab-before').textContent=money(result.treasuryBefore);$('#lab-after').textContent=money(result.treasuryAfter);$('#lab-reason').textContent=result.revertReason?`Contract revert: ${result.revertReason}`:result.settlementAccepted?`${money(result.paid)} synthetic USD transferred.`:'Transfer reverted; the treasury balance did not change.';$('#lab-state').textContent=`Request state: ${['None','Pending','Approved','Rejected','Paid','Cancelled'][result.requestStatus]}. Report: ${result.reportBytes} bytes. Delivery gas used: ${result.deliveryGas}. Settlement gas used: ${result.settlementGas}.`;
 $('#lab-progress').textContent='Experiment complete. Fresh local contracts were used; no network transaction was sent.';
 }catch(e){$('#lab-progress').textContent=e.message;}finally{worker?.terminate();document.querySelectorAll('button').forEach(b=>b.disabled=false);$('#lab-download').disabled=!last;}
});
$('#lab-download').addEventListener('click',()=>{if(!last)return;const url=URL.createObjectURL(new Blob([JSON.stringify(last,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`velum-${last.attack}-experiment.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
