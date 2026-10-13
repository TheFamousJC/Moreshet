import type { CmsNarrationItem } from './cmsContent';

export const PILOT_NARRATION_LANGUAGES = ['en', 'he', 'fr'] as const;
export type PilotNarrationLanguage = typeof PILOT_NARRATION_LANGUAGES[number];

export interface NarrationCoverageCell {
  published?: CmsNarrationItem;
  latestWork?: CmsNarrationItem;
}

const newestFirst = (left: CmsNarrationItem, right: CmsNarrationItem) =>
  Date.parse(right.createdAt) - Date.parse(left.createdAt);

export function narrationCoverageCell(
  items: CmsNarrationItem[],
  stopId: string,
  language: PilotNarrationLanguage,
): NarrationCoverageCell {
  const matching = items
    .filter((item) => item.status !== 'superseded' && item.stopId === stopId && item.language === language)
    .sort(newestFirst);

  return {
    published: matching.find((item) => item.status === 'published'),
    latestWork: matching.find((item) => item.status !== 'published'),
  };
}

export function publishedNarrationCount(
  stopIds: string[],
  items: CmsNarrationItem[],
  languages: readonly PilotNarrationLanguage[] = PILOT_NARRATION_LANGUAGES,
) {
  return stopIds.reduce((total, stopId) => total + languages.filter(
    (language) => Boolean(narrationCoverageCell(items, stopId, language).published),
  ).length, 0);
}
