import { useCallback, useEffect, useMemo, useState } from 'react';
import { HeritageSite, TourCity, TourSummary } from '../types';
import { AccountContext } from '../lib/supabase';
import {
  amendCmsRevision, archiveCmsContent, archiveCmsRevision, CmsAiSource, CmsContentData, CmsLicensedMediaImport, CmsOrganization, CmsReviewItem, importCmsLicensedImage, listCmsOrganizations, loadCmsContent,
  publishCmsRevision, reorderCmsTourStops, replaceCmsTourStops, restoreCmsContent, restoreCmsRevision, reviewCmsAiSource, reviewCmsMedia, reviewCmsNarration, reviewCmsRevision, saveCmsAiSource, saveCmsCity, saveCmsSite, saveCmsTour, submitCmsAiSource, submitCmsContent, uploadCmsImage,
} from '../lib/cmsContent';
import { banCommunityUser, liftCommunityUserBan, moderateHeritageStory, moderateTourComment, moderateTourRating } from '../lib/community';
import { INTEREST_VALUES } from '../data/interests';

const emptyData: CmsContentData = { cities: [], tours: [], sites: [], reviewItems: [], archivedReviewItems: [], mediaItems: [], narrationItems: [], archivedItems: [], aiSources: [], tourRatings: [], tourComments: [], heritageStories: [], communityBans: [] };

function validateCmsImport(cities: TourCity[], sites: HeritageSite[], licensedMedia: CmsLicensedMediaImport[]) {
  const cityIds = new Set<string>();
  for (const [index, city] of cities.entries()) {
    if (!city.id?.trim()) throw new Error(`City ${index + 1} needs a stable import ID.`);
    if (cityIds.has(city.id)) throw new Error(`Duplicate city import ID: ${city.id}.`);
    if (!city.name?.trim() || !city.country?.trim()) throw new Error(`City ${index + 1} needs a name and country.`);
    if (!Number.isFinite(city.centerLat) || city.centerLat < -90 || city.centerLat > 90 || !Number.isFinite(city.centerLng) || city.centerLng < -180 || city.centerLng > 180) {
      throw new Error(`${city.name} has invalid GPS coordinates.`);
    }
    cityIds.add(city.id);
  }

  const stopIds = new Set<string>();
  for (const [index, site] of sites.entries()) {
    if (!site.id?.trim()) throw new Error(`Stop ${index + 1} needs a stable import ID.`);
    if (stopIds.has(site.id)) throw new Error(`Duplicate stop import ID: ${site.id}.`);
    if (!site.name?.trim()) throw new Error(`Stop ${index + 1} needs a title.`);
    if (!site.cityId || !cityIds.has(site.cityId)) throw new Error(`${site.name} does not reference a city in this import.`);
    if (!INTEREST_VALUES.includes(site.category)) {
      throw new Error(`${site.name} uses unsupported interest "${site.category}". Choose one of: ${INTEREST_VALUES.join(', ')}.`);
    }
    if (!Number.isFinite(site.lat) || site.lat < -90 || site.lat > 90 || !Number.isFinite(site.lng) || site.lng < -180 || site.lng > 180) {
      throw new Error(`${site.name} has invalid GPS coordinates.`);
    }
    for (const [language, translation] of Object.entries(site.translations || {})) {
      if (!translation) continue;
      const hasContent = [translation.title, translation.nativeName, translation.shortDescription, translation.fullDescription, translation.transcript]
        .some((value) => value?.trim()) || Boolean(translation.pronunciations?.length);
      if (hasContent && (!translation.title?.trim() || !translation.shortDescription?.trim() || !translation.fullDescription?.trim())) {
        throw new Error(`${site.name}: ${language.toUpperCase()} translation needs a title, short description and historical narrative.`);
      }
    }
    stopIds.add(site.id);
  }

  for (const media of licensedMedia) {
    if (!stopIds.has(media.stopRef)) throw new Error(`Licensed image for ${media.stopName} does not reference a stop in this import.`);
    if (!media.imageUrl?.startsWith('https://')) throw new Error(`Licensed image for ${media.stopName} needs an HTTPS image URL.`);
    if (!media.rights?.rightsStatus || media.rights.rightsStatus === 'unknown') throw new Error(`Licensed image for ${media.stopName} needs a confirmed rights status.`);
    if (!media.rights.creatorName?.trim() || !media.rights.attributionText?.trim()) throw new Error(`Licensed image for ${media.stopName} needs creator and attribution details.`);
    if (['cc_by', 'cc_by_sa', 'other_licensed'].includes(media.rights.rightsStatus)
      && (!media.rights.sourceUrl?.trim() || !media.rights.licenseName?.trim() || !media.rights.licenseUrl?.trim())) {
      throw new Error(`Licensed image for ${media.stopName} needs its source page, licence name and licence URL.`);
    }
  }
}

