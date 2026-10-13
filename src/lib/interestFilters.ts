import { INTEREST_VALUES } from '../data/interests';
import { HeritageSite, SiteCategory } from '../types';

const interestText = (site: HeritageSite) =>
  `${site.name} ${site.shortDescription} ${site.transcript} ${site.tags.join(' ')}`.toLowerCase();

export const matchesInterest = (site: HeritageSite, interest: SiteCategory): boolean => {
  const text = interestText(site);

  if (interest === 'museum') return site.category === 'museum' || /museum|exhibition|visitor centre|visitor center/.test(text);
  if (interest === 'kosher_food') return site.category === 'kosher_food' || /kosher|restaurant|caf[eé]|bakery|deli|food shop/.test(text);
  if (interest === 'community') return site.category === 'community' || /community cent(?:re|er)|chabad|jcc|jewish community/.test(text);
  if (interest === 'education') return site.category === 'education' || /yeshiva|school|beit midrash|study cent(?:re|er)|jewish learning/.test(text);
  if (interest === 'archaeology') return site.category === 'archaeology' || /archaeolog|excavation|ancient ruin/.test(text);
  if (interest === 'archives') return site.category === 'archives' || /archive|library|manuscript|historical records/.test(text);
  if (interest === 'culture') return site.category === 'culture' || /cultural cent(?:re|er)|gallery|judaica|theatre|theater/.test(text);
  if (interest === 'historic_sites') {
    return site.category === 'historic_sites' || ['bridge', 'historic_site', 'juderia'].includes(site.category);
  }
  if (interest === 'holocaust') {
    return site.category === 'holocaust' || /holocaust|shoah|ghetto|nazi|world war ii|wwii/.test(text);
  }
  if (interest === 'legends') {
    return site.category === 'legends' || /legend|golem|myth|maharal/.test(text);
  }
  if (interest === 'personalities') {
    return site.category === 'personalities' || /herzl|kafka|wallenberg|korczak|maharal|montefiore|weizmann|balfour|anielewicz/.test(text);
  }
  if (interest === 'monument') return site.category === 'monument' || site.category === 'memorial';

  return site.category === interest;
};

export const matchesSelectedInterests = (
  site: HeritageSite,
  selectedInterests: SiteCategory[],
): boolean => selectedInterests.length === 0 || selectedInterests.some((interest) => matchesInterest(site, interest));

export const parseStoredInterests = (storedValue: string | null): SiteCategory[] => {
  if (!storedValue) return [];

  try {
    const parsed = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (value, index): value is SiteCategory =>
        INTEREST_VALUES.includes(value as SiteCategory) && parsed.indexOf(value) === index,
    );
  } catch {
    return [];
  }
};
