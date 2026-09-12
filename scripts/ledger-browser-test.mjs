import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
const base=process.env.VELUM_TEST_URL||'https://velum.aethe.me';
const browser=await chromium.launch({headless:true,args:process.env.VELUM_TEST_IP?[`--host-resolver-rules=MAP velum.aethe.me ${process.env.VELUM_TEST_IP}`]:[]});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));const checks=[];
try{
 await page.goto(base,{waitUntil:'networkidle'});await page.locator('#ledger-open').click();await page.locator('#ledger-content').waitFor({state:'visible'});
 await page.locator('#ledger-sample').click();await page.getByText('5 synthetic invoice rows imported.',{exact:false}).waitFor();
 await page.locator('#ledger-reserve').click();await page.getByText('$5,800 reserved in a new preview run.',{exact:false}).waitFor();checks.push('CSV sample reserved with shared PO limits');
 await page.reload({waitUntil:'networkidle'});await page.getByText('Your saved workspace has been restored.').waitFor();assert.equal(await page.locator('#ledger-history tr').count(),2);checks.push('persistent state survives page reload');
 await page.locator('#ledger-sample').click();await page.getByText('5 synthetic invoice rows imported.',{exact:false}).waitFor();await page.locator('#ledger-reserve').click();await page.getByText('$0 reserved in a new preview run.',{exact:false}).waitFor();assert.match(await page.locator('#ledger-decisions').textContent(),/Invoice reserved in an earlier run/);checks.push('resubmitted invoices blocked across runs');
 await page.getByRole('button',{name:'Release this preview run'}).first().click();await page.getByText('Preview reservations released.',{exact:false}).waitFor();checks.push('preview release restores budget');
 const csv='invoice,description,vendor,purchaseOrder,recipient,amount\nNS-103,Wallet correction,NORTHSTAR,PO-2026-042,0x4444444444444444444444444444444444444444,2400\n';
 await page.locator('#invoice-csv').setInputFiles({name:'test.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.getByText('1 synthetic invoice rows imported.',{exact:false}).waitFor();await page.locator('#ledger-reserve').click();await page.getByText('$0 reserved in a new preview run.',{exact:false}).waitFor();assert.match(await page.locator('#ledger-decisions').textContent(),/Recipient does not match/);
 await page.getByLabel('recipient row 1',{exact:true}).fill('0x2222222222222222222222222222222222222222');await page.locator('#ledger-reserve').click();await page.getByText('$2,400 reserved in a new preview run.',{exact:false}).waitFor();checks.push('uploaded CSV held wallet corrected and reserved');
 await page.locator('#ledger-new').click();await page.getByText('Separate empty workspace created.',{exact:false}).waitFor();await page.locator('#ledger-seed').click();await page.getByText('Two recorded Sepolia reservations loaded.',{exact:false}).waitFor();
 await page.locator('#ledger-reconcile').click();await page.getByText('Both finalized payments reconciled.',{exact:false}).waitFor({timeout:90000});assert.equal(await page.getByText('Paid · finalized Sepolia',{exact:true}).count(),2);checks.push('actual finalized Sepolia payment events reconciled');
 await page.locator('#ledger-reconcile').click();await page.getByText('Both finalized payments reconciled.',{exact:false}).waitFor({timeout:90000});assert.equal(await page.getByText('Paid · finalized Sepolia',{exact:true}).count(),2);checks.push('reconciliation idempotent');
 await page.reload({waitUntil:'networkidle'});await page.getByText('Your saved workspace has been restored.').waitFor();await page.locator('#ledger-sample').click();await page.getByText('5 synthetic invoice rows imported.',{exact:false}).waitFor();await page.locator('#ledger-reserve').click();await page.getByText('$0 reserved in a new preview run.',{exact:false}).waitFor();assert.match(await page.locator('#ledger-decisions').textContent(),/Invoice already paid in an earlier run/);checks.push('paid invoice blocked after reload under new request IDs');
 const api=await page.evaluate(async()=>{
  const key=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  const call=(token,rows)=>fetch('/api/ledger/reserve',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({rows})}).then(r=>r.json());
  const row={invoice:'RACE-A',description:'Concurrent payment',vendor:'NORTHSTAR',purchaseOrder:'PO-2026-042',recipient:'0x2222222222222222222222222222222222222222',amount:'4000'};
  const results=await Promise.all([call(key,[row]),call(key,[{...row,invoice:'RACE-B'}])]);
  const isolated=await fetch('/api/ledger',{headers:{Authorization:`Bearer ${'c'.repeat(64)}`}}).then(r=>r.json());
  const unauthorized=await fetch('/api/ledger').then(r=>r.status);
  return {amounts:results.map(r=>r.result.approvedAmount).sort(),isolated:isolated.reservations.length,unauthorized};
 });
 assert.deepEqual(api.amounts,['0','4000000000']);assert.equal(api.isolated,0);assert.equal(api.unauthorized,401);checks.push('simultaneous runs cannot double-reserve shared budget','workspace isolation and missing-key rejection');
 mkdirSync('artifacts',{recursive:true});
 const access=await page.evaluate(()=>localStorage.getItem('velum-ledger-access-v1'));writeFileSync('artifacts/ledger-test-access',access,{mode:0o600});
 await page.locator('#ledger').scrollIntoViewIfNeeded();await page.screenshot({path:'evidence/ledger-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'evidence/ledger-mobile.png',fullPage:true});checks.push('mobile layout fits viewport');assert.deepEqual(errors,[]);checks.push('no page errors');
 writeFileSync('evidence/ledger-browser.json',JSON.stringify({success:true,recordedAt:new Date().toISOString(),base,checks},null,2)+'\n');console.log(JSON.stringify({success:true,checks},null,2));
}finally{await browser.close();}
