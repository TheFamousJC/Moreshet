import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const DEFAULT_BASE_URL = 'https://moreshet-production.up.railway.app';

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

async function request(url, expectedType, timeoutMs) {
  const started = performance.now();
  const response = await fetch(url, {
    headers: {
      Accept: expectedType === 'json' ? 'application/json' : 'text/html',
      'User-Agent': 'Moreshet-Pilot-Load-Acceptance/1.0',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}: ${body.slice(0, 160)}`);
  if (expectedType === 'html' && !body.includes('Moreshet')) throw new Error(`${url} did not return the visitor application.`);
  if (expectedType === 'json') {
    try {
      return { durationMs: performance.now() - started, body: JSON.parse(body) };
    } catch {
      throw new Error(`${url} did not return JSON.`);
    }
  }
  return { durationMs: performance.now() - started, body: null };
}

async function visitorJourney(baseUrl, visitorNumber, timeoutMs) {
  const publicUrl = `${baseUrl}/api/public/content?organization=3sci&language=en`;
  const [homepage, catalogue, readiness] = await Promise.all([
    request(`${baseUrl}/`, 'html', timeoutMs),
    request(publicUrl, 'json', timeoutMs),
    request(`${baseUrl}/api/ready`, 'json', timeoutMs),
  ]);
  if (readiness.body?.status !== 'ready') throw new Error(`Visitor ${visitorNumber}: readiness was not ready.`);
  if (catalogue.body?.schemaVersion !== 1) throw new Error(`Visitor ${visitorNumber}: catalogue schema was invalid.`);
  const counts = {
    cities: catalogue.body?.cities?.length,
    tours: catalogue.body?.tours?.length,
    stops: catalogue.body?.sites?.length,
  };
  if (counts.cities !== 11 || counts.tours !== 11 || counts.stops !== 55) {
    throw new Error(`Visitor ${visitorNumber}: expected 11 cities, 11 tours and 55 stops; received ${JSON.stringify(counts)}.`);
  }
  return [homepage.durationMs, catalogue.durationMs, readiness.durationMs];
}

async function main() {
  const baseUrl = String(process.env.MORESHET_LOAD_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const concurrency = positiveInteger(process.env.MORESHET_LOAD_CONCURRENCY, 10);
  const timeoutMs = positiveInteger(process.env.MORESHET_LOAD_TIMEOUT_MS, 15_000);
  const p95LimitMs = positiveInteger(process.env.MORESHET_LOAD_P95_LIMIT_MS, 5_000);
  if (concurrency > 50) throw new Error('Refusing to exceed the controlled pilot ceiling of 50 simultaneous visitors.');

  const startedAt = new Date();
  const settled = await Promise.allSettled(
    Array.from({ length: concurrency }, (_, index) => visitorJourney(baseUrl, index + 1, timeoutMs)),
  );
  const failures = settled.filter((result) => result.status === 'rejected');
  const durations = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const p95Ms = durations.length ? percentile(durations, 0.95) : null;
  const maximumMs = durations.length ? Math.max(...durations) : null;
  const passed = failures.length === 0 && p95Ms !== null && p95Ms <= p95LimitMs;
  const report = {
    schemaVersion: 1,
    test: 'Moreshet controlled pilot read-only load acceptance',
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    baseUrl,
    simultaneousVisitors: concurrency,
    requestsPerVisitor: 3,
    totalRequests: concurrency * 3,
    paidAiRequests: 0,
    mutations: 0,
    expectedCatalogue: { cities: 11, tours: 11, stops: 55 },
    successfulVisitors: concurrency - failures.length,
    failedVisitors: failures.length,
    p95Milliseconds: p95Ms === null ? null : Math.round(p95Ms),
    maximumMilliseconds: maximumMs === null ? null : Math.round(maximumMs),
    acceptanceP95LimitMilliseconds: p95LimitMs,
    result: passed ? 'PASS' : 'FAIL',
    failures: failures.map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason)),
  };

  const reportDirectory = path.resolve('Docs', 'pilot-load-reports');
  fs.mkdirSync(reportDirectory, { recursive: true });
  const stamp = startedAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const reportPath = path.join(reportDirectory, `pilot-load-${stamp}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`${passed ? 'PILOT LOAD ACCEPTANCE PASSED' : 'PILOT LOAD ACCEPTANCE FAILED'}\n${JSON.stringify(report, null, 2)}\nReport: ${reportPath}`);
  if (!passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
