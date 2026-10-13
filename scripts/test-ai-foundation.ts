import assert from 'node:assert/strict';
import { buildHerzlPrompt, createHerzlDailyBudget, generateHerzlResponse, herzlDailyLimitMessage, loadHerzlProviderConfig, parseHerzlRequest } from '../server/herzlProvider.js';
import { citedHerzlSources } from '../server/herzlGrounding.js';

const simulator = loadHerzlProviderConfig({ HERZL_MODE: 'simulator' });
assert.equal(simulator.mode, 'simulator');
assert.equal(simulator.provider, 'openai');
assert.equal(simulator.model, 'gpt-5.6-luna');
assert.equal(simulator.maxInputCharacters, 600);
assert.equal(simulator.dailyRequestLimit, 300);

let currentDay = new Date('2026-08-10T12:00:00Z');
const budget = createHerzlDailyBudget(2, () => currentDay);
assert.equal(budget.tryConsume(), true);
assert.equal(budget.tryConsume(), true);
assert.equal(budget.tryConsume(), false);
currentDay = new Date('2026-08-11T00:00:01Z');
assert.equal(budget.tryConsume(), true, 'The in-memory safety cap must reset on the next UTC day.');

const parsed = parseHerzlRequest({
  message: '  Tell me about this stop.  ',
  language: 'fr',
  cityId: 'budapest',
  tourId: 'tour-1',
  organization: '3sci',
  contentSource: 'shared',
  history: [
    { sender: 'user', text: 'First' },
    { sender: 'herzl', text: 'Second' },
    { sender: 'invalid', text: '' },
  ],
}, simulator);
assert.equal(parsed.message, 'Tell me about this stop.');
assert.equal(parsed.language, 'fr');
assert.equal(parsed.contentSource, 'shared');
assert.equal(parsed.history.length, 2);
assert.match(buildHerzlPrompt(parsed), /City ID: budapest/);
assert.match(buildHerzlPrompt(parsed), /Tour ID: tour-1/);
assert.throws(() => parseHerzlRequest({ message: 'x'.repeat(601) }, simulator), /600 characters/);
assert.throws(() => parseHerzlRequest({ message: '   ' }, simulator), /required/);
assert.equal(parseHerzlRequest({ message: 'Demo request', contentSource: 'demo' }, simulator).contentSource, 'demo');
assert.equal(parseHerzlRequest({ message: 'Untrusted request', contentSource: 'invalid' }, simulator).contentSource, 'demo');
assert.match(herzlDailyLimitMessage('en'), /daily limit/);
assert.match(herzlDailyLimitMessage('fr'), /limite quotidienne/);

const gemini = loadHerzlProviderConfig({ HERZL_MODE: 'live', HERZL_PROVIDER: 'gemini', GEMINI_MODEL: 'gemini-test' });
assert.deepEqual({ mode: gemini.mode, provider: gemini.provider, model: gemini.model }, { mode: 'live', provider: 'gemini', model: 'gemini-test' });

const liveOpenAi = loadHerzlProviderConfig({
  HERZL_MODE: 'live', HERZL_PROVIDER: 'openai', OPENAI_MODEL: 'test-model',
  HERZL_MAX_OUTPUT_TOKENS: '300', HERZL_TIMEOUT_MS: '5000',
});
let capturedBody: Record<string, any> | undefined;
const mockFetch: typeof fetch = async (_input, init) => {
  capturedBody = JSON.parse(String(init?.body || '{}'));
  return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: 'Verified test reply.' }] }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
const reply = await generateHerzlResponse('System rules', 'Visitor question', liveOpenAi, { OPENAI_API_KEY: 'test-key' }, mockFetch);
assert.equal(reply, 'Verified test reply.');
assert.equal(capturedBody?.model, 'test-model');
assert.equal(capturedBody?.store, false);
assert.equal(capturedBody?.max_output_tokens, 300);
assert.equal(capturedBody?.reasoning?.effort, 'low');
assert.equal(capturedBody?.text?.verbosity, 'low');
await assert.rejects(() => generateHerzlResponse('System', 'Prompt', simulator, {}), /SIMULATION_MODE/);

assert.deepEqual(citedHerzlSources('Supported fact [S2].', [
  { marker: 'S1', title: 'Unused source', url: 'https://example.com/one' },
  { marker: 'S2', title: 'Cited source', url: 'https://example.com/two' },
]), [{ title: 'Cited source', url: 'https://example.com/two' }], 'Only markers present in the answer may be shown as citations.');

console.log('Stage 5 AI provider foundation checks passed.');
