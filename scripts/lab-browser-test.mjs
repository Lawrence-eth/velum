import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=process.env.VELUM_TEST_URL||'http://127.0.0.1:8787';
const browser=await chromium.launch({headless:true,args:process.env.VELUM_TEST_IP?[`--host-resolver-rules=MAP velum.aethe.me ${process.env.VELUM_TEST_IP}`]:[]});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/lab.html',{waitUntil:'networkidle'});
 const titles=['Valid payment','Swap the recipient','Add one micro-unit','Reorder the decisions','Hide a held invoice','Use another workflow','Forge the sender','Replay the report','Make the token fail'];const results=[];
 for(let i=0;i<titles.length;i++){
 await page.getByRole('button',{name:titles[i],exact:true}).click();await page.locator('#lab-run').click();
 await page.waitForFunction(()=>document.querySelector('#lab-progress').textContent!=='Loading the local EVM and executing actual contract bytecode…',undefined,{timeout:35000});
 const message=await page.locator('#lab-progress').textContent();assert.match(message,/Experiment complete/,message);
 const delivery=await page.locator('#lab-delivery').textContent(),transfer=await page.locator('#lab-paid').textContent(),after=await page.locator('#lab-after').textContent();
 assert.equal(delivery,i===0||i===8?'Accepted':'Rejected',titles[i]);assert.equal(transfer,i===0||i===7?'Transferred':'No transfer',titles[i]);assert.equal(after,i===0||i===7?'$15,800':'$20,000',titles[i]);
 if(i===8)assert.match(await page.locator('#lab-state').textContent(),/Approved/);
 results.push({experiment:titles[i],delivery,transfer,after});
 }
 const download=page.waitForEvent('download');await page.locator('#lab-download').click();assert.equal((await download).suggestedFilename(),'velum-transfer-experiment.json');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 await page.screenshot({path:'evidence/lab-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'evidence/lab-desktop.png',fullPage:true});
 writeFileSync('evidence/lab-browser.json',JSON.stringify({success:true,recordedAt:new Date().toISOString(),base,mode:'Actual Solidity bytecode in browser-local EthereumJS EVM; no CRE or network execution',results,checks:['Nine actual EVM experiments','Expected token balances','Failed-transfer rollback','Download result','Mobile overflow','No page errors']},null,2)+'\n');console.log(JSON.stringify({success:true,results},null,2));
}finally{await browser.close();}
