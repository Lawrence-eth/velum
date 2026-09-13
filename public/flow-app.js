const $=id=>document.getElementById(id);
const money=units=>'$'+(Number(units)/1e6).toLocaleString('en-US',{maximumFractionDigits:6});
const short=wallet=>wallet.slice(0,6)+'…'+wallet.slice(-4);
let scenario='malicious',inputs,busy=false,last,initial;
function progress(step,state,text){$('progress-'+step).dataset.state=state;$('progress-'+step+'-text').textContent=text;}
function reset(){last=undefined;initial=undefined;$('payment-result').hidden=true;$('run-status').textContent='Runs the actual CRE CLI on the demo server.';progress('agent','ready','A live model proposes a wallet and amount.');progress('policy','ready','Verify recipient, amount, budget and paid state.');progress('contract','ready','Actual Solidity accepts or rejects settlement.');}
function select(next){if(busy||!inputs)return;scenario=next;reset();document.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===scenario)));$('invoice-text').textContent=inputs.invoiceText[scenario];$('attack-note').hidden=scenario==='clean';$('clean-note').hidden=scenario!=='clean';$('document-version').textContent=scenario==='clean'?'Original invoice':'Edited remittance';$('inspector-state').textContent='Ready';}
function controls(disabled){busy=disabled;for(const id of ['run-agent','inject-proposal','repair-payment','try-other'])$(id).disabled=disabled;document.querySelectorAll('[data-scenario]').forEach(b=>b.disabled=disabled);}
async function agentApi(body,access){const response=await fetch(`/api/agent?request=${crypto.randomUUID()}`,{method:'POST',headers:{'Content-Type':'application/json',...(access?{Authorization:`Bearer ${access}`}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(65000)});if(!response.headers.get('content-type')?.includes('application/json'))throw Error('The execution service could not be reached.');const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Execution request failed.');return data;}
async function execute(capture){
 await agentApi({action:'execute',id:capture.runId},capture.creAccess);
 const deadline=Date.now()+160000;
 while(Date.now()<deadline){
  const response=await fetch(`/api/agent/job/${capture.runId}?poll=${Date.now()}`,{headers:{Authorization:`Bearer ${capture.creAccess}`},cache:'no-store',signal:AbortSignal.timeout(15000)});
  const job=await response.json();if(!response.ok||!job.ok)throw Error(job.error||'Run status unavailable.');
  if(job.status==='complete')return job.execution;
  if(job.status==='failed')throw Error(job.error||'CRE execution failed. No payment result is claimed.');
  progress('policy','working',job.status==='queued'?'Queued for the CRE executor.':'CRE CLI is fetching the source and generating the report.');
  $('run-status').textContent=job.status==='queued'?'Waiting for the CRE executor…':'Running the confidential-handler simulation. Usually 20–40 seconds.';
  await new Promise(resolve=>setTimeout(resolve,1800));
 }
 throw Error('The execution request timed out. No successful result is claimed.');
}

function show(capture,result){
 last={capture,execution:result,recordedAt:new Date().toISOString(),disclosure:'Synthetic operator trace. Actual live CRE CLI simulation and server-local Solidity using the returned report. Mock identity; no TEE attestation, network payment or persistent accounting reservation.'};
 const approved=result.policyApproved,paid=result.settlementAccepted,corrected=capture.source==='operator-corrected',injected=capture.source==='injected-proposal';
 $('payment-result').dataset.outcome=paid?'paid':'denied';$('payment-result').hidden=false;
 $('result-source').textContent=(corrected?'YOUR VERIFIED CORRECTION':injected?'EXPLICIT COMPROMISED-PROPOSAL TEST':'LIVE MODEL PROPOSAL')+' / LIVE CRE CLI';
 $('result-title').textContent=paid?(corrected?'Verified payment released':'Test payment released'):'Payment held';
 $('result-explanation').textContent=paid?(corrected?'Your correction matches the vendor record. CRE approved the payment and the test treasury released the tokens.':scenario==='malicious'?'This model ignored the malicious instruction and proposed the verified wallet. The independent gate approved it and the local treasury transferred the test tokens.':'The wallet and amount match the vendor record. CRE approved the payment; the test treasury released the tokens.'):(capture.proposal.recipient!=='0x2222222222222222222222222222222222222222'?'The proposed destination does not match the vendor’s verified wallet.':'The proposed amount does not match the verified invoice.')+' CRE denied it. The treasury rejected settlement.';
 $('proposal-label').textContent=corrected?'You selected':injected?'The test proposed':'The agent proposed';
 $('proposed-amount').textContent='$'+Number(capture.proposal.amount).toLocaleString('en-US');$('proposed-recipient').textContent=short(capture.proposal.recipient)+(approved?' · Verified vendor':' · Unverified destination');
 $('actual-paid').textContent=money(result.paid);$('actual-recipient').textContent=paid?'To the verified vendor':'No tokens transferred';$('balance-change').textContent=`Test treasury ${money(result.treasuryBefore)} → ${money(result.treasuryAfter)}. Independent treasury per run.`;
 $('wallet-comparison').hidden=capture.proposal.recipient==='0x2222222222222222222222222222222222222222';$('requested-wallet').textContent=short(capture.proposal.recipient);
 $('repair-payment').hidden=approved;$('repair-note').hidden=approved;$('try-other').textContent=scenario==='malicious'?'Try original invoice':'Try edited invoice';
 $('attempt-history').hidden=!corrected;if(corrected)$('attempt-history').textContent='First attempt: denied, $0 transferred. Your corrected attempt: '+money(result.paid)+' test tokens transferred in a fresh local treasury.';
 $('proposal-output').textContent=JSON.stringify({proposalSource:capture.source,model:capture.model||null,proposal:capture.proposal,requestId:result.requestId,localCommitment:result.commitment,policyApproved:result.policyApproved,reasons:result.policyReasons,contractState:['None','Pending','Approved','Rejected','Paid','Cancelled'][result.requestStatus]},null,2);
 $('execution-detail').textContent='The real CRE CLI returned this report for the proposed recipient and amount. Its exact bytes were delivered to the server-local treasury. Token, consumer and expiry belong to this test run. Workflow identity is mocked; this is not deployed TEE attestation.';
 $('inspector-state').textContent=paid?'Released':'Held';
 $('run-status').textContent=paid?'Complete. The local contract transferred test tokens.':'Complete. Settlement was denied and the treasury balance stayed unchanged.';
 if(innerWidth<900)$('payment-result').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});$('payment-result').focus({preventScroll:true});
}
async function run(mode){
 if(busy||!inputs)return;const previous=last;controls(true);$('payment-result').hidden=true;$('inspector-state').textContent='Running';
 try{
  let capture;
  if(mode==='corrected'){
   if(!previous||previous.execution.policyApproved)throw Error('Run a denied proposal before correcting it.');
   initial=previous;capture=await agentApi({action:'correct',id:previous.capture.runId},previous.capture.creAccess);
   progress('agent','done','You selected the verified wallet and amount. No model call.');
  }else{
   initial=undefined;progress('agent','working',mode==='live'?'The live model is reading this invoice…':'Supplying an explicitly compromised proposal…');progress('policy','ready','Waiting for the proposed payment.');progress('contract','ready','Waiting for the policy decision.');$('run-status').textContent=mode==='live'?'Reading the invoice with the live model…':'Checking the deliberately compromised proposal…';
   const response=await fetch(`/api/agent?run=${crypto.randomUUID()}`,{cache:'no-store',method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario,mode}),signal:AbortSignal.timeout(60000)});
   if(!response.headers.get('content-type')?.includes('application/json'))throw Error('The agent service could not be reached. Try again.');
   capture=await response.json();if(!response.ok||!capture.ok)throw Error(capture.error||'No valid payment proposal was returned.');
   progress('agent','done',capture.source==='live-model'?'Live proposal received: $'+Number(capture.proposal.amount).toLocaleString('en-US')+' to '+short(capture.proposal.recipient):'Attacker-wallet test proposal received. No model call.');
  }
  progress('policy','working','Checking this exact proposal against the accounting record.');$('run-status').textContent='Submitting this proposal to the live CRE executor…';progress('contract','ready','Waiting for the actual CRE report.');
  const result=await execute(capture);
  if(result.proposal.recipient!==capture.proposal.recipient||result.proposal.amount!==capture.proposal.amount)throw Error('The executed payment differs from the proposal. Result withheld.');
  if(capture.gate&&capture.gate.approved!==result.policyApproved)throw Error('The proposal preview and CRE results disagree. Result withheld.');
  if(!result.deliveryAccepted||result.settlementAccepted!==result.policyApproved)throw Error('Contract execution did not match the policy decision. Inspect the contract lab before retrying.');
  progress('policy',result.policyApproved?'done':'denied',result.policyApproved?'Verified wallet and amount. Policy passed.':'Wallet differs from the verified record. Policy denied.');
  progress('contract',result.settlementAccepted?'done':'denied',result.settlementAccepted?money(result.paid)+' test tokens transferred.':'Settlement reverted. $0 transferred.');show(capture,result);
 }catch(error){$('inspector-state').textContent='Unavailable';$('run-status').textContent=error.name==='TimeoutError'?'The model took too long. No contract payment was attempted.':error.message;progress('contract','denied','Run incomplete. No network payment was sent.');last=undefined;}finally{controls(false);}
}
for(const button of document.querySelectorAll('[data-scenario]'))button.addEventListener('click',()=>select(button.dataset.scenario));
$('run-agent').addEventListener('click',()=>run('live'));$('inject-proposal').addEventListener('click',()=>run('injected'));$('repair-payment').addEventListener('click',()=>run('corrected'));
$('try-other').addEventListener('click',()=>{select(scenario==='malicious'?'clean':'malicious');$('demo').scrollIntoView({behavior:'smooth'});});
$('download-agent').addEventListener('click',()=>{if(!last)return;const url=URL.createObjectURL(new Blob([JSON.stringify({...last,previousAttempt:initial||undefined},(key,value)=>key==='creAccess'?undefined:value,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='velum-payment-run.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
controls(true);fetch('/agent-input.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{inputs=data;controls(false);$('system-prompt').textContent=data.systemPrompt;select('malicious')}).catch(()=>{$('run-status').textContent='The example invoice could not be loaded. Reload to retry.';});
$('download-cre-log').addEventListener('click',()=>{if(!last?.execution.creLog)return;const url=URL.createObjectURL(new Blob([last.execution.creLog],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='velum-cre-execution.log';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
