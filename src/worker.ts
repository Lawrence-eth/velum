import { fixture, scenarios, type Scenario } from './fixtures';
import { bundleSchema, evaluate, paymentCommitment } from './policy';
import { batchFixture, evaluateBatch } from './batch';

type Env = { ASSETS: { fetch(request: Request): Promise<Response> }; INVOICE_API_TOKEN?: string };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
async function authorized(request: Request, token?: string): Promise<boolean> {
  if (!token) return false;
  const encoder = new TextEncoder();
  const actual = encoder.encode(request.headers.get('Authorization') || '');
  const expected = encoder.encode(`Bearer ${token}`);
  if (actual.length !== expected.length) return false;
  // WebCrypto HMAC verification avoids a secret-dependent JavaScript comparison.
  const key = await crypto.subtle.importKey('raw', encoder.encode(token), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign','verify']);
  const signature = await crypto.subtle.sign('HMAC', key, expected);
  return crypto.subtle.verify('HMAC', key, signature, actual);
}
async function boundedText(request: Request, limit = 1024) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
  return new TextDecoder().decode(bytes);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health' && request.method === 'GET') return json({ service: 'Velum', mode: 'synthetic-demo', creNetworkDeployment: false });
    if (url.pathname === '/api/private/batch' && request.method === 'GET') {
      if (!await authorized(request, env.INVOICE_API_TOKEN)) return json({ error: 'Unauthorized' }, 401);
      return json(batchFixture(Math.floor(Date.now() / 1000)));
    }
    if (url.pathname === '/api/batch-preview' && request.method === 'GET') {
      const budget = url.searchParams.has('budget') ? Number(url.searchParams.get('budget')) : 6000;
      if (!Number.isSafeInteger(budget) || budget < 0 || budget > 20000) return json({ error: 'Budget must be an integer from 0 to 20000' }, 400);
      const now = Math.floor(Date.now() / 1000), batch = batchFixture(now, budget), result = evaluateBatch(batch, now);
      return json({ mode: 'policy-preview', synthetic: true, creExecution: false, snapshotAt: batch.snapshotAt, policyVersion: batch.policyVersion, batchId: batch.batchId, manifest: result.manifest, encodedPayload: result.encodedPayload, details: result.details, approvedAmount: result.approvedAmount, rejectedAmount: result.rejectedAmount, isolatedAmount: result.isolatedAmount,
        publicReceipt: result.decisions.map(d => ({ ...d, expiresAt: d.expiresAt.toString() })),
        disclosure: { private: ['vendor identity','invoice reference','purchase-order number','approval limit','remaining budget','rejection reasons'], public: ['batch ID','ordered payment commitment','request IDs','approval booleans','expiry'], settlement: ['token','recipient','amount'] },
      });
    }
    if (url.pathname.startsWith('/api/private/invoice/')) {
      if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      if (!await authorized(request, env.INVOICE_API_TOKEN)) return json({ error: 'Unauthorized' }, 401);
      const scenario = url.pathname.split('/').at(-1) as Scenario;
      if (!scenarios.includes(scenario)) return json({ error: 'Unknown fixture' }, 404);
      return json(fixture(scenario, Math.floor(Date.now() / 1000)));
    }
    if (url.pathname === '/api/preview' && (request.method === 'GET' || request.method === 'POST')) {
      // Public preview accepts only scenario choices and synthetic knobs, never real invoices.
      try {
        const raw = request.method === 'GET'
          ? JSON.stringify({ scenario: url.searchParams.get('scenario'), ...(url.searchParams.has('limit') ? { limit: Number(url.searchParams.get('limit')) } : {}) })
          : await boundedText(request);
        if (raw.length > 1024) return json({ error: 'Request too large' }, 413);
        const input = JSON.parse(raw);
        if (!scenarios.includes(input.scenario)) return json({ error: 'Unknown scenario' }, 400);
        const now = Math.floor(Date.now() / 1000);
        const bundle = fixture(input.scenario, now);
        if (input.limit !== undefined) {
          if (!Number.isSafeInteger(input.limit) || input.limit < 0 || input.limit > 20000) return json({ error: 'Limit must be an integer from 0 to 20000' }, 400);
          bundle.policy.maxInvoiceAmount = (BigInt(input.limit) * 1000000n).toString();
        }
        const parsed = bundleSchema.parse(bundle);
        return json({ mode: 'policy-preview', synthetic: true, creExecution: false, ...evaluate(parsed, now), requestId: parsed.request.id, commitment: paymentCommitment(parsed.request), publicFields: { expiresAt: parsed.request.expiresAt }, previewInvoice: parsed.invoice, previewPolicy: parsed.policy });
      } catch (error) { return error instanceof Error && error.message === 'BODY_TOO_LARGE' ? json({ error: 'Request too large' }, 413) : json({ error: 'Invalid preview input' }, 400); }
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  },
};
