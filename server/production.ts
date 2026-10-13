import type { NextFunction, Request, Response } from 'express';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

export interface RuntimeConfig {
  environment: string;
  port: number;
  appUrl: string;
  supabaseUrl: string;
  supabaseSecretKey: string;
  herzlMode: 'simulator' | 'live';
  herzlLiveRequested: boolean;
  configurationWarnings: string[];
  trustProxy: boolean;
}

const isHerzlCredentialIssue = (issue: string) =>
  issue.startsWith('OPENAI_API_KEY is required') || issue.startsWith('GEMINI_API_KEY is required');

export function productionConfigurationIssues(env: NodeJS.ProcessEnv): string[] {
  if ((env.NODE_ENV || 'development') !== 'production') return [];
  const issues: string[] = [];
  const appUrl = env.APP_URL || '';
  const supabaseUrl = env.SUPABASE_URL || '';
  const browserSupabaseUrl = env.VITE_SUPABASE_URL || '';
  const browserKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const secretKey = env.SUPABASE_SECRET_KEY || '';

  if (!appUrl.startsWith('https://') || appUrl.includes('MY_APP_URL')) issues.push('APP_URL must be the final HTTPS public address.');
  if (!supabaseUrl.startsWith('https://')) issues.push('SUPABASE_URL must use the hosted HTTPS Supabase project.');
  if (!browserSupabaseUrl.startsWith('https://')) issues.push('VITE_SUPABASE_URL must use the hosted HTTPS Supabase project.');
  if (!browserKey || browserKey.length < 20) issues.push('VITE_SUPABASE_PUBLISHABLE_KEY is missing or invalid.');
  if (!secretKey || secretKey.length < 20) issues.push('SUPABASE_SECRET_KEY is missing or invalid.');
  if (secretKey && secretKey === browserKey) issues.push('The server secret key must not equal the browser publishable key.');
  if (env.HERZL_PROVIDER && !['openai', 'gemini'].includes(env.HERZL_PROVIDER)) issues.push('HERZL_PROVIDER must be openai or gemini.');
  if (env.HERZL_MODE === 'live') {
    const provider = env.HERZL_PROVIDER === 'gemini'
      ? 'gemini'
      : env.HERZL_PROVIDER === 'openai'
        ? 'openai'
        : env.GEMINI_API_KEY && !env.OPENAI_API_KEY
          ? 'gemini'
          : 'openai';
    if (provider === 'openai' && !(env.OPENAI_API_KEY || '').trim()) issues.push('OPENAI_API_KEY is required while HERZL_MODE=live and HERZL_PROVIDER=openai.');
    if (provider === 'gemini' && !(env.GEMINI_API_KEY || '').trim()) issues.push('GEMINI_API_KEY is required while HERZL_MODE=live and HERZL_PROVIDER=gemini.');
  }
  return issues;
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const issues = productionConfigurationIssues(env);
  const configurationWarnings = issues.filter(isHerzlCredentialIssue);
  const fatalIssues = issues.filter((issue) => !isHerzlCredentialIssue(issue));
  if (fatalIssues.length) throw new Error(`Production configuration is incomplete:\n- ${fatalIssues.join('\n- ')}`);
  const parsedPort = Number(env.PORT || 3000);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  const herzlLiveRequested = env.HERZL_MODE === 'live';
  return {
    environment: env.NODE_ENV || 'development',
    port: parsedPort,
    appUrl: env.APP_URL || `http://localhost:${parsedPort}`,
    supabaseUrl: env.SUPABASE_URL || '',
    supabaseSecretKey: env.SUPABASE_SECRET_KEY || '',
    herzlMode: herzlLiveRequested && configurationWarnings.length === 0 ? 'live' : 'simulator',
    herzlLiveRequested,
    configurationWarnings,
    trustProxy: env.TRUST_PROXY === 'true',
  };
}

export function detectImageMime(bytes: Uint8Array): typeof ALLOWED_IMAGE_MIME_TYPES[number] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  if (bytes.length >= 6) {
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    if (signature === 'GIF87a' || signature === 'GIF89a') return 'image/gif';
  }
  return null;
}

export function createMemoryRateLimiter(options: { windowMs: number; limit: number }) {
  const clients = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = clients.get(key);
    const state = !current || current.resetAt <= now ? { count: 0, resetAt: now + options.windowMs } : current;
    state.count += 1;
    clients.set(key, state);
    res.setHeader('RateLimit-Limit', String(options.limit));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, options.limit - state.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(state.resetAt / 1000)));
    if (state.count > options.limit) return res.status(429).json({ error: 'Too many requests. Please wait and try again.' });
    if (clients.size > 5000) for (const [client, value] of clients) if (value.resetAt <= now) clients.delete(client);
    next();
  };
}

export function applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
  const isCms = req.path === '/cms' || req.path.startsWith('/cms/') || req.path.startsWith('/api/admin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', isCms ? 'no-referrer' : 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (isCms) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  next();
}
