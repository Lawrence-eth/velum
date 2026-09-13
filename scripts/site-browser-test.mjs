import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=process.env.VELUM_TEST_URL||'http://127.0.0.1:8787';
const browser=await chromium.launch({headless:true,args:process.env.VELUM_TEST_IP?[`--host-resolver-rules=MAP ${new URL(base).hostname} ${process.env.VELUM_TEST_IP}`]:[]});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const routes=[['/','Payments'],['/desk.html','Accounting'],['/lab.html','Controls'],['/evidence.html','Evidence']];
try{
 for(const [path,label] of routes){
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+path,{waitUntil:'networkidle'});
  assert.equal(await page.locator('h1').count(),1,path);assert.equal(await page.locator('nav[aria-label="Main navigation"] a').count(),4);
  assert.equal(await page.locator('nav a[aria-current="page"]').innerText(),label);
  assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(240, 241, 238)');
  if(path==='/desk.html'){assert.equal(await page.locator('#batch').count(),0);assert.equal(await page.locator('#ledger-open').count(),1)}
  if(path==='/evidence.html'){await page.locator('#agent-records tbody tr').first().waitFor();assert.equal(await page.locator('#agent-records tbody tr').count(),3);await page.locator('#sepolia-records .proof-cards').waitFor();assert.equal(await page.locator('#sepolia-records a[href*="/tx/"]').count(),3)}
  await page.screenshot({path:`evidence/site-${label.toLowerCase().replaceAll(' ','-')}-desktop.png`,fullPage:true});
  for(const width of [390,768]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path}: overflow at ${width}`);for(const name of ['Payments','Accounting','Controls','Evidence'])assert.ok(await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name,exact:true}).isVisible(),`${name} hidden at ${width}`)}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`evidence/site-${label.toLowerCase().replaceAll(' ','-')}-mobile.png`,fullPage:true});
 }
 // Navigate the complete product through the shared menu on mobile.
 for(const [path,label] of routes){await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:label,exact:true}).click();await page.waitForURL(url=>url.origin===new URL(base).origin&&url.pathname.replace(/\.html$/,'')===path.replace(/\.html$/,''));assert.equal(await page.locator('nav a[aria-current="page"]').innerText(),label)}
 assert.deepEqual(errors,[]);writeFileSync('evidence/site-browser.json',JSON.stringify({checkedAt:new Date().toISOString(),base,routes:routes.map(r=>r[0]),checks:['one page title and consistent shell','active navigation matches route','all navigation visible at 390 and 768px','no horizontal overflow','complete mobile navigation journey','accounting has one purpose','three recorded agent cases and three Sepolia transactions','no browser exceptions']},null,2)+'\n');console.log('Unified site checks passed across four pages and three viewport sizes');
}finally{await browser.close()}
