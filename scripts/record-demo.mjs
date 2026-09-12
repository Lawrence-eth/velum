import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('artifacts/demo-take',{recursive:true});
const browser=await chromium.launch({headless:true,args:process.env.VELUM_TEST_IP?[`--host-resolver-rules=MAP velum.aethe.me ${process.env.VELUM_TEST_IP}`]:[]});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'artifacts/demo-take',size:{width:1440,height:900}}});
const page=await context.newPage();const video=page.video();const start=Date.now();const cues=[];
async function scene(label,selector,seconds){cues.push({label,seconds:Math.round((Date.now()-start)/1000)});console.log(label);await page.locator(selector).first().evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.waitForTimeout(seconds*1000);}
try{
 await page.goto('https://velum.aethe.me',{waitUntil:'networkidle'});
 await scene('Opening: private contractor payment runs','.hero',12);
 await page.locator('#run-batch').click();await page.getByText('2 of 5 invoices approved').waitFor();
 await scene('Shared budget and duplicate decisions','#batch',20);
 await scene('Inspect held invoices','.batch-table-wrap',12);
 await page.locator('#operator-view').click({force:true});await scene('Private operator fields','.disclosure',10);await page.locator('#public-view').click({force:true});await page.waitForTimeout(12_000);
 await scene('Explain the actual privacy boundary','#privacy',25);
 await scene('CRE broadcast and payment explorer links','#sepolia-proof',25);
 await page.locator('#ledger-open').click();await page.locator('#ledger-content').waitFor({state:'visible'});await page.locator('#ledger-seed').click();await page.getByText('Two recorded Sepolia reservations loaded.',{exact:false}).waitFor();
 await scene('Persistent reservations awaiting reconciliation','#ledger',10);
 await page.locator('#ledger-reconcile').click();await page.getByText('Both finalized payments reconciled.',{exact:false}).waitFor({timeout:90000});
 await scene('Finalized Sepolia payments reconciled','#ledger-history',15);
 await page.reload({waitUntil:'networkidle'});await page.getByText('Your saved workspace has been restored.').waitFor();await page.locator('#ledger-sample').click();await page.getByText('5 synthetic invoice rows imported.',{exact:false}).waitFor();await page.locator('#ledger-review').click();await page.getByText('Review complete. Correct held rows or reserve the eligible invoices.').waitFor();await page.locator('#ledger-reserve').click();await page.getByText('$0 reserved in a new preview run.',{exact:false}).waitFor();
 await scene('Paid invoices cannot return in the next run','#ledger-decisions',20);
 await scene('Public source and execution evidence','#evidence',15);
}finally{await context.close();await video.saveAs('artifacts/velum-demo-footage.webm');await browser.close();writeFileSync('artifacts/demo-cues.json',JSON.stringify({note:'Silent screen footage for human narration. Not a submission-ready video.',cues},null,2)+'\n');}
