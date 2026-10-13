import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { monitorProduction } from './monitor-production.mjs';

const healthy = {
  health: {
    status: 'ok', build: '1234abc56789', uptimeSeconds: 123,
    modes: { herzl: 'live', provider: 'openai', narration: 'simulator' },
    aiConfiguration: { liveRequested: true, credentialConfigured: true, fallbackActive: false },
    aiBudget: { dailyRequestLimit: 25, enforcement: 'database-and-process' },
  },
  ready: { status: 'ready', dependency: 'supabase' },
};

async function withServer(responses, callback) {
  const server = createServer((request, response) => {
    const item = request.url === '/api/health' ? responses.health : responses.ready;
    response.writeHead(item.httpStatus || 200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(item.body || item));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

await withServer(healthy, async (baseUrl) => {
  const result = await monitorProduction({ baseUrl, attempts: 1, retryDelayMs: 0 });
  assert.equal(result.build, healthy.health.build);
  assert.equal(result.readiness, 'ready');
});

await withServer({ ...healthy, health: { ...healthy.health, modes: { ...healthy.health.modes, herzl: 'simulator' } } }, async (baseUrl) => {
  await assert.rejects(() => monitorProduction({ baseUrl, attempts: 1, retryDelayMs: 0 }), /Ask Benjamin mode/);
});

await withServer({ ...healthy, ready: { httpStatus: 503, body: { status: 'not_ready', dependency: 'supabase' } } }, async (baseUrl) => {
  await assert.rejects(() => monitorProduction({ baseUrl, attempts: 1, retryDelayMs: 0 }), /HTTP 503/);
});

console.log('Production monitor health, policy-drift and dependency-failure tests passed.');
