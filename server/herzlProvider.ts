import { GoogleGenAI } from '@google/genai';

export const HERZL_LANGUAGES = ['en', 'he', 'ru', 'fr', 'de', 'es'] as const;
export type HerzlLanguage = typeof HERZL_LANGUAGES[number];
export type HerzlProvider = 'openai' | 'gemini';

export interface HerzlHistoryItem {
  sender: 'user' | 'herzl';
  text: string;
}

export interface HerzlRequest {
  message: string;
  history: HerzlHistoryItem[];
  cityId: string;
  tourId: string;
  language: HerzlLanguage;
  organization: string;
  contentSource: 'shared' | 'cache' | 'demo';
}

export interface HerzlProviderConfig {
  mode: 'simulator' | 'live';
  provider: HerzlProvider;
  model: string;
  maxInputCharacters: number;
  maxHistoryMessages: number;
  maxOutputTokens: number;
  timeoutMs: number;
  dailyRequestLimit: number;
}

const ORGANIZATION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONTENT_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/;

const boundedInteger = (value: string | undefined, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
};

export function loadHerzlProviderConfig(env: NodeJS.ProcessEnv = process.env): HerzlProviderConfig {
  const provider: HerzlProvider = env.HERZL_PROVIDER === 'gemini'
    ? 'gemini'
    : env.HERZL_PROVIDER === 'openai'
      ? 'openai'
      : env.GEMINI_API_KEY && !env.OPENAI_API_KEY
        ? 'gemini'
        : 'openai';

  return {
    mode: env.HERZL_MODE === 'live' ? 'live' : 'simulator',
    provider,
    model: provider === 'openai'
      ? (env.OPENAI_MODEL || 'gpt-5.6-luna')
      : (env.GEMINI_MODEL || 'gemini-3.6-flash'),
    maxInputCharacters: boundedInteger(env.HERZL_MAX_INPUT_CHARACTERS, 600, 100, 2000),
    maxHistoryMessages: boundedInteger(env.HERZL_MAX_HISTORY_MESSAGES, 6, 0, 12),
    maxOutputTokens: boundedInteger(env.HERZL_MAX_OUTPUT_TOKENS, 500, 100, 1200),
    timeoutMs: boundedInteger(env.HERZL_TIMEOUT_MS, 20_000, 5_000, 60_000),
    dailyRequestLimit: boundedInteger(env.HERZL_DAILY_REQUEST_LIMIT, 300, 1, 10_000),
  };
}

export function createHerzlDailyBudget(limit: number, clock: () => Date = () => new Date()) {
  let day = clock().toISOString().slice(0, 10);
  let used = 0;
  return {
    tryConsume() {
      const currentDay = clock().toISOString().slice(0, 10);
      if (currentDay !== day) {
        day = currentDay;
        used = 0;
      }
      if (used >= limit) return false;
      used += 1;
      return true;
    },
    status() { return { day, used, limit, remaining: Math.max(0, limit - used) }; },
  };
}

export function parseHerzlRequest(body: unknown, config: HerzlProviderConfig): HerzlRequest {
  if (!body || typeof body !== 'object') throw new Error('A chat request is required.');
  const input = body as Record<string, unknown>;
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (!message) throw new Error('Message prompt is required.');
  if (message.length > config.maxInputCharacters) throw new Error(`Message must be ${config.maxInputCharacters} characters or fewer.`);

  const language = HERZL_LANGUAGES.includes(input.language as HerzlLanguage) ? input.language as HerzlLanguage : 'en';
  const cityId = typeof input.cityId === 'string' && CONTENT_ID.test(input.cityId) ? input.cityId : '';
  const tourId = typeof input.tourId === 'string' && CONTENT_ID.test(input.tourId) ? input.tourId : '';
  const organization = typeof input.organization === 'string' && ORGANIZATION_SLUG.test(input.organization)
    ? input.organization
    : 'tudela-global';
  const contentSource = input.contentSource === 'shared' || input.contentSource === 'cache'
    ? input.contentSource
    : 'demo';
  const history = Array.isArray(input.history)
    ? input.history.slice(-config.maxHistoryMessages).flatMap((item): HerzlHistoryItem[] => {
        if (!item || typeof item !== 'object') return [];
        const candidate = item as Record<string, unknown>;
        const text = typeof candidate.text === 'string' ? candidate.text.trim().slice(0, config.maxInputCharacters) : '';
        if (!text) return [];
        return [{ sender: candidate.sender === 'user' ? 'user' : 'herzl', text }];
      })
    : [];

  return { message, history, cityId, tourId, language, organization, contentSource };
}

export function buildHerzlPrompt(request: HerzlRequest) {
  const conversation = request.history.map((item) => `${item.sender === 'user' ? 'Visitor' : 'Benjamin'}: ${item.text}`);
  const scope = [request.cityId && `City ID: ${request.cityId}`, request.tourId && `Tour ID: ${request.tourId}`].filter(Boolean);
  return [...scope, ...conversation, `Visitor: ${request.message}`, 'Benjamin:'].join('\n');
}

