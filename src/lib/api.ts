// Only the API origin is public. Server credentials must never use VITE_ variables.
const configured = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
export function apiUrl(path: string): string {
  if (!path.startsWith('/api/')) throw new Error('Invalid API path');
  return configured + path;
}
export function appReturnUrl(): string {
  return new URL(import.meta.env?.BASE_URL || '/', window.location.origin).href;
}

