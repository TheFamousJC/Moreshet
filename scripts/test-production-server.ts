import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const port = await new Promise<number>((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address();
    assert.ok(address && typeof address === 'object');
    const selected = address.port;
    probe.close((error) => error ? reject(error) : resolve(selected));
  });
});

const child = spawn(process.execPath, ['dist/server.js'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'production', PORT: String(port), APP_URL: `https://moreshetglobal.test`, APP_VERSION: 'stage4f-test',
    SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key-long-enough', SUPABASE_SECRET_KEY: 'secret-key-different-and-long',
    HERZL_MODE: 'live', HERZL_PROVIDER: 'openai', OPENAI_API_KEY: '', TRUST_PROXY: 'false',
  },
});

let output = '';
child.stdout.on('data', (chunk) => { output += chunk.toString(); });
child.stderr.on('data', (chunk) => { output += chunk.toString(); });

try {
  const deadline = Date.now() + 10_000;
  while (!output.includes('Moreshet running')) {
    if (child.exitCode !== null) throw new Error(`Production server stopped early:\n${output}`);
    if (Date.now() > deadline) throw new Error(`Production server did not start:\n${output}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const health = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.headers.get('x-powered-by'), null);
  const body = await health.json() as { status: string; version: string; modes: { herzl: string }; aiConfiguration: { liveRequested: boolean; credentialConfigured: boolean; fallbackActive: boolean } };
  assert.deepEqual({ status: body.status, version: body.version }, { status: 'ok', version: 'stage4f-test' });
  assert.equal(body.modes.herzl, 'simulator');
  assert.deepEqual(body.aiConfiguration, { liveRequested: true, credentialConfigured: false, fallbackActive: true });

  const chat = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Tell me about Herzl.', language: 'en', cityId: 'budapest', organization: '3sci' }),
  });
  assert.equal(chat.status, 200);
  const chatBody = await chat.json() as { reply: string; mode: string; provider: string };
  assert.ok(chatBody.reply.length > 0);
  assert.equal(chatBody.mode, 'simulator');
  assert.ok(['openai', 'gemini'].includes(chatBody.provider));

  const oversizedChat = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'x'.repeat(601) }),
  });
  assert.equal(oversizedChat.status, 400);

  const cms = await fetch(`http://127.0.0.1:${port}/cms`);
  assert.equal(cms.status, 200);
  assert.equal(cms.headers.get('cache-control'), 'no-store');
  assert.equal(cms.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  console.log('Stage 4F production server smoke test PASS: startup validation, health and CMS security headers.');
} finally {
  child.kill();
  await new Promise<void>((resolve) => child.once('exit', () => resolve()));
}
