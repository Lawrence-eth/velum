import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('artifacts/agent-demo-take',{recursive:true});
const browser=await chromium.launch({headless:true,args:process.env.VELUM_TEST_IP?[`--host-resolver-rules=MAP velum.aethe.me ${process.env.VELUM_TEST_IP}`]:[]});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'artifacts/agent-demo-take',size:{width:1440,height:900}}});
const page=await context.newPage();const video=page.video();const start=Date.now();const cues=[];
async function scene(label,selector,seconds){cues.push({label,seconds:Math.round((Date.now()-start)/1000)});console.log(label);await page.locator(selector).first().evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.waitForTimeout(seconds*1000);}
async function live(){await page.locator('#run-agent').click();await page.locator('#verdict').waitFor({timeout:65000});assert.match(await page.locator('#run-source').innerText(),/LIVE MODEL/);}
try{
 await page.goto('https://velum.aethe.me',{waitUntil:'networkidle'});
 await scene('Opening: agent intent and independent authority','.hero',17);
 await scene('Clean synthetic invoice','#demo',7);await live();
 assert.match(await page.locator('#verdict').innerText(),/ELIGIBLE/);
 await scene('Actual live clean proposal is eligible; preview sends no payment','.demo-grid',17);
 await page.locator('[data-scenario="malicious"]').click();
 await scene('Malicious remittance instruction','#demo',10);await live();
 const verdict=await page.locator('#verdict').innerText();
 await scene(`Actual malicious-invoice model outcome: ${verdict}`,'.demo-grid',20);
 if(!verdict.includes('DENIED')){await page.locator('#inject-proposal').click();await page.locator('#verdict').waitFor();await scene('Explicit injected control because this model resisted','.demo-grid',10);}
 await page.locator('.source-record summary').click();await scene('Separate source policy and actual model prompt','.source-record',20);
 await scene('Three captured proposals through real CRE CLI and local Solidity','#evidence',22);
 await page.goto('https://velum.aethe.me/lab.html',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Swap the recipient',exact:true}).click();await page.locator('#lab-run').click();
 await page.waitForFunction(()=>document.querySelector('#lab-progress').textContent.includes('Experiment complete'),undefined,{timeout:35000});
 assert.equal(await page.locator('#lab-delivery').innerText(),'Rejected');
 await scene('Actual browser EVM rejects changed payment commitment','.lab-layout',18);
 await page.getByRole('button',{name:'Make the token fail',exact:true}).click();await page.locator('#lab-run').click();
 await page.waitForFunction(()=>document.querySelector('#lab-progress').textContent.includes('Experiment complete'),undefined,{timeout:35000});
 assert.match(await page.locator('#lab-state').innerText(),/Approved/);
 await scene('Failed token transfer restores authorization','.lab-layout',15);
 await page.goto('https://velum.aethe.me/desk.html',{waitUntil:'networkidle'});await page.locator('#sepolia-proof').waitFor({state:'visible'});
 await scene('Separate original batch: real Sepolia receipts, mock-forwarder boundary','#sepolia-proof',15);
 await page.goto('https://velum.aethe.me',{waitUntil:'networkidle'});await scene('Close: private policy and explicit prototype scope','.boundary',15);
}finally{await context.close();await video.saveAs('artifacts/velum-agent-demo-footage.webm');await browser.close();writeFileSync('artifacts/agent-demo-cues.json',JSON.stringify({note:'Silent screen footage for human narration. Actual live calls shown. Not submission-ready.',cues},null,2)+'\n');}