const HERZL_PERSONA_FABRICATION_PATTERNS: Array<[string, RegExp]> = [
  ['personal childhood claim', /\bmy (?:Budapest )?childhood\b/i],
  ['personal family claim', /\bmy family\b/i],
  ['personal religious-event claim', /\bmy (?:bar|bat) mitzvah\b/i],
  ['personal attendance claim', /\bI (?:attended|worshipped|celebrated|remember|recall|witnessed)\b/i],
  ['Herzl identity claim', /\bI am (?:Theodor |Benjamin Ze(?:'|â€™)?ev )?Herzl\b/i],
  ['Herzl biography in first person', /\bI (?:was born|grew up|convened|founded|penned|wrote)\b/i],
  ['Hebrew Herzl persona claim', /(?:אני (?:תאודור|בנימין זאב) הרצל|ילדותי|משפחתי|בר המצווה שלי|נולדתי|כינסתי|ייסדתי|כתבתי)/i],
  ['Russian Herzl persona claim', /(?:я (?:теодор герцль|родился|вырос|посещал|молился|праздновал|помню|созвал|основал|написал)|мо[её] детство|моя семья|моя бар-мицва)/i],
  ['French Herzl persona claim', /(?:je suis th[ée]odor(?:e)? herzl|mon enfance|ma famille|ma bar[- ]mitsva|je suis n[ée]|j['’]ai grandi|j['’]ai (?:fréquenté|prié|célébré|convoqué|fondé|écrit))/i],
  ['German Herzl persona claim', /(?:ich bin theodor herzl|meine kindheit|meine familie|meine bar[- ]mitz(?:wa|vah)|ich (?:wurde geboren|wuchs auf|besuchte|betete|feierte|erinnere|berief|gründete|schrieb))/i],
  ['Spanish Herzl persona claim', /(?:soy theodor herzl|mi infancia|mi familia|mi bar mitzv[áa]|yo (?:nací|crecí|asistí|recé|celebré|recuerdo|convoqué|fundé|escribí))/i],
];

export function findHerzlPersonaSafetyIssues(text: string) {
  return HERZL_PERSONA_FABRICATION_PATTERNS
    .filter(([, pattern]) => pattern.test(text))
    .map(([label]) => label);
}

export function safeHerzlFallback(language: HerzlLanguage) {
  if (language === 'he') return 'לא ניתן לספק תשובה מאומתת כרגע. יש לעיין בתוכן הסיור שפורסם או לנסות שוב מאוחר יותר.';
  if (language === 'ru') return 'Сейчас невозможно предоставить проверенный ответ. Обратитесь к опубликованным материалам тура или повторите попытку позже.';
  if (language === 'fr') return 'Je ne peux pas fournir de réponse vérifiée pour le moment. Consultez le contenu publié du parcours ou réessayez plus tard.';
  if (language === 'de') return 'Derzeit kann keine überprüfte Antwort bereitgestellt werden. Bitte nutzen Sie die veröffentlichten Tourinhalte oder versuchen Sie es später erneut.';
  if (language === 'es') return 'No puedo proporcionar una respuesta verificada en este momento. Consulte el contenido publicado del recorrido o inténtelo de nuevo más tarde.';
  return 'I cannot provide a verified answer at the moment. Please consult the published tour content or try again later.';
}

export function herzlDailyLimitMessage(language: HerzlLanguage) {
  if (language === 'he') return 'Ask Benjamin הגיע למגבלת השימוש היומית של הפיילוט. אפשר לנסות שוב לאחר חצות UTC.';
  if (language === 'ru') return 'Ask Benjamin достиг дневного лимита пилотного проекта. Повторите попытку после полуночи UTC.';
  if (language === 'fr') return 'Ask Benjamin a atteint la limite quotidienne du pilote. Réessayez après minuit UTC.';
  if (language === 'de') return 'Ask Benjamin hat das tägliche Pilotlimit erreicht. Bitte versuchen Sie es nach 00:00 UTC erneut.';
  if (language === 'es') return 'Ask Benjamin ha alcanzado el límite diario del piloto. Inténtalo de nuevo después de las 00:00 UTC.';
  return 'Ask Benjamin has reached the pilot daily limit. Please try again after 00:00 UTC.';
}

function extractOpenAiText(payload: any): string {
  if (typeof payload?.output_text === 'string') return payload.output_text.trim();
  const parts = Array.isArray(payload?.output)
    ? payload.output.flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    : [];
  return parts.filter((part: any) => part?.type === 'output_text' && typeof part.text === 'string').map((part: any) => part.text).join('\n').trim();
}

export async function generateHerzlResponse(
  systemInstruction: string,
  prompt: string,
  config: HerzlProviderConfig,
  env: NodeJS.ProcessEnv = process.env,
  fetchImplementation: typeof fetch = fetch,
): Promise<string> {
  if (config.mode !== 'live') throw new Error('HERZL_SIMULATION_MODE');

  if (config.provider === 'openai') {
    const apiKey = (env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new Error('OPENAI_API_KEY is missing.');
    const response = await fetchImplementation('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        instructions: systemInstruction,
        input: prompt,
        max_output_tokens: config.maxOutputTokens,
        reasoning: { effort: 'low' },
        text: { verbosity: 'low' },
        store: false,
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    if (!response.ok) throw new Error(`OpenAI provider returned ${response.status}.`);
    const text = extractOpenAiText(await response.json());
    if (!text) throw new Error('OpenAI provider returned an empty response.');
    return text;
  }

  const apiKey = (env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing.');
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: config.model,
    contents: prompt,
    config: { systemInstruction, temperature: 0.5, maxOutputTokens: config.maxOutputTokens },
  });
  const text = (response.text || '').trim();
  if (!text) throw new Error('Gemini provider returned an empty response.');
  return text;
}
