import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

process.env.NODE_ENV = 'test';
process.env.NARRATION_WORKER_SECRET = 'worker-test-secret-that-is-longer-than-32-characters';
const { googleBearerHeaders, validateSynthesisBody, verifySignedRequest } = await import('../server/narrationWorker.js');
const { googlePronunciations } = await import('../src/lib/pronunciation.js');

const body = Buffer.from(JSON.stringify({
  transcript: 'A reviewed English narration.',
  language: 'en',
  voice: 'en-GB-Chirp3-HD-Aoede',
  speakingRate: 1,
  pronunciations: [{ phrase: 'English', encoding: 'ipa', pronunciation: 'ˈɪŋɡlɪʃ', reviewerNote: '' }],
}));
const timestamp = String(Date.now());
const nonce = randomUUID();
const signature = createHmac('sha256', process.env.NARRATION_WORKER_SECRET)
  .update(`${timestamp}.${nonce}.${body.toString('utf8')}`)
  .digest('hex');
const headers = { 'x-tudela-timestamp': timestamp, 'x-tudela-nonce': nonce, 'x-tudela-signature': signature };

assert.equal(verifySignedRequest(body, headers), true, 'A correctly signed request must be accepted.');
assert.equal(verifySignedRequest(body, headers), false, 'A nonce must not be accepted twice.');
assert.equal(verifySignedRequest(Buffer.from(`${body}changed`), { ...headers, 'x-tudela-nonce': randomUUID() }), false, 'Body tampering must invalidate the signature.');
const validated = validateSynthesisBody(JSON.parse(body.toString()));
assert.equal(validated.voice, 'en-GB-Chirp3-HD-Aoede');
assert.equal(validated.pronunciations[0].phrase, 'English');
assert.deepEqual(googlePronunciations('en', validated.pronunciations), [{ phrase: 'English', phoneticEncoding: 'PHONETIC_ENCODING_IPA', pronunciation: 'ˈɪŋɡlɪʃ' }]);
assert.deepEqual(googlePronunciations('he', [{ phrase: 'מודיעין', encoding: 'spoken_hint', pronunciation: 'mo-dee-een', reviewerNote: '' }]), [], 'Unsupported languages must not send custom pronunciations to Google.');
assert.throws(() => validateSynthesisBody({ transcript: 'English text', language: 'en', voice: 'en-GB-Chirp3-HD-Aoede', speakingRate: 1, pronunciations: [{ phrase: 'Missing', encoding: 'ipa', pronunciation: 'test' }] }), /not present/);
assert.throws(() => validateSynthesisBody({ transcript: 'Test', language: 'en', voice: 'he-IL-Chirp3-HD-Aoede', speakingRate: 1 }), /Unsupported voice/);
assert.throws(() => validateSynthesisBody({ transcript: 'Test', language: 'ru', voice: 'ru-RU-Chirp3-HD-Aoede', speakingRate: 1 }), /Unsupported pilot narration language/);
assert.throws(() => validateSynthesisBody({ transcript: 'Test', language: 'en', voice: 'en-GB-Chirp3-HD-Aoede', speakingRate: 2 }), /speaking rate/);
assert.deepEqual(googleBearerHeaders('temporary-access-token'), { Authorization: 'Bearer temporary-access-token', 'Content-Type': 'application/json' });
assert.throws(() => googleBearerHeaders(''), /did not provide an access token/);

const dockerfile = await readFile(new URL('../Dockerfile.narration-worker', import.meta.url), 'utf8');
assert.match(dockerfile, /COPY src\/lib\/pronunciation\.ts/, 'The worker image must include its pronunciation helper.');
assert.match(dockerfile, /COPY src\/types\.ts/, 'The worker image must include the shared pronunciation types.');
assert.match(dockerfile, /COPY --from=build \/app\/dist\/src/, 'The worker runtime must include compiled shared modules.');
assert.match(dockerfile, /dist\/server\/narrationWorker\.js/, 'The worker runtime must start the folder-preserving compiled entry point.');

console.log('Narration worker signature, replay, tampering and input checks passed without a paid API call.');
