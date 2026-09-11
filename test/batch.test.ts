import { expect, test } from 'bun:test';
import { batchFixture, evaluateBatch, batchManifest } from '../src/batch';
import worker from '../src/worker';
const now = 1800000000;
test('shared budget and invoice identity prevent independent-check overspending', () => {
  const r = evaluateBatch(batchFixture(now), now);
  expect(r.decisions.map(d => d.approved)).toEqual([true, false, false, false, true]);
  expect(r.approvedAmount).toBe('5800000000');
  expect(r.isolatedAmount).toBe('13800000000');
  expect(r.details[1].reasons).toContain('Invoice exceeds remaining purchase order');
  expect(r.details[3].reasons).toContain('Duplicate invoice in this batch');
});
test('larger PO allows second legitimate invoice but not duplicate or changed wallet', () => {
  const r = evaluateBatch(batchFixture(now, 10000), now);
  expect(r.decisions.map(d => d.approved)).toEqual([true, true, false, false, true]);
  expect(r.approvedAmount).toBe('9600000000');
});
test('manifest binds ordering and amounts', () => {
  const b = batchFixture(now), before = batchManifest(b);
  b.entries.reverse(); expect(batchManifest(b)).not.toBe(before);
  b.entries.reverse(); b.entries[0].bundle.request.amount = '1'; expect(batchManifest(b)).not.toBe(before);
});
test('rejects stale, future, inconsistent or mixed-domain snapshots', () => {
  expect(() => evaluateBatch(batchFixture(now), now + 121)).toThrow('Stale');
  expect(() => evaluateBatch(batchFixture(now + 1), now)).toThrow('future');
  const inconsistent = batchFixture(now); inconsistent.entries[1].bundle.policy.maxInvoiceAmount = '1';
  expect(() => evaluateBatch(inconsistent, now)).toThrow('Inconsistent');
  const mixed = batchFixture(now); mixed.entries[1].bundle.request.chainId = 1;
  expect(() => evaluateBatch(mixed, now)).toThrow('Mixed');
});
test('rejects duplicate request ids instead of creating ambiguous reports', () => {
  const b = batchFixture(now); b.entries[1].bundle.request.id = b.entries[0].bundle.request.id;
  expect(() => evaluateBatch(b, now)).toThrow('Duplicate request');
});
test('no denied row reserves funds and snapshots are not mutated', () => {
  const b = batchFixture(now), original = JSON.stringify(b);
  const r = evaluateBatch(b, now);
  expect(r.details[1].remaining).toBe(r.details[0].remaining);
  expect(r.details[3].remaining).toBe(r.details[0].remaining);
  expect(JSON.stringify(b)).toBe(original);
});
test('public report excludes sensitive invoice keys, labels, budget and reasons', () => {
  const r = evaluateBatch(batchFixture(now), now);
  const report = JSON.stringify({ manifest: r.manifest, payload: r.encodedPayload });
  for (const s of ['NS-101','Design sprint','Duplicate invoice','SYNTHETIC-STUDIO-07']) expect(report.includes(s)).toBe(false);
  // Changing a private budget without changing decisions does not alter the public report.
  expect(evaluateBatch(batchFixture(now,7000),now).encodedPayload).toBe(r.encodedPayload);
});
test('batch API is synthetic, validates budget, and private API requires authentication', async () => {
  const env = { ASSETS: { fetch: async () => new Response('asset') }, INVOICE_API_TOKEN: 'test' };
  const response = await worker.fetch(new Request('https://example.com/api/batch-preview?budget=6000'),env);
  const data = await response.json() as any;
  expect(data.creExecution).toBe(false); expect(data.approvedAmount).toBe('5800000000');
  expect((await worker.fetch(new Request('https://example.com/api/batch-preview?budget=-1'),env)).status).toBe(400);
  expect((await worker.fetch(new Request('https://example.com/api/private/batch'),env)).status).toBe(401);
});
test('streamed oversized body is rejected before unlimited buffering', async () => {
  const response = await worker.fetch(new Request('https://example.com/api/preview', { method:'POST', body:'x'.repeat(2048) }), { ASSETS:{fetch:async()=>new Response('')} });
  expect(response.status).toBe(413);
});
