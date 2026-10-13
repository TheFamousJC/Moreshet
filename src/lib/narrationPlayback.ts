import { LanguageCode } from '../data/translations';
import { HeritageSite } from '../types';

export type NarrationPlaybackSource = 'recorded' | 'device';

export function narrationPlaybackSource(site: HeritageSite, selectedLanguage: LanguageCode): NarrationPlaybackSource {
  return site.narrationUrl && site.narrationLanguage === selectedLanguage ? 'recorded' : 'device';
}

export function findMatchingRecordedNarration(sites: HeritageSite[], stopId: string, selectedLanguage: LanguageCode): HeritageSite | null {
  return sites.find((site) => site.id === stopId && narrationPlaybackSource(site, selectedLanguage) === 'recorded') || null;
}
