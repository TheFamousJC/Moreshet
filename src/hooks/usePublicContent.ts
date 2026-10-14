import { useCallback, useEffect, useState } from 'react';
import { LanguageCode } from '../data/translations';
import {
  clearPublicContentCache,
  demoPublicContent,
  fetchPublicContent,
  PublicContentPayload,
  PublicContentSource,
  readPublicContentCache,
  writePublicContentCache,
} from '../lib/publicContent';

export function usePublicContent(language: LanguageCode, organization = 'moreshet') {
  const [content, setContent] = useState<PublicContentPayload>(() =>
    readPublicContentCache(organization, language) || demoPublicContent(language));
  const [source, setSource] = useState<PublicContentSource>(() =>
    readPublicContentCache(organization, language) ? 'cache' : 'demo');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async (signal?: AbortSignal): Promise<PublicContentPayload | null> => {
    setIsLoading(true);
    setError('');
    if(import.meta.env.VITE_FRONTEND_PREVIEW === 'true'){setContent(demoPublicContent(language));setSource('demo');setIsLoading(false);return null;}
    try {
      const payload = await fetchPublicContent(organization, language, signal);
      // An empty published catalogue is intentionally not replaced with draft CMS records.
      if (payload.cities.length && payload.tours.length && payload.sites.length) {
        setContent(payload);
        setSource('shared');
        writePublicContentCache(organization, language, payload);
        return payload;
      }
      clearPublicContentCache(organization, language);
      setContent(demoPublicContent(language));
      setSource('demo');
      setError('No complete published CMS tour is currently available. Bundled demonstration content is being shown.');
      return null;
    } catch (refreshError) {
      if (refreshError instanceof DOMException && refreshError.name === 'AbortError') return null;
      console.info('Using cached or bundled tour content:', refreshError instanceof Error ? refreshError.message : refreshError);
      setError(refreshError instanceof Error ? refreshError.message : 'Published content is temporarily unavailable.');
      return null;
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [language, organization]);

  useEffect(() => {
    const controller = new AbortController();
    const cached = readPublicContentCache(organization, language);
    if (cached) {
      setContent(cached);
      setSource('cache');
    } else {
      setContent(demoPublicContent(language));
      setSource('demo');
    }
    void refresh(controller.signal);
    return () => controller.abort();
  }, [language, organization, refresh]);

  return { ...content, source, isLoading, error, refresh };
}
