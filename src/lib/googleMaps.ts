export function googleMapsSearch(query: string) {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1'); url.searchParams.set('query', query);
  return url.href;
}
export function googleMapsWalking(destination: { lat: number; lng: number }, origin?: { lat: number; lng: number }) {
  for (const point of [destination, origin].filter(Boolean)) {
    if (!Number.isFinite(point!.lat) || !Number.isFinite(point!.lng) || Math.abs(point!.lat)>90 || Math.abs(point!.lng)>180) throw new Error('Verified coordinates are required.');
  }
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api','1');url.searchParams.set('destination',`${destination.lat},${destination.lng}`);url.searchParams.set('travelmode','walking');url.searchParams.set('dir_action','navigate');
  if (origin) url.searchParams.set('origin',`${origin.lat},${origin.lng}`);
  return url.href;
}

type MapPoint = { lat: number; lng: number };
export function googleMapsEmbed(key: string, stops: MapPoint[], language: string, route = false): string {
  if (!key.trim() || !stops.length) throw new Error('Map configuration and stops are required.');
  if (stops.length > 22) throw new Error('Google Maps supports at most 22 stops in one embedded route.');
  const coordinates = stops.map(point => {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) throw new Error('Verified coordinates are required.');
    return `${point.lat},${point.lng}`;
  });
  const directions = route && coordinates.length > 1;
  const url = new URL(`https://www.google.com/maps/embed/v1/${directions ? 'directions' : 'place'}`);
  url.searchParams.set('key', key.trim());
  url.searchParams.set('language', language);
  if (directions) {
    url.searchParams.set('origin', coordinates[0]);
    url.searchParams.set('destination', coordinates[coordinates.length - 1]);
    if (coordinates.length > 2) url.searchParams.set('waypoints', coordinates.slice(1, -1).join('|'));
    url.searchParams.set('mode', 'walking');
    url.searchParams.set('units', 'metric');
  } else url.searchParams.set('q', coordinates[0]);
  return url.href;
}