export function useCmsContent(account: AccountContext | null, enabled: boolean) {
  const [organizations, setOrganizations] = useState<CmsOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [data, setData] = useState<CmsContentData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!account || !organizationId) return;
    setLoading(true); setError('');
    try { setData(await loadCmsContent(organizationId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'CMS content could not be loaded.'); }
    finally { setLoading(false); }
  }, [account, organizationId]);

  useEffect(() => {
    if (!enabled || !account) { setOrganizations([]); setOrganizationId(''); setData(emptyData); return; }
    let active = true;
    setLoading(true);
    void listCmsOrganizations(account).then((items) => {
      if (!active) return;
      setOrganizations(items);
      setOrganizationId((current) => items.some((item) => item.id === current) ? current : items[0]?.id || '');
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Organizations could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [account, enabled]);

  useEffect(() => { void refresh(); }, [refresh]);
  const organization = organizations.find((item) => item.id === organizationId);
  const role = organization?.role;
  const canEdit = role === 'super_admin' || role === 'administrator' || role === 'editor';
  const canReview = role === 'super_admin' || role === 'administrator' || role === 'reviewer';
  const canArchive = role === 'super_admin' || role === 'administrator';

  const run = useCallback(async <T,>(operation: () => Promise<T>) => {
    setLoading(true); setError('');
    try { const result = await operation(); await refresh(); return result; }
    catch (reason) { const message = reason instanceof Error ? reason.message : 'The CMS operation failed.'; setError(message); throw reason; }
    finally { setLoading(false); }
  }, [refresh]);

  return useMemo(() => ({
    ...data, organizations, organizationId, setOrganizationId, organization, loading, error, canEdit, canReview, canArchive, refresh,
    saveCity: (city: TourCity) => run(() => saveCmsCity(organizationId, account!.user.id, city)),
    saveTour: (tour: TourSummary) => run(() => saveCmsTour(organizationId, account!.user.id, tour)),
    saveSite: (site: HeritageSite) => run(() => saveCmsSite(organizationId, account!.user.id, site)),
    saveAiSource: (source: CmsAiSource) => run(() => saveCmsAiSource(organizationId, account!.user.id, source)),
    submitAiSource: (sourceId: string) => run(() => submitCmsAiSource(sourceId)),
    reviewAiSource: (sourceId: string, decision: 'published' | 'changes_requested' | 'disabled' | 'draft', notes?: string) => run(() => reviewCmsAiSource(sourceId, decision, notes)),
    saveTourBundle: (city: TourCity, sites: HeritageSite[]) => run(async () => {
      const savedCity = await saveCmsCity(organizationId, account!.user.id, city);
      const savedStops: HeritageSite[] = [];
      for (const [index, site] of sites.entries()) savedStops.push(await saveCmsSite(organizationId, account!.user.id, { ...site, cityId: savedCity.id, cityName: savedCity.name, tourId: savedCity.tourId, tourOrder: site.tourOrder || index + 1 }));
      await submitCmsContent('city', savedCity.id, savedCity as unknown as Record<string, unknown>);
      if (savedCity.tourId) await submitCmsContent('tour', savedCity.tourId, savedCity as unknown as Record<string, unknown>);
      for (const stop of savedStops) await submitCmsContent('stop', stop.id, stop as unknown as Record<string, unknown>);
      return savedCity;
    }),
    submitTourPackage: (city: TourCity, tour: TourSummary, sites: HeritageSite[]) => run(async () => {
      const submittable = new Set(['draft', 'changes_requested']);
      if (submittable.has(city.status || 'draft')) {
        await submitCmsContent('city', city.id, city as unknown as Record<string, unknown>);
      }
      if (submittable.has(tour.status || 'draft')) {
        await submitCmsContent('tour', tour.id, { ...tour, stopOrder: sites.map((site) => site.id) } as unknown as Record<string, unknown>);
      }
      for (const site of sites) {
        if (submittable.has(site.status || 'draft')) {
          await submitCmsContent('stop', site.id, site as unknown as Record<string, unknown>);
        }
      }
    }),
    archiveCity: (cityId: string, tourId?: string) => run(async () => {
      for (const site of data.sites.filter((item) => item.cityId === cityId)) await archiveCmsContent('stop', site.id);
      const cityTourIds = data.tours.filter((item) => item.cityId === cityId).map((item) => item.id);
      if (tourId && !cityTourIds.includes(tourId)) cityTourIds.push(tourId);
      for (const cityTourId of cityTourIds) await archiveCmsContent('tour', cityTourId);
      await archiveCmsContent('city', cityId);
    }),
    archiveTour: (tourId: string) => run(async () => {
      await archiveCmsContent('tour', tourId);
    }),
    reorderTourStops: (tour: TourSummary, stopIds: string[]) => run(() => reorderCmsTourStops(tour, stopIds)),
    replaceTourStops: (tour: TourSummary, stopIds: string[]) => run(() => replaceCmsTourStops(tour, stopIds)),
    archiveSite: (siteId: string) => run(() => archiveCmsContent('stop', siteId)),
    restoreContent: (kind: 'city' | 'tour' | 'stop', contentId: string) => run(() => restoreCmsContent(kind, contentId)),
    amendRevision: (revisionId: string, snapshot: Record<string, unknown>) => run(() => amendCmsRevision(revisionId, snapshot)),
    review: (item: CmsReviewItem, decision: 'approved' | 'changes_requested', notes?: string) => run(() => reviewCmsRevision(item, account!.user.id, decision, notes)),
    reviewMedia: (mediaId: string, decision: 'approved' | 'rejected', notes?: string) => run(() => reviewCmsMedia(mediaId, account!.user.id, decision, notes)),
    reviewNarration: (assetId: string, decision: 'pending_review' | 'approved' | 'changes_requested' | 'published' | 'superseded' | 'generated', notes?: string) => run(() => reviewCmsNarration(assetId, decision, notes)),
    reviewTourRating: (ratingId: string, decision: 'approved' | 'changes_requested' | 'rejected', notes?: string) => run(() => moderateTourRating(ratingId, decision, notes)),
    reviewTourComment: (commentId: string, decision: 'approved' | 'changes_requested' | 'rejected', notes?: string) => run(() => moderateTourComment(commentId, decision, notes)),
    reviewHeritageStory: (storyId: string, decision: 'approved' | 'changes_requested' | 'rejected', notes?: string) => run(() => moderateHeritageStory(storyId, decision, notes)),
    banCommunityUser: (userId: string, reason: string, durationDays?: number) => run(() => banCommunityUser(organizationId, userId, reason, durationDays)),
    liftCommunityBan: (banId: string, reason: string) => run(() => liftCommunityUserBan(banId, reason)),
    archiveRevision: (revisionId: string) => run(() => archiveCmsRevision(revisionId)),
    restoreRevision: (revisionId: string) => run(() => restoreCmsRevision(revisionId)),
    publish: (revisionId: string) => run(() => publishCmsRevision(revisionId)),
    uploadImage: (file: File, rights: Parameters<typeof uploadCmsImage>[3]) => run(() => uploadCmsImage(organizationId, account!.user.id, file, rights)),
    importData: (cities: TourCity[], sites: HeritageSite[], licensedMedia: CmsLicensedMediaImport[] = []) => run(async () => {
      // Validate the complete package before the first database write. Reuse an
      // existing draft on retry so an interrupted import resumes instead of
      // creating a duplicate city or stop.
      validateCmsImport(cities, sites, licensedMedia);
      const cityMap = new Map<string, TourCity>();
      const savedSiteMap = new Map<string, HeritageSite>();
      for (const city of cities) {
        const existing = data.cities.find((item) => item.status !== 'published'
          && item.name.trim().toLocaleLowerCase() === city.name.trim().toLocaleLowerCase()
          && item.country.trim().toLocaleLowerCase() === city.country.trim().toLocaleLowerCase());
        cityMap.set(city.id, await saveCmsCity(organizationId, account!.user.id, {
          ...city,
          id: existing?.id || '',
          tourId: existing?.tourId,
          organizationId,
        }));
      }
      for (const site of sites) {
        const city = site.cityId ? cityMap.get(site.cityId) : undefined;
        if (!city) throw new Error(`${site.name} does not reference a saved city.`);
        const existing = data.sites.find((item) => item.status !== 'published'
          && item.name.trim().toLocaleLowerCase() === site.name.trim().toLocaleLowerCase()
          && item.cityName?.trim().toLocaleLowerCase() === city.name.trim().toLocaleLowerCase());
        const saved = await saveCmsSite(organizationId, account!.user.id, { ...site, id: existing?.id || '', cityId: city.id, cityName: city.name, tourId: city.tourId, organizationId });
        savedSiteMap.set(site.id, saved);
      }
      for (const media of licensedMedia) {
        const saved = savedSiteMap.get(media.stopRef) || data.sites.find((site) => site.name === media.stopName && site.cityName === media.cityName);
        if (!saved) throw new Error(`No saved stop matches ${media.cityName} — ${media.stopName}.`);
        await importCmsLicensedImage(organizationId, saved.id, media);
      }
    }),
  }), [account, canArchive, canEdit, canReview, data, error, loading, organization, organizationId, organizations, refresh, run]);
}
