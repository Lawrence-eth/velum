import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('artifacts/guided-demo-take',{recursive:true});
const browser=await chromium.launch({headless:true,args:process.env.VELUM_TEST_IP?[`--host-resolver-rules=MAP velum.aethe.me ${process.env.VELUM_TEST_IP}`]:[]});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'artifacts/guided-demo-take',size:{width:1440,height:900}}});
const page=await context.newPage(),video=page.video(),start=Date.now(),cues=[];
async function scene(label,selector,seconds){cues.push({label,seconds:Math.round((Date.now()-start)/1000)});console.log(label);await page.locator(selector).first().evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.waitForTimeout(seconds*1000);}
async function completed(){await page.locator('#payment-result').waitFor({state:'visible',timeout:90000});await page.waitForFunction(()=>!document.getElementById('run-agent').disabled);}
try{
 await page.goto('https://velum.aethe.me',{waitUntil:'networkidle'});await scene('Review an invoice against the verified vendor record','.console-title',15);
 await scene('Suspicious remittance instruction and the verified wallet','.review-layout',15);await page.locator('#run-agent').click();await completed();
 assert.match(await page.locator('#result-source').innerText(),/LIVE MODEL/);
 await scene('Actual live model proposal and actual CRE and test treasury result','#payment-result',23);
 if(await page.locator('#repair-payment').isHidden()){await page.locator('.advanced-control summary').click();await page.locator('#inject-proposal').click();await completed();await scene('Model resisted: explicitly injected control, no model call','#payment-result',10);}
 await page.locator('#repair-payment').click();await completed();assert.match(await page.locator('#result-source').innerText(),/YOUR VERIFIED CORRECTION/);assert.equal(await page.locator('#actual-paid').innerText(),'$2,400');
 await scene('Explicit operator correction and verified local transfer','#payment-result',27);
 await page.locator('.run-details summary').click();await scene('One trace retains the exact proposal, identity and contract state','.run-details',14);
 await page.locator('.method-note summary').click();await scene('The Chainlink confidential-handler connection','.method-note',12);
 await page.goto('https://velum.aethe.me/evidence.html',{waitUntil:'networkidle'});await scene('Actual captured proposals through real CRE CLI and local Solidity','#agent-proof',25);await scene('Separate Sepolia batch receipts and simulation-forwarder boundary','#sepolia-proof',15);
 await page.goto('https://velum.aethe.me',{waitUntil:'networkidle'});await scene('Close: the payment review console','.console-title',15);
}finally{await context.close();await video.saveAs('artifacts/velum-guided-demo-footage.webm');await browser.close();writeFileSync('artifacts/guided-demo-cues.json',JSON.stringify({note:'Silent footage requiring human narration. Actual live inference, live CRE CLI simulation and server-local EVM. No deployed TEE or network payment.',cues},null,2)+'\n');}
