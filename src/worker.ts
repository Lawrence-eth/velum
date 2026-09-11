import { fixture, scenarios, type Scenario } from './fixtures';
import { bundleSchema, evaluate, paymentCommitment } from './policy';

type Env = { ASSETS: { fetch(request: Request): Promise<Response> }; INVOICE_API_TOKEN?: string };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health' && request.method === 'GET') return json({ service: 'VeilPay', mode: 'synthetic-demo', creNetworkDeployment: false });
    if (url.pathname.startsWith('/api/private/invoice/')) {
      if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      if (!env.INVOICE_API_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.INVOICE_API_TOKEN}`) return json({ error: 'Unauthorized' }, 401);
      const scenario = url.pathname.split('/').at(-1) as Scenario;
      if (!scenarios.includes(scenario)) return json({ error: 'Unknown fixture' }, 404);
      return json(fixture(scenario, Math.floor(Date.now() / 1000)));
    }
    if (url.pathname === '/api/preview' && request.method === 'POST') {
      // Public preview accepts only scenario choices and synthetic knobs, never real invoices.
      try {
        const raw = await request.text();
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
      } catch { return json({ error: 'Invalid preview input' }, 400); }
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  },
};
