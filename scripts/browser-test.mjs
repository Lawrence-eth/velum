import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const base = process.env.VEILPAY_TEST_URL || 'http://127.0.0.1:8787';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Evaluate invoice' }).click();
  await page.getByText('Approved by the preview policy').waitFor();
  await page.locator('[data-scenario="over-limit"]').click();
  await page.getByRole('button', { name: 'Evaluate invoice' }).click();
  await page.getByText('Rejected by the preview policy').waitFor();
  assert.match(await page.locator('#result').textContent(), /private approval limit/);
  for (const scenario of ['wrong-recipient', 'duplicate']) {
    await page.locator(`[data-scenario="${scenario}"]`).click();
    await page.getByRole('button', { name: 'Evaluate invoice' }).click();
    await page.getByText('Rejected by the preview policy').waitFor();
  }
  await page.locator('[data-scenario="approved"]').click();
  await page.locator('#limit').fill('2000');
  await page.getByRole('button', { name: 'Evaluate invoice' }).click();
  await page.getByText('Rejected by the preview policy').waitFor();
  await page.locator('#limit').fill('5000');
  await page.getByRole('button', { name: 'Evaluate invoice' }).click();
  await page.getByText('Approved by the preview policy').waitFor();
  assert.match(await page.locator('#execution-status').textContent(), /approved: APPROVE/);
  assert.match(await page.locator('#execution-status').textContent(), /wrong-recipient: REJECT/);
  mkdirSync('evidence', { recursive: true });
  await page.screenshot({ path: 'evidence/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile horizontal overflow');
  await page.screenshot({ path: 'evidence/mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ success: true, base, checks: ['approval', 'over limit', 'wrong recipient', 'duplicate', 'changed threshold', 'recorded evidence visible', '390px mobile overflow', 'no page errors'] }, null, 2));
} finally { await browser.close(); }
