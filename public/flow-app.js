const $=id=>document.getElementById(id);
const money=units=>'$'+(Number(units)/1e6).toLocaleString('en-US',{maximumFractionDigits:6});
const short=wallet=>wallet.slice(0,6)+'…'+wallet.slice(-4);
let scenario='malicious',inputs,busy=false,last,initial;
function progress(step,state,text){$('progress-'+step).dataset.state=state;$('progress-'+step+'-text').textContent=text;}
function reset(){last=undefined;initial=undefined;$('payment-result').hidden=true;$('run-status').textContent='About 10 seconds. No money leaves your wallet.';progress('agent','ready','A live model proposes a wallet and amount.');progress('policy','ready','Verify recipient, amount, budget and paid state.');progress('contract','ready','Actual Solidity accepts or rejects settlement.');}
function select(next){if(busy||!inputs)return;scenario=next;reset();document.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===scenario)));$('invoice-text').textContent=inputs.invoiceText[scenario];$('attack-note').hidden=scenario==='clean';$('clean-note').hidden=scenario!=='clean';}
function controls(disabled){busy=disabled;for(const id of ['run-agent','inject-proposal','repair-payment','try-other'])$(id).disabled=disabled;document.querySelectorAll('[data-scenario]').forEach(b=>b.disabled=disabled);}
async function execute(proposal,runId){
 const response=await fetch('/lab-contracts.json');if(!response.ok)throw Error('The contract files could not be loaded. Try again.');const artifacts=await response.json();
 const worker=new Worker('/lab-worker.js',{type:'module'});
 try{return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('The local contract took too long. No network payment was sent. Try again.')),30000);worker.onmessage=event=>{clearTimeout(timer);event.data.ok?resolve({...event.data.result,compiler:artifacts.compiler,sourceSha256:artifacts.sourceSha256}):reject(Error(event.data.error));};worker.onerror=()=>{clearTimeout(timer);reject(Error('This browser could not start the contract executor. Try a current browser.'));};worker.postMessage({attack:'proposal',proposal,runId,contracts:artifacts.contracts});});}finally{worker.terminate();}
}
function show(capture,result){
 last={capture,execution:result,recordedAt:new Date().toISOString(),disclosure:'Synthetic operator trace. Live model or explicitly labeled proposal source; ordinary policy and browser-local EVM. Local token, consumer and expiry are assigned for this independent execution. No live CRE, network transaction or persistent accounting reservation.'};
 const approved=result.policyApproved,paid=result.settlementAccepted,corrected=capture.source==='operator-corrected',injected=capture.source==='injected-proposal';
 $('payment-result').dataset.outcome=paid?'paid':'denied';$('payment-result').hidden=false;
 $('result-source').textContent=(corrected?'YOUR VERIFIED CORRECTION':injected?'EXPLICIT COMPROMISED-PROPOSAL TEST':'LIVE MODEL PROPOSAL')+' / LOCAL CONTRACT RESULT';
 $('result-title').textContent=paid?(corrected?'Verified details. Payment completed.':'Verified payment completed.'):'The wrong payment stopped here.';
 $('result-explanation').textContent=paid?(corrected?'You replaced the untrusted payment instruction with the verified accounting details. The independent policy accepted this new proposal and the local treasury transferred the test tokens.':scenario==='malicious'?'This model ignored the malicious instruction and proposed the verified wallet. The independent gate approved it and the local treasury transferred the test tokens.':'The proposed wallet and amount match the accounting record. The independent gate approved the payment and the local treasury transferred the test tokens.'):(capture.proposal.recipient!=='0x2222222222222222222222222222222222222222'?'The proposed destination does not match the vendor’s verified wallet.':'The proposed amount does not match the verified invoice.')+' The policy denied it, and the Solidity treasury rejected the settlement attempt.';
 $('proposal-label').textContent=corrected?'You selected':injected?'The test proposed':'The agent proposed';
 $('proposed-amount').textContent='$'+Number(capture.proposal.amount).toLocaleString('en-US');$('proposed-recipient').textContent=short(capture.proposal.recipient)+(approved?' · Verified vendor':' · Unverified destination');
 $('actual-paid').textContent=money(result.paid);$('actual-recipient').textContent=paid?'To the verified vendor':'No tokens transferred';$('balance-change').textContent=`Local treasury balance: ${money(result.treasuryBefore)} → ${money(result.treasuryAfter)}. Each attempt uses a fresh test treasury.`;
 $('wallet-comparison').hidden=capture.proposal.recipient==='0x2222222222222222222222222222222222222222';$('requested-wallet').textContent=short(capture.proposal.recipient);
 $('repair-payment').hidden=approved;$('repair-note').hidden=approved;$('try-other').textContent=scenario==='malicious'?'Try the normal invoice':'Try the suspicious invoice';
 $('attempt-history').hidden=!corrected;if(corrected)$('attempt-history').textContent='First attempt: denied, $0 transferred. Your corrected attempt: '+money(result.paid)+' test tokens transferred in a fresh local treasury.';
 $('proposal-output').textContent=JSON.stringify({proposalSource:capture.source,model:capture.model||null,proposal:capture.proposal,requestId:result.requestId,localCommitment:result.commitment,policyApproved:result.policyApproved,reasons:result.policyReasons,contractState:['None','Pending','Approved','Rejected','Paid','Cancelled'][result.requestStatus]},null,2);
 $('execution-detail').textContent='The original proposal’s recipient and amount were used in this contract run. Token, treasury address and expiry were assigned to the local test environment. Report identity is mocked; no CRE network execution or attestation is implied.';
 $('run-status').textContent=paid?'Complete. The local contract transferred test tokens.':'Complete. Settlement was denied and the treasury balance stayed unchanged.';
 $('payment-result').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});$('payment-result').focus({preventScroll:true});
}
async function run(mode){
 if(busy||!inputs)return;const previous=last;controls(true);$('payment-result').hidden=true;
 try{
  let capture;
  if(mode==='corrected'){
   if(!previous||previous.execution.policyApproved)throw Error('Run a denied proposal before correcting it.');
   initial=previous;capture={ok:true,runId:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),source:'operator-corrected',scenario,proposal:{invoiceRef:'NS-101',recipient:'0x2222222222222222222222222222222222222222',amount:'2400.00'}};
   progress('agent','done','You selected the verified wallet and amount. No model call.');
  }else{
   initial=undefined;progress('agent','working',mode==='live'?'The live model is reading this invoice…':'Supplying an explicitly compromised proposal…');progress('policy','ready','Waiting for the proposed payment.');progress('contract','ready','Waiting for the policy decision.');$('run-status').textContent=mode==='live'?'Reading the invoice with the live model…':'Checking the deliberately compromised proposal…';
   const response=await fetch(`/api/agent?run=${crypto.randomUUID()}`,{cache:'no-store',method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario,mode}),signal:AbortSignal.timeout(60000)});
   if(!response.headers.get('content-type')?.includes('application/json'))throw Error('The agent service could not be reached. Try again.');
   capture=await response.json();if(!response.ok||!capture.ok)throw Error(capture.error||'No valid payment proposal was returned.');
   progress('agent','done',capture.source==='live-model'?'Live proposal received: $'+Number(capture.proposal.amount).toLocaleString('en-US')+' to '+short(capture.proposal.recipient):'Attacker-wallet test proposal received. No model call.');
  }
  progress('policy','working','Checking this exact proposal against the accounting record.');$('run-status').textContent='Running the policy and compiled treasury contract in your browser…';progress('contract','working','Deploying a local test treasury and attempting settlement…');
  const result=await execute(capture.proposal,capture.runId);
  if(result.proposal.recipient!==capture.proposal.recipient||result.proposal.amount!==capture.proposal.amount)throw Error('The executed payment differs from the proposal. Result withheld.');
  if(capture.gate&&capture.gate.approved!==result.policyApproved)throw Error('The server and local policy results disagree. Result withheld.');
  if(!result.deliveryAccepted||result.settlementAccepted!==result.policyApproved)throw Error('Contract execution did not match the policy decision. Inspect the contract lab before retrying.');
  progress('policy',result.policyApproved?'done':'denied',result.policyApproved?'Verified wallet and amount. Policy passed.':'Wallet differs from the verified record. Policy denied.');
  progress('contract',result.settlementAccepted?'done':'denied',result.settlementAccepted?money(result.paid)+' test tokens transferred.':'Settlement reverted. $0 transferred.');show(capture,result);
 }catch(error){$('run-status').textContent=error.name==='TimeoutError'?'The model took too long. No contract payment was attempted.':error.message;progress('contract','denied','Run incomplete. No network payment was sent.');last=undefined;}finally{controls(false);}
}
for(const button of document.querySelectorAll('[data-scenario]'))button.addEventListener('click',()=>select(button.dataset.scenario));
$('run-agent').addEventListener('click',()=>run('live'));$('inject-proposal').addEventListener('click',()=>run('injected'));$('repair-payment').addEventListener('click',()=>run('corrected'));
$('try-other').addEventListener('click',()=>{select(scenario==='malicious'?'clean':'malicious');$('demo').scrollIntoView({behavior:'smooth'});});
$('download-agent').addEventListener('click',()=>{if(!last)return;const url=URL.createObjectURL(new Blob([JSON.stringify({...last,previousAttempt:initial||undefined},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='velum-payment-run.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
controls(true);fetch('/agent-input.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{inputs=data;controls(false);$('system-prompt').textContent=data.systemPrompt;select('malicious')}).catch(()=>{$('run-status').textContent='The example invoice could not be loaded. Reload to retry.';});
fetch('/agent-evidence.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{const panel=$('agent-evidence');panel.replaceChildren();const title=document.createElement('strong');title.textContent='Recorded: actual CRE CLI → Solidity';panel.append(title);for(const run of data.runs.slice(0,2)){const p=document.createElement('p');p.textContent=run.label+': '+(run.settled?'approved; 2,400 test tokens transferred.':'denied; settlement reverted, $0 transferred.');panel.append(p)}const note=document.createElement('p');note.className='fine';note.textContent='Captured live model outputs. Independent local treasuries, simulated workflow identity, no deployed TEE attestation.';panel.append(note)}).catch(()=>{$('agent-evidence').textContent='The recorded summary could not load. The full execution record is available through the link beside it.'});
