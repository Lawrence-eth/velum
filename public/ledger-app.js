const $=s=>document.querySelector(s), money=s=>'$'+(Number(s)/1e6).toLocaleString('en-US',{maximumFractionDigits:6});
const keyName='velum-ledger-access-v1';let access,rows=[],ledger,busy=false;
try{access=localStorage.getItem(keyName);}catch{}
async function api(action,input){
 const response=await fetch('/api/ledger'+(action?'/'+action:''),{method:action?'POST':'GET',headers:{Authorization:`Bearer ${access}`,...(action?{'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify(input||{})}:{})});
 if(!response.headers.get('Content-Type')?.includes('application/json'))throw new Error('Workspace request blocked or unavailable. Please retry.');
 const data=await response.json();if(!response.ok||data.ok===false)throw new Error(data.error||'Workspace unavailable');return data;
}
function message(text){$('#ledger-status').textContent=text;}
async function work(fn){if(busy)return;busy=true;$('#ledger').querySelectorAll('button,input,select').forEach(e=>e.disabled=true);try{await fn();}catch(e){message(e.message);}finally{busy=false;$('#ledger').querySelectorAll('button,input,select').forEach(e=>e.disabled=false);$('#ledger-reserve').disabled=!rows.length;}}
function newAccess(){access=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem(keyName,access);}
function render(){
 $('#ledger-content').hidden=false;$('#ledger-new').hidden=false;$('#ledger-open').hidden=true;
 const cards=$('#ledger-policies');cards.replaceChildren();
 for(const p of ledger.policies){const card=document.createElement('article');for(const [tag,text] of [['small',`${p.vendor} · ${p.purchaseOrder}`],['strong',money(p.available)],['span',`Available from ${money(p.budget)} · invoice limit ${money(p.limit)}`]]){const e=document.createElement(tag);e.textContent=text;card.append(e);}cards.append(card);}
 const history=$('#ledger-history');history.replaceChildren();
 for(const r of ledger.reservations){const tr=document.createElement('tr');for(const value of [r.invoice,money(r.amount),r.status==='paid'?'Paid · finalized Sepolia':r.status==='released'?'Released':r.binding==='sepolia'?'Reserved · Sepolia example':'Reserved · preview']){const td=document.createElement('td');td.textContent=value;tr.append(td);}const td=document.createElement('td');
  if(r.txHash){const a=document.createElement('a');a.textContent='Payment receipt ↗';a.href=`https://sepolia.etherscan.io/tx/${r.txHash}`;a.target='_blank';a.rel='noreferrer';td.append(a);}
  else if(r.status==='reserved'&&r.binding==='preview'){const b=document.createElement('button');b.className='secondary';b.textContent='Release this preview run';b.addEventListener('click',()=>work(async()=>{ledger=(await api('release',{run:r.run})).ledger;render();message('Preview reservations released. No chain authorization was changed.');}));td.append(b);}
  tr.append(td);history.append(tr);
 }
 if(!ledger.reservations.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent='No reservations yet.';tr.append(td);history.append(tr);}
}
function renderDraft(){
 const body=$('#ledger-draft');body.replaceChildren();
 rows.forEach((r,i)=>{const tr=document.createElement('tr');for(const field of ['invoice','description','vendor','recipient','amount']){const td=document.createElement('td');const input=field==='vendor'?document.createElement('select'):document.createElement('input');input.setAttribute('aria-label',`${field} row ${i+1}`);
 if(field==='vendor')for(const v of ['NORTHSTAR','ORBIT']){const option=document.createElement('option');option.value=v;option.textContent=v;input.append(option);}
 input.value=r[field];input.addEventListener('input',()=>{r[field]=input.value;if(field==='vendor'){r.purchaseOrder=input.value==='ORBIT'?'PO-2026-088':'PO-2026-042';renderDraft();}$('#ledger-decisions').replaceChildren();message('Draft changed. Evaluate to create a new reservation run.');});td.append(input);if(field==='vendor'){const small=document.createElement('small');small.textContent=r.purchaseOrder;td.append(small);}tr.append(td);}
 const td=document.createElement('td'),remove=document.createElement('button');remove.className='secondary';remove.textContent='×';remove.setAttribute('aria-label',`Remove row ${i+1}`);remove.addEventListener('click',()=>{rows.splice(i,1);renderDraft();$('#ledger-decisions').replaceChildren();});td.append(remove);tr.append(td);body.append(tr);});$('#ledger-reserve').disabled=!rows.length;
}
async function importCsv(csv){rows=(await api('import',{csv})).rows;renderDraft();$('#ledger-decisions').replaceChildren();message(`${rows.length} synthetic invoice rows imported. Review or edit before reserving.`);}
$('#ledger-open').addEventListener('click',()=>work(async()=>{if(!access)newAccess();ledger=await api();render();message('Workspace open. Reservations persist across reloads.');}));
$('#ledger-new').addEventListener('click',()=>work(async()=>{newAccess();rows=[];ledger=await api();render();renderDraft();$('#ledger-decisions').replaceChildren();message('Separate empty workspace created. The previous workspace was not modified.');}));
$('#ledger-sample').addEventListener('click',()=>work(async()=>{await importCsv(await (await fetch('/invoices-template.csv')).text());}));
$('#invoice-csv').addEventListener('change',event=>work(async()=>{const file=event.target.files[0];if(!file)return;if(file.size>16384)throw new Error('CSV must be at most 16 KB');await importCsv(await file.text());event.target.value='';}));
$('#ledger-reserve').addEventListener('click',()=>work(async()=>{const data=await api('reserve',{rows});ledger=data.ledger;render();const box=$('#ledger-decisions');box.replaceChildren();for(const d of data.result.details){const p=document.createElement('p');p.textContent=`${d.invoiceKey}: ${d.approved?'Reserved':`Held — ${d.reasons.join('; ')}`} · ${money(d.amount)}`;box.append(p);}message(`${money(data.result.approvedAmount)} reserved in a new preview run. No CRE execution or payment was triggered.`);}));
$('#ledger-refresh').addEventListener('click',()=>work(async()=>{ledger=await api();render();message('Saved state refreshed.');}));
$('#ledger-seed').addEventListener('click',()=>work(async()=>{ledger=(await api('seed')).ledger;render();message('Two recorded Sepolia reservations loaded. Verify their payment receipts to reconcile.');}));
$('#ledger-reconcile').addEventListener('click',()=>work(async()=>{
 if(!ledger.seeded)throw new Error('Load recorded Sepolia reservations into an empty workspace first.');
 const evidence=await (await fetch('/sepolia-evidence.json')).json();
 for(const p of evidence.settlements){message('Checking finalized Sepolia receipt…');ledger=(await api('reconcile',{txHash:p.txHash})).ledger;render();}
 message('Both finalized payments reconciled. These invoice identities remain blocked in future runs.');
}));
if(access)await work(async()=>{ledger=await api();render();message('Your saved workspace has been restored.');});
