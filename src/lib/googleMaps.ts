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
