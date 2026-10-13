import { HeritageSite } from '../types';

export function getTourStopPosition(site: HeritageSite, tourId: string) {
  const assignment = site.tourAssignments?.find((item) => item.tourId === tourId);
  if (assignment) return assignment.position;
  if (site.tourId === tourId) return site.tourOrder ?? Number.MAX_SAFE_INTEGER;
  return null;
}

export function isSiteInTour(site: HeritageSite, tourId: string) {
  return getTourStopPosition(site, tourId) !== null;
}

export function getTourSites(sites: HeritageSite[], tourId: string) {
  return sites
    .filter((site) => isSiteInTour(site, tourId))
    .sort((left, right) =>
      (getTourStopPosition(left, tourId) ?? Number.MAX_SAFE_INTEGER)
      - (getTourStopPosition(right, tourId) ?? Number.MAX_SAFE_INTEGER));
}
