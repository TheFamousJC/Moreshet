export type RoutePoint = { lat: number; lng: number };

export function decodeGooglePolyline(encoded: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += (result & 1) ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    longitude += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ lat: latitude / 1e5, lng: longitude / 1e5 });
  }
  return points;
}

export async function loadTourWalkingRoute(organization: string, tourId: string, signal?: AbortSignal): Promise<RoutePoint[] | null> {
  if (!organization || !tourId) return null;
  const response = await fetch('/api/routes/walking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organization, tourId }),
    signal,
  });
  if (!response.ok) return null;
  const body = await response.json() as { encodedPolyline?: string };
  return body.encodedPolyline ? decodeGooglePolyline(body.encodedPolyline) : null;
}
