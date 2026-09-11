import { describe, expect, test } from 'bun:test';
import { fixture } from '../src/fixtures';
import { bundleSchema, evaluate, paymentCommitment } from '../src/policy';
import worker from '../src/worker';
const now = 1800000000;
describe('Invoice policy', () => {
  test('approves an invoice matching the purchase order', () => expect(evaluate(fixture('approved', now), now)).toEqual({ approved: true, reasons: [] }));
  for (const scenario of ['over-limit', 'wrong-recipient', 'duplicate'] as const) {
    test(`rejects ${scenario}`, () => expect(evaluate(fixture(scenario, now), now).approved).toBe(false));
  }
  test('exact approval limit is accepted, one micro-unit above is rejected', () => {
    const b = fixture('approved', now);
    b.policy.maxInvoiceAmount = b.invoice.amount;
    expect(evaluate(b, now).approved).toBe(true);
    b.invoice.amount = b.request.amount = (BigInt(b.invoice.amount) + 1n).toString();
    expect(evaluate(b, now).approved).toBe(false);
  });
  test('rejects disabled policy, insufficient PO, unknown vendor, currency and token', () => {
    const changes = [
      (b: ReturnType<typeof fixture>) => { b.policy.enabled = false; },
      (b: ReturnType<typeof fixture>) => { b.policy.remainingPurchaseOrder = '1'; },
      (b: ReturnType<typeof fixture>) => { b.invoice.vendorId = 'other'; },
      (b: ReturnType<typeof fixture>) => { b.invoice.currency = 'EUR'; },
      (b: ReturnType<typeof fixture>) => { b.request.token = '0x5555555555555555555555555555555555555555'; },
      (b: ReturnType<typeof fixture>) => { b.request.amount = '1'; },
      (b: ReturnType<typeof fixture>) => { b.request.amount = b.invoice.amount = '0'; },
    ];
    for (const change of changes) { const b = fixture('approved', now); change(b); expect(evaluate(b, now).approved).toBe(false); }
  });
  test('rejects expiry at current time and excessive lifetime', () => {
    const b = fixture('approved', now);
    b.request.expiresAt = now;
    expect(evaluate(b, now).approved).toBe(false);
    b.request.expiresAt = now + 86401;
    expect(evaluate(b, now).approved).toBe(false);
  });
  test('does not accept negative, floating, exponent or unsafe amount encodings', () => {
    for (const amount of ['-1', '1.2', '1e6', '01', '', '9'.repeat(37)]) {
      const b = fixture('approved', now); b.request.amount = amount;
      expect(bundleSchema.safeParse(b).success).toBe(false);
    }
  });
  test('commitment binds chain, receiver, recipient, token, amount and expiry', () => {
    const b = fixture('approved', now), original = paymentCommitment(b.request);
    for (const key of ['consumer', 'recipient', 'token'] as const) {
      const changed = { ...b.request, [key]: '0x5555555555555555555555555555555555555555' as const };
      expect(paymentCommitment(changed)).not.toBe(original);
    }
    expect(paymentCommitment({ ...b.request, chainId: 1 })).not.toBe(original);
    expect(paymentCommitment({ ...b.request, amount: '1' })).not.toBe(original);
    expect(paymentCommitment({ ...b.request, expiresAt: now + 2 })).not.toBe(original);
  });
});
describe('Demo API', () => {
  const env = { INVOICE_API_TOKEN: 'test-only', ASSETS: { fetch: async () => new Response('asset') } };
  test('private fixture rejects missing or wrong credential', async () => {
    const url = 'https://example.com/api/private/invoice/approved';
    expect((await worker.fetch(new Request(url), env)).status).toBe(401);
    expect((await worker.fetch(new Request(url, { headers: { Authorization: 'Bearer bad' } }), env)).status).toBe(401);
    expect((await worker.fetch(new Request(url, { headers: { Authorization: 'Bearer test-only' } }), env)).status).toBe(200);
  });
  test('public preview is labelled and never claims CRE execution', async () => {
    const response = await worker.fetch(new Request('https://example.com/api/preview', { method: 'POST', body: JSON.stringify({ scenario: 'approved', limit: 2000 }) }), env);
    const data = await response.json() as any;
    expect(data.approved).toBe(false); expect(data.creExecution).toBe(false); expect(data.synthetic).toBe(true);
  });
  test('read-only GET preview works with public synthetic query parameters', async () => {
    const response = await worker.fetch(new Request('https://example.com/api/preview?scenario=approved&limit=5000'), env);
    const data = await response.json() as any;
    expect(response.status).toBe(200); expect(data.approved).toBe(true); expect(data.creExecution).toBe(false);
    const invalid = await worker.fetch(new Request('https://example.com/api/preview?scenario=approved&limit=NaN'), env);
    expect(invalid.status).toBe(400);
  });
});
