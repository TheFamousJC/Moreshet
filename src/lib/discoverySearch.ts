import { TourCity } from '../types';

export const normalizeDiscoverySearch = (value: string) =>
  value.trim().toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

const COUNTRY_QUERY_ALIASES: Record<string, string> = {
  us: 'united states', usa: 'united states', 'united states of america': 'united states',
  uk: 'united kingdom', britain: 'united kingdom', 'great britain': 'united kingdom', england: 'united kingdom',
  czechia: 'czech republic', moldavia: 'moldova',
};

export const cityMatchesDiscoverySearch = (city: TourCity, query: string) => {
  const rawQuery = normalizeDiscoverySearch(query);
  const normalizedQuery = COUNTRY_QUERY_ALIASES[rawQuery] || rawQuery;
  if (!normalizedQuery) return true;
  return [city.name, city.country, city.subtitle, city.description]
    .some((value) => normalizeDiscoverySearch(value || '').includes(normalizedQuery));
};
