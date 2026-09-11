import worker from '../src/worker';
// Local-only fallback with identical Worker handler, for hosts without workerd support.
const env = {
  INVOICE_API_TOKEN: 'veilpay-local-synthetic-only',
  ASSETS: { async fetch(request: Request) {
    const path = new URL(request.url).pathname;
    if (!/^\/[a-zA-Z0-9._-]*$/.test(path)) return new Response('Not found', { status: 404 });
    const file = Bun.file(`public/${path === '/' ? 'index.html' : path.slice(1)}`);
    return await file.exists() ? new Response(file) : new Response('Not found', { status: 404 });
  } },
};
Bun.serve({ hostname: '127.0.0.1', port: 8787, fetch: request => worker.fetch(request, env) });
console.log('Synthetic fixture/demo server: http://127.0.0.1:8787');
