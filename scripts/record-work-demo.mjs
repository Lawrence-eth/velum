import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('artifacts/work-demo-take',{recursive:true});
const browser=await chromium.launch({args:process.env.VELUM_TEST_IP?[`--host-resolver-rules=MAP velum.aethe.me ${process.env.VELUM_TEST_IP}`]:[]});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'artifacts/work-demo-take',size:{width:1440,height:900}}});
const page=await context.newPage(),video=page.video(),start=Date.now(),cues=[];
async function scene(label,selector,seconds){cues.push({label,seconds:Math.round((Date.now()-start)/1000)});console.log(label);await page.locator(selector).first().evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.waitForTimeout(seconds*1000);}
try{
 await page.goto('https://velum.aethe.me',{waitUntil:'networkidle'});await scene('Agreed work and accepted revision','.work-document-head',18);await scene('A genuine successful build for the wrong revision','.delivery-heading',15);
 await page.locator('#review-work').click();await page.locator('#work-state').filter({hasText:'Held'}).waitFor({timeout:110000});await scene('Actual CRE decision: held, zero transferred','#work-result',20);
 await page.locator('#use-accepted').click();await page.locator('#work-state').filter({hasText:'Paid'}).waitFor({timeout:110000});assert.equal(await page.locator('#work-paid').innerText(),'$2,400');await scene('Accepted revision releases one test payment','#work-result',24);
 await scene('Both attempts remain in the work-order history','.work-history',18);await page.reload({waitUntil:'networkidle'});await page.locator('#work-state').filter({hasText:'Paid'}).waitFor();await page.locator('#duplicate-work').click();await page.getByText('This work order is already paid. A new request cannot pay it again.',{exact:true}).waitFor();await scene('Reload, then reject a duplicate payment','#work-result',22);
 await page.locator('.work-decision .execution-note summary').click();await scene('Journal-backed local settlement and honest simulation boundaries','.work-decision .execution-note',18);
 await page.goto('https://velum.aethe.me/evidence.html',{waitUntil:'networkidle'});await page.locator('#work-records tbody tr').first().waitFor();await scene('Actual GitHub, CRE and settlement evidence','#work-proof',20);
}finally{await context.close();await video.saveAs('artifacts/velum-work-demo-footage.webm');await browser.close();writeFileSync('artifacts/work-demo-cues.json',JSON.stringify({note:'Silent footage requiring human narration. Live GitHub inside actual CRE CLI; journal-backed local Solidity, synthetic acceptance and mock identity.',cues},null,2)+'\n');}
