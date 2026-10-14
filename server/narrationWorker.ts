import { createHmac, timingSafeEqual } from 'node:crypto';
import express from 'express';
import { GoogleAuth } from 'google-auth-library';
import { googlePronunciations, normalizePronunciations } from '../src/lib/pronunciation.js';

const PORT = Number(process.env.PORT || 8080);
const SHARED_SECRET = (process.env.NARRATION_WORKER_SECRET || '').trim();
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const VOICES = new Set([
  'en-GB-Chirp3-HD-Aoede', 'en-GB-Chirp3-HD-Charon', 'en-GB-Chirp3-HD-Kore',
  'he-IL-Chirp3-HD-Aoede', 'he-IL-Chirp3-HD-Charon', 'he-IL-Chirp3-HD-Kore',
  'fr-FR-Chirp3-HD-Aoede',
]);
const usedNonces = new Map<string, number>();

export function verifySignedRequest(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, now = Date.now()) {
  if (SHARED_SECRET.length < 32) return false;
  const timestamp = String(headers['x-moreshet-timestamp'] || '');
  const nonce = String(headers['x-moreshet-nonce'] || '');
  const supplied = String(headers['x-moreshet-signature'] || '');
  const requestTime = Number(timestamp);
  if (!Number.isFinite(requestTime) || Math.abs(now - requestTime) > MAX_CLOCK_SKEW_MS) return false;
  if (!/^[0-9a-f-]{36}$/i.test(nonce) || usedNonces.has(nonce) || !/^[0-9a-f]{64}$/i.test(supplied)) return false;
  const expected = createHmac('sha256', SHARED_SECRET).update(`${timestamp}.${nonce}.${rawBody.toString('utf8')}`).digest('hex');
  if (!timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'))) return false;
  usedNonces.set(nonce, now);
  for (const [key, seenAt] of usedNonces) if (now - seenAt > MAX_CLOCK_SKEW_MS) usedNonces.delete(key);
  return true;
}

export function validateSynthesisBody(value: unknown) {
  const body = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const transcript = String(body.transcript || '').trim();
  const language = String(body.language || '').trim();
  const voice = String(body.voice || '').trim();
  const speakingRate = Number(body.speakingRate ?? 1);
  if (!transcript || transcript.length > 5000) throw new Error('Transcript must contain 1 to 5,000 characters.');
  if (!['en', 'he', 'fr'].includes(language)) throw new Error('Unsupported pilot narration language.');
  if (!VOICES.has(voice) || !voice.toLowerCase().startsWith(`${language.toLowerCase()}-`)) throw new Error('Unsupported voice.');
  if (!Number.isFinite(speakingRate) || speakingRate < 0.85 || speakingRate > 1.15) throw new Error('Unsupported speaking rate.');
  const languageCode = language as 'en' | 'he' | 'fr';
  const pronunciations = normalizePronunciations(body.pronunciations || [], transcript);
  return { transcript, language: languageCode, voice, speakingRate, pronunciations };
}

export function googleBearerHeaders(token: string | null | undefined) {
  const value = String(token || '').trim();
  if (!value) throw new Error('Google service identity did not provide an access token.');
  return { Authorization: `Bearer ${value}`, 'Content-Type': 'application/json' };
}

const app = express();
app.get('/health', (_request, response) => response.json({ ok: true, service: 'moreshet-narration-worker' }));
app.post('/synthesize', express.raw({ type: 'application/json', limit: '64kb' }), async (request, response) => {
  const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
  if (!verifySignedRequest(rawBody, request.headers)) return response.status(401).json({ error: { message: 'Unauthorized request.' } });
  let input: ReturnType<typeof validateSynthesisBody>;
  try {
    input = validateSynthesisBody(JSON.parse(rawBody.toString('utf8')));
  } catch (error) {
    const message = error instanceof SyntaxError ? 'Invalid JSON request.' : error instanceof Error ? error.message : 'Invalid request.';
    return response.status(400).json({ error: { message } });
  }
  try {
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    const customPronunciations = googlePronunciations(input.language, input.pronunciations);
    const googleResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: googleBearerHeaders(accessToken.token),
      body: JSON.stringify({
        input: {
          text: input.transcript,
          ...(customPronunciations.length > 0 ? { customPronunciations: { pronunciations: customPronunciations } } : {}),
        },
        voice: { languageCode: input.voice.slice(0, 5), name: input.voice },
        audioConfig: { audioEncoding: 'MP3', speakingRate: input.speakingRate },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const payload = await googleResponse.json() as { audioContent?: string; error?: { message?: string } };
    if (!googleResponse.ok || !payload.audioContent) {
      console.error('Google TTS failure', googleResponse.status, payload.error?.message || 'No audio returned');
      return response.status(502).json({ error: { message: 'The narration provider could not generate audio.' } });
    }
    return response.json({ audioContent: payload.audioContent });
  } catch (error) {
    console.error('Narration worker failure', error instanceof Error ? error.message : error);
    return response.status(502).json({ error: { message: 'The narration provider is temporarily unavailable.' } });
  }
});

if (process.env.NODE_ENV !== 'test') {
  if (SHARED_SECRET.length < 32) throw new Error('NARRATION_WORKER_SECRET must contain at least 32 characters.');
  app.listen(PORT, '0.0.0.0', () => console.log(`Moreshet narration worker listening on port ${PORT}`));
}
