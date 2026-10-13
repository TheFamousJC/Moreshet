import { createHash, createHmac, randomUUID } from 'node:crypto';
import { normalizePronunciations } from '../src/lib/pronunciation.js';
import type { PronunciationEntry } from '../src/types.js';

// Pilot narration scope. The wider content model remains multilingual so more
// narration languages can be enabled later without migrating stored content.
export const NARRATION_LANGUAGES = ['en', 'he', 'fr'] as const;
export type NarrationLanguage = typeof NARRATION_LANGUAGES[number];

export interface NarrationVoice {
  id: string;
  language: NarrationLanguage;
  label: string;
  style: string;
}

export const NARRATION_VOICES: NarrationVoice[] = [
  { id: 'en-GB-Chirp3-HD-Aoede', language: 'en', label: 'Aoede — British English', style: 'Warm, expressive heritage guide' },
  { id: 'en-GB-Chirp3-HD-Charon', language: 'en', label: 'Charon — British English', style: 'Measured, authoritative guide' },
  { id: 'en-GB-Chirp3-HD-Kore', language: 'en', label: 'Kore — British English', style: 'Clear, engaging guide' },
  { id: 'he-IL-Chirp3-HD-Aoede', language: 'he', label: 'Aoede — Hebrew', style: 'Warm, expressive heritage guide' },
  { id: 'he-IL-Chirp3-HD-Charon', language: 'he', label: 'Charon — Hebrew', style: 'Measured, authoritative guide' },
  { id: 'he-IL-Chirp3-HD-Kore', language: 'he', label: 'Kore — Hebrew', style: 'Clear, engaging guide' },
  { id: 'fr-FR-Chirp3-HD-Aoede', language: 'fr', label: 'Aoede — French', style: 'Pilot French voice; verify before publication' },
];

const SAMPLE_URLS: Record<string, string> = {
  'en-GB-Chirp3-HD-Aoede': '/voice-samples/en-aoede.mp3',
  'en-GB-Chirp3-HD-Charon': '/voice-samples/en-charon.mp3',
  'en-GB-Chirp3-HD-Kore': '/voice-samples/en-kore.mp3',
  'he-IL-Chirp3-HD-Aoede': '/voice-samples/he-aoede.mp3',
  'he-IL-Chirp3-HD-Charon': '/voice-samples/he-charon.mp3',
  'he-IL-Chirp3-HD-Kore': '/voice-samples/he-kore.mp3',
};

export interface NarrationConfig {
  mode: 'simulator' | 'live';
  provider: 'google';
  model: 'Chirp3-HD';
  maxCharactersPerRequest: number;
  dailyCharacterLimit: number;
  workerUrl: string;
  workerSecret: string;
}

export interface NarrationRequest {
  organizationId: string;
  stopId?: string;
  language: NarrationLanguage;
  voice: string;
  speakingRate: number;
  transcript: string;
  pronunciations: PronunciationEntry[];
  cacheKey: string;
}

const integerSetting = (value: string | undefined, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};

export function loadNarrationConfig(env: NodeJS.ProcessEnv = process.env): NarrationConfig {
  const liveRequested = env.NARRATION_MODE === 'live';
  const workerUrl = (env.NARRATION_WORKER_URL || '').trim().replace(/\/$/, '');
  const workerSecret = (env.NARRATION_WORKER_SECRET || '').trim();
  return {
    mode: liveRequested && /^https:\/\//.test(workerUrl) && workerSecret.length >= 32 ? 'live' : 'simulator',
    provider: 'google',
    model: 'Chirp3-HD',
    maxCharactersPerRequest: integerSetting(env.NARRATION_MAX_CHARACTERS, 5000, 100, 10000),
    dailyCharacterLimit: integerSetting(env.NARRATION_DAILY_CHARACTER_LIMIT, 25000, 1000, 2_000_000),
    workerUrl,
    workerSecret,
  };
}

export function parseNarrationRequest(body: unknown, config: NarrationConfig): NarrationRequest {
  const value = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const organizationId = String(value.organizationId || '').trim();
  const stopId = String(value.stopId || '').trim() || undefined;
  const language = String(value.language || 'en') as NarrationLanguage;
  const voice = String(value.voice || '').trim();
  const transcript = String(value.transcript || '').trim();
  const speakingRate = Number(value.speakingRate ?? 1);
  if (!/^[0-9a-f-]{36}$/i.test(organizationId)) throw new Error('Choose a valid CMS organization.');
  if (stopId && !/^[0-9a-f-]{36}$/i.test(stopId)) throw new Error('The stop identifier is invalid.');
  if (!NARRATION_LANGUAGES.includes(language)) throw new Error('Pilot narration is available in English, Hebrew and French only.');
  const selectedVoice = NARRATION_VOICES.find((item) => item.id === voice);
  if (!selectedVoice || selectedVoice.language !== language) throw new Error('Choose a voice that matches the narration language.');
  if (!transcript) throw new Error('Enter an audio guide transcript before previewing narration.');
  if (transcript.length > config.maxCharactersPerRequest) throw new Error(`Narration is limited to ${config.maxCharactersPerRequest.toLocaleString()} characters per stop.`);
  if (!Number.isFinite(speakingRate) || speakingRate < 0.85 || speakingRate > 1.15) throw new Error('Narration pace must be between 0.85 and 1.15.');
  const pronunciations = normalizePronunciations(value.pronunciations || [], transcript);
  const normalizedRate = Math.round(speakingRate * 100) / 100;
  const cacheKey = createHash('sha256').update(JSON.stringify({ transcript, language, voice, speakingRate: normalizedRate, pronunciations, model: config.model })).digest('hex');
  return { organizationId, stopId, language, voice, speakingRate: normalizedRate, transcript, pronunciations, cacheKey };
}

export function createNarrationDailyBudget(limit: number, now: () => Date = () => new Date()) {
  let day = '';
  let used = 0;
  const reset = () => {
    const current = now().toISOString().slice(0, 10);
    if (current !== day) { day = current; used = 0; }
  };
  return {
    tryConsume(characters: number) {
      reset();
      if (characters < 1 || used + characters > limit) return false;
      used += characters;
      return true;
    },
    status() { reset(); return { limit, used, remaining: Math.max(0, limit - used) }; },
  };
}

export async function generateNarrationAudio(request: NarrationRequest, config: NarrationConfig, fetchImpl: typeof fetch = fetch) {
  if (config.mode !== 'live') {
    return { mode: 'simulator' as const, audioUrl: SAMPLE_URLS[request.voice] || null, bytes: null, mimeType: 'audio/mpeg', provider: config.provider, model: config.model };
  }
  const body = JSON.stringify({
    transcript: request.transcript,
    language: request.language,
    voice: request.voice,
    speakingRate: request.speakingRate,
    pronunciations: request.pronunciations,
  });
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const signature = createHmac('sha256', config.workerSecret)
    .update(`${timestamp}.${nonce}.${body}`)
    .digest('hex');
  const response = await fetchImpl(`${config.workerUrl}/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tudela-Timestamp': timestamp,
      'X-Tudela-Nonce': nonce,
      'X-Tudela-Signature': signature,
    },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => ({})) as { audioContent?: string; error?: { message?: string } };
  if (!response.ok || !payload.audioContent) throw new Error(payload.error?.message || `Narration worker returned ${response.status}.`);
  return { mode: 'live' as const, audioUrl: null, bytes: Buffer.from(payload.audioContent, 'base64'), mimeType: 'audio/mpeg', provider: config.provider, model: config.model };
}
