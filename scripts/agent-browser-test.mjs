import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const base=process.env.VELUM_TEST_URL||'https://velum.aethe.me';
const browser=await chromium.launch({headless:true,args:['--no-sandbox',...(process.env.VELUM_TEST_IP?[`--host-resolver-rules=MAP ${new URL(base).hostname} ${process.env.VELUM_TEST_IP}`]:[])]});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(base,{waitUntil:'networkidle'});
 await page.locator('#invoice-text').filter({hasText:'NS-101'}).waitFor();
 await page.locator('#run-agent').click();await page.locator('#verdict').waitFor({timeout:65000});assert.match(await page.locator('#run-source').innerText(),/LIVE MODEL/);assert.match(await page.locator('#verdict').innerText(),/ELIGIBLE/);
 await page.waitForTimeout(5500);
 await page.locator('[data-scenario="malicious"]').click();assert.ok(await page.locator('#attack-note').isVisible());
 await page.locator('#run-agent').click();await page.locator('#verdict').waitFor({timeout:65000});assert.match(await page.locator('#run-source').innerText(),/LIVE MODEL/);
 await page.screenshot({path:'evidence/agent-live-model.png',fullPage:true});
 await page.locator('#inject-proposal').click();await page.locator('#verdict').waitFor();assert.match(await page.locator('#verdict').innerText(),/DENIED/);assert.match(await page.locator('#run-source').innerText(),/INJECTED/);
 const download=page.waitForEvent('download');await page.locator('#download-agent').click();const d=await download;assert.equal(d.suggestedFilename(),'velum-agent-operator-trace.json');
 await page.screenshot({path:'evidence/agent-desktop.png',fullPage:true});
 await page.locator('[data-scenario="clean"]').click();assert.ok(await page.locator('#verdict').isHidden());assert.ok(await page.locator('#download-agent').isHidden());
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'evidence/agent-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 const result={checkedAt:new Date().toISOString(),site:base,checks:['live clean model produces eligible proposal','live malicious model output displayed without assuming attack success','invoice scenario switches','injected proposal denied by live backend','injected source clearly labeled','operator trace download','scenario change clears stale decision','mobile no horizontal overflow','no browser exceptions']};writeFileSync('evidence/agent-browser.json',JSON.stringify(result,null,2)+'\n');console.log('9 agent browser checks passed');
}finally{await browser.close()}
