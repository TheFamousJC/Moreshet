import { SiteCategory } from '../types';

export type InterestFilter = SiteCategory | 'all';

// This is the single source of truth for both Discovery and the CMS.
export const INTEREST_VALUES: SiteCategory[] = [
  'synagogue',
  'museum',
  'kosher_food',
  'community',
  'education',
  'juderia',
  'holocaust',
  'legends',
  'scholar',
  'personalities',
  'monument',
  'cemetery',
  'mikveh',
  'archaeology',
  'archives',
  'culture',
  'historic_sites',
];

export const DISCOVERY_INTEREST_VALUES: InterestFilter[] = ['all', ...INTEREST_VALUES];

export const DEFAULT_INTEREST_LABELS: Record<InterestFilter, string> = {
  all: 'Interests',
  synagogue: 'Synagogues',
  museum: 'Jewish Museums',
  kosher_food: 'Kosher Food',
  community: 'Community & Chabad',
  education: 'Schools & Yeshivas',
  juderia: 'Heritage Sites',
  holocaust: 'Holocaust',
  legends: 'Legends',
  scholar: 'Zionism',
  personalities: 'Personalities',
  monument: 'Memorials',
  cemetery: 'Cemeteries',
  mikveh: 'Mikveh & Rituals',
  archaeology: 'Archaeological Sites',
  archives: 'Archives & Libraries',
  culture: 'Jewish Culture',
  historic_sites: 'Historic Sites',
  bridge: 'Historic Sites',
  historic_site: 'Historic Sites',
  memorial: 'Memorials',
};
