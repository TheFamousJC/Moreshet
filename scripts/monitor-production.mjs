import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://moreshet-production.up.railway.app';

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function requiredEqual(actual, expected, label, problems) {
  if (actual !== expected) problems.push(`${label} expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}.`);
}

async function readJson(url, timeoutMs) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Moreshet-Production-Monitor/1.0' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}: ${body.slice(0, 240)}`);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${url} did not return JSON.`);
  }
}

export async function inspectProduction(options = {}) {
  const baseUrl = String(options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const timeoutMs = positiveInteger(options.timeoutMs, 12_000);
  const expected = {
    herzlMode: options.expectedHerzlMode || 'live',
    narrationMode: options.expectedNarrationMode || 'simulator',
    provider: options.expectedProvider || 'openai',
    dailyLimit: positiveInteger(options.expectedDailyLimit, 25),
    enforcement: options.expectedEnforcement || 'database-and-process',
  };
  const [health, readiness] = await Promise.all([
    readJson(`${baseUrl}/api/health`, timeoutMs),
    readJson(`${baseUrl}/api/ready`, timeoutMs),
  ]);
  const problems = [];
  requiredEqual(health.status, 'ok', 'Health status', problems);
  requiredEqual(readiness.status, 'ready', 'Readiness status', problems);
  requiredEqual(readiness.dependency, 'supabase', 'Readiness dependency', problems);
  requiredEqual(health.modes?.herzl, expected.herzlMode, 'Ask Benjamin mode', problems);
  requiredEqual(health.modes?.provider, expected.provider, 'Ask Benjamin provider', problems);
  requiredEqual(health.modes?.narration, expected.narrationMode, 'Narration mode', problems);
  requiredEqual(health.aiConfiguration?.liveRequested, expected.herzlMode === 'live', 'Live AI request configuration', problems);
  requiredEqual(health.aiConfiguration?.credentialConfigured, true, 'AI credential configuration', problems);
  requiredEqual(health.aiConfiguration?.fallbackActive, false, 'AI fallback state', problems);
  requiredEqual(health.aiBudget?.dailyRequestLimit, expected.dailyLimit, 'AI daily request limit', problems);
  requiredEqual(health.aiBudget?.enforcement, expected.enforcement, 'AI budget enforcement', problems);
  if (typeof health.build !== 'string' || !/^[a-f0-9]{7,12}$/i.test(health.build)) problems.push('Deployment build identifier is missing or invalid.');
  if (problems.length) throw new Error(problems.join(' '));
  return {
    checkedAt: new Date().toISOString(),
    baseUrl,
    build: health.build,
    uptimeSeconds: health.uptimeSeconds,
    askBenjamin: `${health.modes.herzl}/${health.modes.provider}`,
    narration: health.modes.narration,
    aiBudget: `${health.aiBudget.dailyRequestLimit}/${health.aiBudget.enforcement}`,
    readiness: readiness.status,
  };
}

export async function monitorProduction(options = {}) {
  const attempts = positiveInteger(options.attempts, 3);
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs ?? 10_000));
  const failures = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await inspectProduction(options);
    } catch (error) {
      failures.push(`Attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
      if (attempt < attempts && retryDelayMs) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  throw new Error(failures.join('\n'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  monitorProduction({
    baseUrl: process.env.MORESHET_MONITOR_URL,
    attempts: process.env.MORESHET_MONITOR_ATTEMPTS,
    retryDelayMs: process.env.MORESHET_MONITOR_RETRY_DELAY_MS,
    timeoutMs: process.env.MORESHET_MONITOR_TIMEOUT_MS,
    expectedHerzlMode: process.env.MORESHET_EXPECTED_HERZL_MODE,
    expectedNarrationMode: process.env.MORESHET_EXPECTED_NARRATION_MODE,
    expectedProvider: process.env.MORESHET_EXPECTED_AI_PROVIDER,
    expectedDailyLimit: process.env.MORESHET_EXPECTED_AI_DAILY_LIMIT,
    expectedEnforcement: process.env.MORESHET_EXPECTED_AI_ENFORCEMENT,
  }).then((result) => {
    console.log(`Moreshet production monitor PASS\n${JSON.stringify(result, null, 2)}`);
  }).catch((error) => {
    console.error(`Moreshet production monitor FAILED\n${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
}
