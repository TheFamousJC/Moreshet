export function buildTourShareUrl(origin: string, organization: string | null, cityId: string, tourId: string): string {
  const url = new URL('/', origin);
  if (organization) url.searchParams.set('organization', organization);
  url.searchParams.set('city', cityId);
  url.searchParams.set('tour', tourId);
  return url.toString();
}
