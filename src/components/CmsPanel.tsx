import { apiUrl } from '../lib/api';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArchiveRestore, ArrowDown, ArrowLeft, ArrowUp, Building2, Check, ChevronRight, Database, Download, Edit3, Headphones, ImagePlus, Library, Link2, Loader2, LogOut, MapPin, Maximize2, Minimize2, Plus, Search, ShieldCheck, Star, Trash2, Unlink, Upload, Users, WandSparkles } from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import { DEFAULT_INTEREST_LABELS, INTEREST_VALUES } from '../data/interests';
import { ContentLanguage, HeritageSite, HeritageSiteTranslation, PronunciationEntry, SiteCategory, TourCity, TourSummary } from '../types';
import { AccountContext, supabase } from '../lib/supabase';
import { CmsAiSource, CmsArchivedItem, CmsCommunityBan, CmsHeritageStory, CmsImageRights, CmsLicensedMediaImport, CmsMediaItem, CmsNarrationConfig, CmsNarrationItem, CmsNarrationVoice, CmsOrganization, CmsReviewItem, CmsTourComment, CmsTourRating, ContentKind, completeCmsRevisionPronunciation, loadCmsNarrationConfig, previewCmsNarration, previewCmsRevisionPronunciation, uploadCmsNarrationAudio, UploadedCmsImage, uploadCmsImage as uploadSharedCmsImage } from '../lib/cmsContent';
import { CmsStaffAccess } from './CmsStaffAccess';
import { CmsAiSources } from './CmsAiSources';
import { CONTENT_LANGUAGE_LABELS, CONTENT_LANGUAGES, incompleteTranslationFields, setSiteTranslation, siteTranslation, TranslationChange, translationChangesForReview, translationHasContent } from '../lib/siteTranslations';
import { GOOGLE_CUSTOM_PRONUNCIATION_LANGUAGES, normalizePronunciations, pronunciationSuggestion } from '../lib/pronunciation';
import { narrationCoverageCell, PILOT_NARRATION_LANGUAGES, publishedNarrationCount, PilotNarrationLanguage } from '../lib/narrationCoverage';
import { CmsCommunityModeration } from './CmsCommunityModeration';
import { CmsHeritageStoriesModeration } from './CmsHeritageStoriesModeration';
type CmsView = 'home' | 'wizard' | 'tour' | 'stops' | 'cities' | 'review' | 'backup' | 'archive' | 'staff' | 'sources' | 'narration';
const CATEGORIES = INTEREST_VALUES.map((value) => ({ value, label: DEFAULT_INTEREST_LABELS[value] }));
const emptySite = (city?: TourCity): HeritageSite => ({
    id: '', name: '', hebrewName: '', category: 'historic_site', cityId: city?.id,
    cityName: city?.name, lat: city?.centerLat || 0, lng: city?.centerLng || 0,
    address: '', shortDescription: '', fullDescription: '', audioDuration: 180,
    transcript: '', historicalPeriod: '', imageUrl: '', tags: [], keyFacts: [],
    organizationId: city?.organizationId, tourId: city?.tourId,
});
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const emptyTour = (cityId = ''): TourSummary => ({ id: '', cityId, title: '', subtitle: '', overview: '', completionMessage: '', difficulty: 'easy', wheelchairAccessible: false, accessMode: 'free' });
const emptyImageRights = (): CmsImageRights => ({ rightsStatus: 'unknown', creatorName: '', sourceUrl: '', licenseName: '', licenseUrl: '', attributionText: '', rightsNotes: '' });
interface PronunciationChange extends PronunciationEntry {
    language: ContentLanguage;
    previousPronunciation?: string;
}
export function pronunciationChangesForReview(snapshot: Record<string, unknown>, current?: HeritageSite): PronunciationChange[] {
    const translations = snapshot.translations && typeof snapshot.translations === 'object' ? snapshot.translations as Record<string, unknown> : {};
    return CONTENT_LANGUAGES.flatMap((language) => {
        const proposedTranslation = translations[language] && typeof translations[language] === 'object' ? translations[language] as Record<string, unknown> : {};
        const proposed = Array.isArray(proposedTranslation.pronunciations) ? proposedTranslation.pronunciations : [];
        const existing = current ? siteTranslation(current, language).pronunciations : [];
        return proposed.flatMap((raw) => {
            if (!raw || typeof raw !== 'object')
                return [];
            const value = raw as Record<string, unknown>;
            const phrase = String(value.phrase || '').trim();
            const pronunciation = String(value.pronunciation || '').trim();
            const encoding = String(value.encoding || '') as PronunciationEntry['encoding'];
            if (!phrase || !pronunciation || !['ipa', 'x_sampa', 'spoken_hint'].includes(encoding))
                return [];
            const prior = existing.find((entry) => entry.phrase.toLocaleLowerCase() === phrase.toLocaleLowerCase());
            const reviewerNote = String(value.reviewerNote || '').trim();
            if (prior && prior.pronunciation === pronunciation && prior.encoding === encoding && prior.reviewerNote === reviewerNote)
                return [];
            return [{ language, phrase, pronunciation, encoding, reviewerNote, previousPronunciation: prior?.pronunciation }];
        });
    });
}
const PronunciationRevisionReview: React.FC<{
    item: CmsReviewItem;
    changes: PronunciationChange[];
    onCompleted: () => void;
}> = ({ item, changes, onCompleted }) => {
    const [config, setConfig] = useState<CmsNarrationConfig | null>(null);
    const [audio, setAudio] = useState<Record<string, { url: string; reviewEventId: string }>>({});
    const [heard, setHeard] = useState<Record<string, boolean>>({});
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    useEffect(() => { let active = true; void loadCmsNarrationConfig().then((value) => { if (active)
        setConfig(value); }).catch((reason) => { if (active)
        setError(reason instanceof Error ? reason.message : 'Narration settings could not be loaded.'); }); return () => { active = false; }; }, []);
    useEffect(() => { if (changes.length > 0 && changes.every((change) => heard[`${change.language}:${change.phrase}`]))
        onCompleted(); }, [changes, heard, onCompleted]);
    const prepare = async (change: PronunciationChange) => {
        const key = `${change.language}:${change.phrase}`;
        const voice = config?.voices.find((entry) => entry.language === change.language)?.id;
        if (!voice)
            return setError(`No ${CONTENT_LANGUAGE_LABELS[change.language]} review voice is configured.`);
        setBusy(key);
        setError('');
        try {
            const result = await previewCmsRevisionPronunciation({ revisionId: item.id, language: change.language, phrase: change.phrase, voice });
            setAudio((current) => ({ ...current, [key]: { url: result.audioUrl, reviewEventId: result.reviewEventId } }));
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'The proposed pronunciation could not be played.');
        }
        finally {
            setBusy('');
        }
    };
    const complete = async (key: string) => {
        const sample = audio[key];
        if (!sample)
            return;
        setBusy(key);
        setError('');
        try {
            await completeCmsRevisionPronunciation(sample.reviewEventId);
            setHeard((current) => ({ ...current, [key]: true }));
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Listening completion could not be recorded. Play the sample again.');
        }
        finally {
            setBusy('');
        }
    };
    return <section className="mt-3 rounded-xl border-2 border-violet-200 bg-violet-50 p-3">
    <p className="text-[10px] font-bold uppercase tracking-wide text-violet-900">Pronunciation approval required</p>
    <p className="mt-1 text-[10px] leading-relaxed text-violet-800">Read the word and proposed guidance, then listen to the complete sample. Approval unlocks only after every sample finishes playing.</p>
    <div className="mt-3 space-y-3">{changes.map((change) => {
            const key = `${change.language}:${change.phrase}`;
            return <div key={key} className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-[9px] font-bold uppercase text-slate-500">{CONTENT_LANGUAGE_LABELS[change.language]} word or phrase</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{change.phrase}</p>
      <dl className="mt-2 grid gap-1 text-xs"><div><dt className="inline font-bold text-slate-600">Proposed {change.encoding.replace('_', '-').toUpperCase()}: </dt><dd className="inline text-violet-950">{change.pronunciation}</dd></div>{change.previousPronunciation && <div><dt className="inline font-bold text-slate-600">Previous: </dt><dd className="inline line-through">{change.previousPronunciation}</dd></div>}{change.reviewerNote && <div><dt className="inline font-bold text-slate-600">Editor note: </dt><dd className="inline">{change.reviewerNote}</dd></div>}</dl>
      {!audio[key] ? <button type="button" disabled={!config || config.mode !== 'live' || busy === key} onClick={() => void prepare(change)} className="mt-3 w-full rounded-xl bg-violet-800 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy === key ? 'Preparing pronunciation…' : 'Hear proposed pronunciation'}</button> : <><audio className="mt-3 w-full" controls autoPlay preload="auto" src={audio[key].url} onEnded={() => void complete(key)}>Your browser does not support audio review.</audio><p className={`mt-1 text-[10px] font-bold ${heard[key] ? 'text-emerald-700' : 'text-amber-700'}`}>{heard[key] ? '✓ Listening recorded in the audit trail — ready for approval' : busy === key ? 'Recording completed listening…' : 'Listen until the sample finishes to unlock approval.'}</p></>}
    </div>;
        })}</div>
    {config?.mode === 'simulator' && <p className="mt-3 rounded-lg bg-amber-100 p-2 text-[10px] font-bold text-amber-900">Live narration is not enabled. Approval remains locked because a simulator cannot demonstrate the proposed phonetics.</p>}
    {error && <p className="mt-3 rounded-lg bg-rose-100 p-2 text-[10px] font-bold text-rose-900">{error}</p>}
  </section>;
};
const TranslationRevisionReview: React.FC<{ changes: TranslationChange[] }> = ({ changes }) => <section className="mt-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-3">
  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-900">Localized content for review</p>
  <p className="mt-1 text-[10px] leading-relaxed text-blue-800">Read every proposed field below before approving. Previous published wording is shown when it existed.</p>
  <div className="mt-3 space-y-3">{changes.map((change) => <article key={change.language} className="rounded-xl bg-white p-3 shadow-sm">
    <p className="text-xs font-bold text-blue-950">{CONTENT_LANGUAGE_LABELS[change.language]}</p>
    <div className="mt-2 space-y-3">{change.fields.map((fieldChange) => <div key={fieldChange.key}>
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{fieldChange.label}</p>
      {fieldChange.previous && <div className="mt-1 rounded-lg bg-slate-50 p-2 text-[10px] leading-relaxed text-slate-500"><span className="font-bold">Previous: </span><span className="whitespace-pre-wrap">{fieldChange.previous}</span></div>}
      <div className="mt-1 rounded-lg border border-blue-100 bg-blue-50/60 p-2 text-xs leading-relaxed text-slate-900"><span className="font-bold text-blue-900">Proposed: </span><span className="whitespace-pre-wrap">{fieldChange.proposed || '(empty)'}</span></div>
    </div>)}</div>
  </article>)}</div>
</section>;
const ReviewField: React.FC<{ label: string; value: unknown; preserveWhitespace?: boolean }> = ({ label, value, preserveWhitespace = false }) => {
    const rendered = Array.isArray(value) ? value.filter(Boolean).join(', ') : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value ?? '').trim();
    if (!rendered)
        return null;
    return <div className="rounded-xl border border-slate-200 bg-white p-3">
    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className={`mt-1 text-sm leading-relaxed text-slate-900 ${preserveWhitespace ? 'whitespace-pre-wrap' : ''}`}>{rendered}</dd>
  </div>;
};
const ProposedContentReview: React.FC<{
    item: CmsReviewItem;
    cities: TourCity[];
    tours: TourSummary[];
    sites: HeritageSite[];
}> = ({ item, cities, tours, sites }) => {
    const snapshot = item.snapshot;
    const translations = snapshot.translations && typeof snapshot.translations === 'object' ? snapshot.translations as Partial<Record<ContentLanguage, Partial<HeritageSiteTranslation>>> : {};
    const stopOrder = Array.isArray(snapshot.stopOrder) ? snapshot.stopOrder.map(String) : [];
    const stopNames = stopOrder.map((stopId) => sites.find((site) => site.id === stopId)?.name || `Stop ${stopId.slice(0, 8)}`);
    const cityName = cities.find((city) => city.id === String(snapshot.cityId || ''))?.name;
    const tourName = tours.find((tour) => tour.id === String(snapshot.tourId || ''))?.title;
    const localized = CONTENT_LANGUAGES.flatMap((language) => {
        const translation = translations[language];
        if (!translation || !translationHasContent(translation as HeritageSiteTranslation))
            return [];
        return [{ language, translation }];
    });
    return <section className="mt-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-3" aria-label={`Complete proposed ${item.contentKind} content`}>
    <div className="flex items-start gap-2">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"/>
      <div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900">Complete proposal — read before approval</p><p className="mt-1 text-[10px] leading-relaxed text-emerald-800">These are the exact human-readable fields that will become eligible for publication.</p></div>
    </div>
    <dl className="mt-3 grid gap-2">
      {item.contentKind === 'city' && <>
        <ReviewField label="Destination" value={`${String(snapshot.flagEmoji || '')} ${String(snapshot.name || '')}`.trim()}/>
        <ReviewField label="Country" value={snapshot.country}/><ReviewField label="Tour subtitle" value={snapshot.subtitle}/>
        <ReviewField label="City description" value={snapshot.description} preserveWhitespace/>
        <ReviewField label="GPS coordinates" value={`${String(snapshot.centerLat ?? '')}, ${String(snapshot.centerLng ?? '')}`}/>
      </>}
      {item.contentKind === 'tour' && <>
        <ReviewField label="Tour title" value={snapshot.title}/><ReviewField label="City" value={cityName || snapshot.cityId}/>
        <ReviewField label="Subtitle" value={snapshot.subtitle}/><ReviewField label="Complete overview" value={snapshot.overview} preserveWhitespace/>
        <ReviewField label="End-of-tour message" value={snapshot.completionMessage} preserveWhitespace/>
        <ReviewField label="Estimated duration" value={snapshot.estimatedDurationMinutes ? `${snapshot.estimatedDurationMinutes} minutes` : ''}/>
        <ReviewField label="Distance" value={snapshot.distanceMetres ? `${snapshot.distanceMetres} metres` : ''}/>
        <ReviewField label="Difficulty" value={snapshot.difficulty}/><ReviewField label="Wheelchair accessible" value={snapshot.wheelchairAccessible}/>
        <ReviewField label="Access" value={snapshot.accessMode}/><ReviewField label="Stop order" value={stopNames}/>
      </>}
      {item.contentKind === 'stop' && <>
        <ReviewField label="Stop title" value={snapshot.name}/><ReviewField label="Native / alternate name" value={snapshot.hebrewName}/>
        <ReviewField label="Tour" value={tourName || snapshot.tourId}/><ReviewField label="Category" value={String(snapshot.category || '').replaceAll('_', ' ')}/>
        <ReviewField label="Short description" value={snapshot.shortDescription} preserveWhitespace/>
        <ReviewField label="Complete historical story" value={snapshot.fullDescription} preserveWhitespace/>
        <ReviewField label="Narration transcript" value={snapshot.transcript} preserveWhitespace/>
        <ReviewField label="Historical period" value={snapshot.historicalPeriod}/><ReviewField label="Address" value={snapshot.address}/>
        <ReviewField label="GPS coordinates" value={`${String(snapshot.lat ?? '')}, ${String(snapshot.lng ?? '')}`}/>
        <ReviewField label="Tags" value={snapshot.tags}/><ReviewField label="Key facts" value={snapshot.keyFacts}/>
      </>}
    </dl>
    {localized.length > 0 && <div className="mt-3 space-y-2"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900">Localized versions included</p>{localized.map(({ language, translation }) => <details key={language} className="rounded-xl border border-emerald-200 bg-white p-3"><summary className="cursor-pointer text-xs font-bold text-emerald-950">{CONTENT_LANGUAGE_LABELS[language]} — view complete text</summary><dl className="mt-3 grid gap-2"><ReviewField label="Title" value={translation.title}/><ReviewField label="Native name" value={translation.nativeName}/><ReviewField label="Short description" value={translation.shortDescription} preserveWhitespace/><ReviewField label="Full story" value={translation.fullDescription} preserveWhitespace/><ReviewField label="Narration transcript" value={translation.transcript} preserveWhitespace/></dl></details>)}</div>}
  </section>;
};
const InlineRevisionTextEditor: React.FC<{
    item: CmsReviewItem;
    onCancel: () => void;
    onSave: (snapshot: Record<string, unknown>) => Promise<void>;
}> = ({ item, onCancel, onSave }) => {
    const [draft, setDraft] = useState<Record<string, unknown>>(() => JSON.parse(JSON.stringify(item.snapshot)) as Record<string, unknown>);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const editorField = 'w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
    const editorLabel = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-blue-800';
    const setText = (key: string, value: string | string[]) => setDraft((current) => ({ ...current, [key]: value }));
    const translations = draft.translations && typeof draft.translations === 'object' ? draft.translations as Record<string, Record<string, unknown>> : {};
    const localizedLanguages = CONTENT_LANGUAGES.filter((language) => translations[language] && translationHasContent(translations[language] as unknown as HeritageSiteTranslation));
    const setTranslationText = (language: ContentLanguage, key: string, value: string) => setDraft((current) => {
        const currentTranslations = current.translations && typeof current.translations === 'object' ? current.translations as Record<string, Record<string, unknown>> : {};
        return { ...current, translations: { ...currentTranslations, [language]: { ...(currentTranslations[language] || {}), [key]: value } } };
    });
    const requiredTitle = String(item.contentKind === 'tour' ? draft.title : draft.name || '').trim();
    const changed = JSON.stringify(draft) !== JSON.stringify(item.snapshot);
    const save = async () => {
        setSaving(true);
        setError('');
        try {
            await onSave(draft);
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'The edited proposal could not be saved.');
        }
        finally {
            setSaving(false);
        }
    };
    const input = (labelText: string, key: string) => <div><label className={editorLabel}>{labelText}</label><input className={editorField} value={String(draft[key] || '')} onChange={(event) => setText(key, event.target.value)}/></div>;
    const textarea = (labelText: string, key: string, rows = 5) => <div><label className={editorLabel}>{labelText}</label><textarea className={editorField} rows={rows} value={String(draft[key] || '')} onChange={(event) => setText(key, event.target.value)}/></div>;
    return <section className="mt-3 rounded-2xl border-2 border-blue-300 bg-blue-50 p-3" aria-label={`Edit proposed ${item.contentKind} text`}>
      <div className="flex items-start gap-2"><Edit3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-800"/><div><p className="text-xs font-bold text-blue-950">Edit proposal text</p><p className="mt-1 text-[10px] leading-relaxed text-blue-800">Saving preserves this submission in the audit trail and creates the next revision for approval. GPS, category, route order, access and identity fields cannot be changed here.</p></div></div>
      <div className="mt-3 space-y-3">
        {item.contentKind === 'city' && <>{input('Destination name', 'name')}{input('Tour subtitle', 'subtitle')}{textarea('City description', 'description', 8)}</>}
        {item.contentKind === 'tour' && <>{input('Tour title', 'title')}{input('Subtitle', 'subtitle')}{textarea('Complete overview', 'overview', 8)}{textarea('End-of-tour message', 'completionMessage', 4)}</>}
        {item.contentKind === 'stop' && <>
          {input('Stop title', 'name')}{input('Native / alternate name', 'hebrewName')}{input('Address', 'address')}{input('Historical period', 'historicalPeriod')}
          {textarea('Short description', 'shortDescription', 4)}{textarea('Complete historical story', 'fullDescription', 10)}{textarea('Narration transcript', 'transcript', 10)}
          <div><label className={editorLabel}>Tags — one per line</label><textarea className={editorField} rows={4} value={(Array.isArray(draft.tags) ? draft.tags : []).map(String).join('\n')} onChange={(event) => setText('tags', event.target.value.split('\n').map((value) => value.trim()).filter(Boolean))}/></div>
          <div><label className={editorLabel}>Key facts — one per line</label><textarea className={editorField} rows={5} value={(Array.isArray(draft.keyFacts) ? draft.keyFacts : []).map(String).join('\n')} onChange={(event) => setText('keyFacts', event.target.value.split('\n').map((value) => value.trim()).filter(Boolean))}/></div>
          {localizedLanguages.map((language) => <details key={language} className="rounded-xl border border-blue-200 bg-white p-3"><summary className="cursor-pointer text-xs font-bold text-blue-950">Edit {CONTENT_LANGUAGE_LABELS[language]} text</summary><div className="mt-3 space-y-3">{(['title','nativeName','shortDescription','fullDescription','transcript'] as const).map((key) => <div key={key}><label className={editorLabel}>{key === 'nativeName' ? 'Native name' : key === 'shortDescription' ? 'Short description' : key === 'fullDescription' ? 'Full story' : key === 'transcript' ? 'Narration transcript' : 'Title'}</label><textarea className={editorField} rows={key === 'fullDescription' || key === 'transcript' ? 7 : key === 'shortDescription' ? 4 : 2} value={String(translations[language]?.[key] || '')} onChange={(event) => setTranslationText(language, key, event.target.value)}/></div>)}</div></details>)}
        </>}
      </div>
      {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={saving} onClick={onCancel} className="rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 disabled:opacity-40">Cancel</button><button type="button" disabled={saving || !changed || !requiredTitle} onClick={() => void save()} className="flex items-center justify-center gap-2 rounded-xl bg-blue-900 py-2.5 text-xs font-bold text-white disabled:opacity-40">{saving ? <><Loader2 className="h-4 w-4 animate-spin"/>Saving…</> : 'Save edited proposal'}</button></div>
    </section>;
};
interface CmsPanelProps {
    cities: TourCity[];
    tours: TourSummary[];
    sites: HeritageSite[];
    reviewItems: CmsReviewItem[];
    archivedReviewItems: CmsReviewItem[];
    mediaItems: CmsMediaItem[];
    narrationItems: CmsNarrationItem[];
    archivedItems: CmsArchivedItem[];
    aiSources: CmsAiSource[];
    tourRatings: CmsTourRating[];
    tourComments: CmsTourComment[];
    heritageStories: CmsHeritageStory[];
    communityBans: CmsCommunityBan[];
    organizations: CmsOrganization[];
    organizationId: string;
    onSelectOrganization: (organizationId: string) => void;
    onRefresh: () => Promise<void>;
    loading: boolean;
    error: string;
    canEdit: boolean;
    canReview: boolean;
    canArchive: boolean;
    onSaveCity: (city: TourCity) => Promise<TourCity>;
    onSaveTour: (tour: TourSummary) => Promise<TourSummary>;
    onDeleteCity: (cityId: string, tourId?: string) => Promise<void>;
    onDeleteTour: (tourId: string) => Promise<void>;
    onReorderTourStops: (tour: TourSummary, stopIds: string[]) => Promise<'saved' | 'submitted'>;
    onReplaceTourStops: (tour: TourSummary, stopIds: string[]) => Promise<'saved' | 'submitted'>;
    onSaveSite: (site: HeritageSite) => Promise<HeritageSite>;
    onDeleteSite: (siteId: string) => Promise<void>;
    onRestoreContent: (kind: ContentKind, contentId: string) => Promise<void>;
    onArchiveRevision: (revisionId: string) => Promise<void>;
    onRestoreRevision: (revisionId: string) => Promise<void>;
    onSaveTourBundle: (city: TourCity, sites: HeritageSite[]) => Promise<TourCity>;
    onSubmitTourPackage: (city: TourCity, tour: TourSummary, sites: HeritageSite[]) => Promise<void>;
    onImport: (cities: TourCity[], sites: HeritageSite[], licensedMedia?: CmsLicensedMediaImport[]) => Promise<void>;
    onUploadImage: (file: File, rights: CmsImageRights) => Promise<UploadedCmsImage>;
    onAmendRevision: (revisionId: string, snapshot: Record<string, unknown>) => Promise<string>;
    onReview: (item: CmsReviewItem, decision: 'approved' | 'changes_requested', notes?: string) => Promise<void>;
    onReviewMedia: (mediaId: string, decision: 'approved' | 'rejected', notes?: string) => Promise<void>;
    onReviewNarration: (assetId: string, decision: 'pending_review' | 'approved' | 'changes_requested' | 'published' | 'superseded' | 'generated', notes?: string) => Promise<void>;
    onReviewTourRating: (ratingId: string, decision: 'approved' | 'changes_requested' | 'rejected', notes?: string) => Promise<void>;
    onReviewTourComment: (commentId: string, decision: 'approved' | 'changes_requested' | 'rejected', notes?: string) => Promise<void>;
    onReviewHeritageStory: (storyId: string, decision: 'approved' | 'changes_requested' | 'rejected', notes?: string) => Promise<void>;
    onBanCommunityUser: (userId: string, reason: string, durationDays?: number) => Promise<string>;
    onLiftCommunityBan: (banId: string, reason: string) => Promise<void>;
    onPublish: (revisionId: string) => Promise<void>;
    onSaveAiSource: (source: CmsAiSource) => Promise<CmsAiSource>;
    onSubmitAiSource: (sourceId: string) => Promise<void>;
    onReviewAiSource: (sourceId: string, decision: 'published' | 'changes_requested' | 'disabled' | 'draft', notes?: string) => Promise<void>;
    account: AccountContext;
    onSignOut: () => void;
}
export const CmsPanel: React.FC<CmsPanelProps> = ({ cities, tours, sites, reviewItems, archivedReviewItems, mediaItems, narrationItems, archivedItems, aiSources, tourRatings, tourComments, heritageStories, communityBans, organizations, organizationId, onSelectOrganization, onRefresh, loading, error, canEdit, canReview, canArchive, onSaveCity, onSaveTour, onDeleteCity, onDeleteTour, onReorderTourStops, onReplaceTourStops, onSaveSite, onDeleteSite, onRestoreContent, onArchiveRevision, onRestoreRevision, onSaveTourBundle, onSubmitTourPackage, onImport, onUploadImage, onAmendRevision, onReview, onReviewMedia, onReviewNarration, onReviewTourRating, onReviewTourComment, onReviewHeritageStory, onBanCommunityUser, onLiftCommunityBan, onPublish, onSaveAiSource, onSubmitAiSource, onReviewAiSource, account, onSignOut }) => {
    const [view, setView] = useState<CmsView>('home');
    const [wizardStep, setWizardStep] = useState(1);
    const [draftCity, setDraftCity] = useState<TourCity>({ id: '', name: '', country: '', flagEmoji: '', subtitle: '', description: '', centerLat: 0, centerLng: 0 });
    const [wizardStops, setWizardStops] = useState<HeritageSite[]>([]);
    const [draftStop, setDraftStop] = useState<HeritageSite>(emptySite());
    const [wizardImageRights, setWizardImageRights] = useState<CmsImageRights>(emptyImageRights);
    const [editingSite, setEditingSite] = useState<HeritageSite | null>(null);
    const [editingCity, setEditingCity] = useState<TourCity | null>(null);
    const [editingTour, setEditingTour] = useState<TourSummary | null>(null);
    const [query, setQuery] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [tourFilter, setTourFilter] = useState('');
    const [assigningStops, setAssigningStops] = useState(false);
    const [message, setMessage] = useState('');
    const [pendingImport, setPendingImport] = useState<{
        cities: TourCity[];
        sites: HeritageSite[];
        licensedMedia: CmsLicensedMediaImport[];
    } | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
    const [pronunciationReviewCompleted, setPronunciationReviewCompleted] = useState<Record<string, boolean>>({});
    const [editingRevisionId, setEditingRevisionId] = useState('');
    const [wideWorkspace, setWideWorkspace] = useState(() => {
        try {
            const saved = localStorage.getItem('moreshet_cms_workspace');
            if (saved)
                return saved === 'wide';
            return window.matchMedia('(min-width: 1024px)').matches;
        }
        catch {
            return false;
        }
    });
    const importRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        document.documentElement.dataset.cmsWorkspace = wideWorkspace ? 'wide' : 'compact';
        return () => { delete document.documentElement.dataset.cmsWorkspace; };
    }, [wideWorkspace]);
    const sortedCities = useMemo(() => [...cities].sort((a, b) => a.name.localeCompare(b.name)), [cities]);
    const sortedTours = useMemo(() => [...tours].sort((a, b) => {
        const cityCompare = (cities.find((city) => city.id === a.cityId)?.name || '').localeCompare(cities.find((city) => city.id === b.cityId)?.name || '');
        return cityCompare || a.title.localeCompare(b.title);
    }), [cities, tours]);
    const filteredSites = useMemo(() => sites
        .filter((site) => !cityFilter || site.cityId === cityFilter)
        .filter((site) => `${site.name} ${site.cityName} ${site.category} ${site.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => (a.tourOrder ?? 999) - (b.tourOrder ?? 999)), [sites, query, cityFilter]);
    const catalogueReadiness = useMemo(() => {
        const publishedCities = cities.filter((city) => city.status === 'published');
        const publishedTours = tours.filter((tour) => tour.status === 'published');
        const publishedSites = sites.filter((site) => site.status === 'published');
        const stopCount = (tourId: string) => publishedSites.filter((site) => site.tourId === tourId || site.tourAssignments?.some((assignment) => assignment.tourId === tourId)).length;
        const askHerzlReadyTours = publishedTours.filter((tour) => publishedCities.some((city) => city.id === tour.cityId) && stopCount(tour.id) > 0);
        return {
            cities: publishedCities.length,
            tours: publishedTours.length,
            sites: publishedSites.length,
            askHerzlReadyTours: askHerzlReadyTours.length,
            fiveStopTours: askHerzlReadyTours.filter((tour) => stopCount(tour.id) >= 5).length,
        };
    }, [cities, sites, tours]);
    const narrationStops = useMemo(() => [...sites]
        .filter((site) => site.status !== 'archived')
        .sort((left, right) => {
        const leftCity = cities.find((city) => city.id === left.cityId)?.name || left.cityName || '';
        const rightCity = cities.find((city) => city.id === right.cityId)?.name || right.cityName || '';
        return leftCity.localeCompare(rightCity) || (left.tourOrder ?? 999) - (right.tourOrder ?? 999) || left.name.localeCompare(right.name);
    }), [cities, sites]);
    const narrationPublishedCount = useMemo(() => publishedNarrationCount(
        narrationStops.map((site) => site.id), narrationItems,
    ), [narrationItems, narrationStops]);
    const narrationCoverageTotal = narrationStops.length * PILOT_NARRATION_LANGUAGES.length;
    const geocode = async (locationQuery: string, callback: (lat: number, lng: number) => void, scope: 'city' | 'landmark' = 'city') => {
        if (!locationQuery.trim())
            return setMessage('Enter a city or landmark name before finding its coordinates.');
        setIsGeocoding(true);
        setMessage('Finding the real-world location…');
        try {
            const response = await fetch(apiUrl(`/api/geocode?q=${encodeURIComponent(locationQuery)}&scope=${scope}`));
            const data = await response.json();
            if (!response.ok || !data.result)
                throw new Error(data.error || 'No reliable location match was found.');
            callback(data.result.lat, data.result.lng);
            setMessage(`Coordinates found: ${data.result.displayName}`);
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : 'No reliable location match was found. Enter coordinates manually.');
        }
        finally {
            setIsGeocoding(false);
        }
    };
    const locate = (callback: (lat: number, lng: number) => void) => {
        const city = editingCity;
        return geocode(`${city?.name || ''}, ${city?.country || ''}`, callback);
    };
    const selectCountry = (countryName: string, setter: React.Dispatch<React.SetStateAction<TourCity>>) => {
        const country = COUNTRIES.find((item) => item.name === countryName);
        setter((current) => ({ ...current, country: countryName, flagEmoji: country?.flagEmoji || '' }));
    };
    const uploadImage = async (file: File | undefined, setter: React.Dispatch<React.SetStateAction<HeritageSite>>) => {
        if (!file)
            return;
        setMessage('Uploading image securely…');
        try {
            const uploaded = await onUploadImage(file, wizardImageRights);
            setter((current) => ({ ...current, imageUrl: uploaded.url, imageMediaId: uploaded.mediaId }));
            setMessage('Image uploaded and awaiting media approval.');
        }
        catch (reason) {
            setMessage(reason instanceof Error ? reason.message : 'Image upload failed.');
        }
    };
    const resetWizard = () => {
        setWizardStep(1);
        setDraftCity({ id: '', name: '', country: '', flagEmoji: '', subtitle: '', description: '', centerLat: 0, centerLng: 0 });
        setWizardStops([]);
        setWizardImageRights(emptyImageRights());
        setDraftStop(emptySite());
        setMessage('');
    };
    const addWizardStop = () => {
        if (!draftStop.name.trim())
            return setMessage('Enter a stop title first.');
        const cityId = draftCity.id || slugify(draftCity.name);
        setWizardStops((current) => [...current, { ...draftStop, id: draftStop.id || `${cityId}-${slugify(draftStop.name)}-${current.length + 1}`, cityId, cityName: draftCity.name }]);
        setDraftStop(emptySite({ ...draftCity, id: cityId }));
        setMessage('Stop added.');
    };
    const publishTour = async () => {
        if (wizardStep === 3) {
            if (wizardStops.length === 0)
                return setMessage('Add at least one stop before reviewing the tour.');
            setWizardStep(4);
            setMessage('Review the complete tour before submitting it for approval.');
            return;
        }
        if (!draftCity.name.trim() || !draftCity.country)
            return setMessage('City name and country are required.');
        const city = { ...draftCity, id: draftCity.id || slugify(draftCity.name) };
        setMessage('Saving the tour and submitting it for review…');
        try {
            await onSaveTourBundle(city, wizardStops);
            resetWizard();
            setView('home');
            setMessage('Tour submitted to the review queue.');
        }
        catch (reason) {
            setMessage(reason instanceof Error ? reason.message : 'The tour could not be submitted.');
        }
    };
    const exportJson = () => {
        const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), cities, sites }, null, 2)], { type: 'application/json' });
        const anchor = document.createElement('a');
        anchor.href = URL.createObjectURL(blob);
        anchor.download = `heritage-tour-backup-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(anchor.href);
    };
    const importJson = async (file?: File) => {
        if (!file)
            return;
        try {
            const data = JSON.parse(await file.text());
            if (!Array.isArray(data.cities) || !Array.isArray(data.sites) || data.licensedMedia !== undefined && !Array.isArray(data.licensedMedia))
                throw new Error();
            const licensedMedia = Array.isArray(data.licensedMedia) ? data.licensedMedia : [];
            setPendingImport({ cities: data.cities, sites: data.sites, licensedMedia });
            setMessage(`Ready to import ${data.cities.length} cities, ${data.sites.length} stops and ${licensedMedia.length} licensed photographs. Review and confirm below.`);
        }
        catch {
            setMessage('That file is not a valid tour database backup.');
        }
    };
    const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
    const label = 'mb-1 block text-xs font-bold text-slate-600';
    const panelClass = `mx-auto h-screen overflow-y-auto bg-slate-50 p-4 pb-24 ${wideWorkspace ? 'max-w-md lg:max-w-none lg:px-6 lg:pb-8' : 'max-w-md'}`;
    const toggleWorkspace = () => {
        setWideWorkspace((current) => {
            const next = !current;
            try {
                localStorage.setItem('moreshet_cms_workspace', next ? 'wide' : 'compact');
            }
            catch { /* Continue without persistence. */ }
            return next;
        });
    };
    if (view === 'home')
        return <div className={panelClass} data-cms-workspace={wideWorkspace ? 'wide' : 'compact'}>
    <div className="rounded-3xl bg-blue-950 p-5 text-white shadow-lg"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Content Management</p><h2 className="mt-1 text-2xl font-bold">Tour CMS</h2></div><button type="button" onClick={onSignOut} className="flex items-center gap-1 rounded-xl border border-white/25 px-3 py-2 text-xs font-bold text-white" aria-label="Sign out of CMS"><LogOut className="h-4 w-4"/> Sign out</button></div><p className="mt-2 text-sm text-blue-100">Create, maintain and protect your heritage tour database.</p><p className="mt-2 truncate text-[10px] text-blue-200">Signed in as {account.profile.display_name || account.user.email}</p></div>
    <div className="mt-3 hidden items-center justify-between rounded-2xl border border-blue-100 bg-white p-3 lg:flex"><div><p className="text-xs font-bold text-blue-950">Desktop editing workspace</p><p className="mt-0.5 text-[10px] text-slate-500">Use the full browser width for longer tour and stop records.</p></div><button type="button" onClick={toggleWorkspace} className="flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 px-3 text-xs font-bold text-blue-900" aria-label={wideWorkspace ? 'Use compact CMS workspace' : 'Use full-screen CMS workspace'}>{wideWorkspace ? <Minimize2 className="h-4 w-4"/> : <Maximize2 className="h-4 w-4"/>}{wideWorkspace ? 'Compact workspace' : 'Expand workspace'}</button></div>
    {message && <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{message}</p>}
    <div className="mt-3 rounded-2xl border border-blue-100 bg-white p-3"><label className={label}>Working organization</label><select aria-label="Working organization" className={field} value={organizationId} onChange={(event) => onSelectOrganization(event.target.value)}>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name} — {organization.role.replace('_', ' ')}</option>)}</select>{loading && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-blue-800"><Loader2 className="h-3.5 w-3.5 animate-spin"/>Loading shared CMS data…</p>}{error && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-800">{error}</p>}</div>
    <div className={`mt-3 rounded-2xl border p-3 ${catalogueReadiness.askHerzlReadyTours > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
      <p className="text-xs font-bold">Public catalogue readiness</p>
      <p className="mt-1 text-[11px] leading-relaxed">{catalogueReadiness.cities} published cities · {catalogueReadiness.tours} tours · {catalogueReadiness.sites} stops · {catalogueReadiness.askHerzlReadyTours} Ask Herzl-ready tours · {catalogueReadiness.fiveStopTours} five-stop pilot tours</p>
      {catalogueReadiness.askHerzlReadyTours === 0 && <p className="mt-2 text-[11px] font-semibold leading-relaxed">Visitors are currently shown demonstration content. Restore or create a city and tour, assign its stops, then submit, approve and publish the city, tour and every stop.</p>}
    </div>
    <div className={`mt-4 grid gap-3 ${wideWorkspace ? 'lg:grid-cols-2' : ''}`}>{[
                ...(canEdit ? [['wizard', WandSparkles, 'New Tour Wizard', 'Create a city tour and submit it for review'], ['tour', Edit3, 'Edit Tour', 'Edit complete tours, stops and ordering at any time'], ['stops', MapPin, 'Edit Stops', `${sites.length} shared stops`], ['cities', Building2, 'Edit Cities', `${cities.length} shared destinations`], ['backup', Database, 'Backup / Import', 'Export or import draft content']] : []),
                ...((canEdit || canReview) ? [['sources', Library, 'AI Sources', `${aiSources.filter((source) => source.status === 'published').length} approved · ${aiSources.filter((source) => source.status === 'pending_review').length} awaiting review`]] : []),
                ...((canEdit || canReview) ? [['narration', Headphones, 'Narration Coverage', `${narrationPublishedCount}/${narrationCoverageTotal} pilot recordings published`], ['review', ShieldCheck, 'Review & Publish', `${reviewItems.length + narrationItems.filter((item) => item.status !== 'published' && item.status !== 'superseded').length + tourRatings.filter((item) => item.status === 'pending_review').length + tourComments.filter((item) => item.status === 'pending_review').length + heritageStories.filter((item) => item.status === 'pending_review').length} item(s) awaiting action`]] : []),
                ...(canArchive ? [['archive', ArchiveRestore, 'Archive & Restore', `${archivedItems.length + archivedReviewItems.length + narrationItems.filter((item) => item.status === 'superseded').length + aiSources.filter((source) => source.status === 'disabled').length} recoverable item(s)`]] : []),
                ...(account.canManageStaff ? [['staff', Users, 'Staff & Access', 'Create staff accounts and temporary passwords']] : []),
            ].map(([target, Icon, title, subtitle]) => <button key={String(target)} onClick={() => { setView(target as CmsView); setMessage(''); }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-300">
      <span className="rounded-xl bg-blue-50 p-2.5 text-blue-900"><Icon className="h-5 w-5"/></span><span className="flex-1"><strong className="block text-sm text-slate-900">{String(title)}</strong><span className="text-xs text-slate-500">{String(subtitle)}</span></span><ChevronRight className="h-5 w-5 text-slate-400"/>
    </button>)}</div>
  </div>;
    const header = <div className={wideWorkspace ? 'lg:sticky lg:top-0 lg:z-20 lg:-mx-2 lg:mb-4 lg:bg-slate-50/95 lg:px-2 lg:pb-2 lg:pt-1 lg:backdrop-blur' : ''}><div className="mb-1 flex items-center gap-3"><button onClick={() => { if (view === 'wizard' && wizardStep > 1) {
        setWizardStep((step) => step - 1);
        return;
    } setView('home'); setEditingSite(null); setEditingCity(null); setEditingTour(null); setAssigningStops(false); }} className="rounded-xl border bg-white p-2" title={view === 'wizard' && wizardStep > 1 ? 'Previous wizard step' : 'Back to CMS'}><ArrowLeft className="h-4 w-4"/></button><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Tour CMS</p><h2 className="truncate text-lg font-bold text-slate-900">{view === 'wizard' ? 'New Tour Wizard' : view === 'tour' ? 'Edit Tour' : view === 'stops' ? 'Edit Stops' : view === 'cities' ? 'Edit Cities' : view === 'review' ? 'Review & Publish' : view === 'archive' ? 'Archive & Restore' : view === 'staff' ? 'Staff & Access' : view === 'sources' ? 'AI Sources' : view === 'narration' ? 'Narration Coverage' : 'Backup / Import'}</h2></div><button type="button" onClick={toggleWorkspace} className="hidden min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-xs font-bold text-blue-900 lg:flex" title={wideWorkspace ? 'Use compact CMS workspace' : 'Use full-screen CMS workspace'} aria-label={wideWorkspace ? 'Use compact CMS workspace' : 'Use full-screen CMS workspace'}>{wideWorkspace ? <Minimize2 className="h-4 w-4"/> : <Maximize2 className="h-4 w-4"/>}<span className="hidden xl:inline">{wideWorkspace ? 'Compact workspace' : 'Expand workspace'}</span></button><button type="button" onClick={onSignOut} className="rounded-xl border bg-white p-2 text-rose-700" title="Sign out of CMS" aria-label="Sign out of CMS"><LogOut className="h-4 w-4"/></button></div><p className="mb-4 pl-12 text-[9px] text-slate-400">Location search © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></p></div>;
    if (view === 'staff')
        return <div className="mx-auto h-[calc(100vh-120px)] max-w-md overflow-y-auto bg-slate-50 p-4 pb-24">{header}<CmsStaffAccess account={account} onSignOut={onSignOut}/></div>;
    if (view === 'sources')
        return <div className={panelClass}>{header}<div className="-mt-2 mb-4 pl-12 text-lg font-bold text-slate-900">AI Sources</div><CmsAiSources organizationId={organizationId} sources={aiSources} cities={cities} tours={tours} sites={sites} loading={loading} canEdit={canEdit} canReview={canReview} canDisable={canArchive} onSave={onSaveAiSource} onSubmit={onSubmitAiSource} onReview={onReviewAiSource}/>{error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</p>}</div>;
    if (view === 'narration') {
        const statusPresentation = (item?: CmsNarrationItem) => {
            if (!item)
                return { label: 'Device voice only', className: 'border-slate-200 bg-slate-50 text-slate-600' };
            if (item.status === 'pending_review')
                return { label: 'Pending review', className: 'border-amber-200 bg-amber-50 text-amber-900' };
            if (item.status === 'approved')
                return { label: 'Approved · publish next', className: 'border-blue-200 bg-blue-50 text-blue-900' };
            if (item.status === 'changes_requested')
                return { label: 'Changes requested', className: 'border-rose-200 bg-rose-50 text-rose-800' };
            if (item.status === 'failed')
                return { label: 'Generation failed', className: 'border-rose-200 bg-rose-50 text-rose-800' };
            return { label: 'Draft recording', className: 'border-violet-200 bg-violet-50 text-violet-900' };
        };
        return <div className={panelClass}>{header}
      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-blue-950">Pilot narration readiness</p><p className="mt-1 text-[11px] text-slate-600">English, Hebrew and French across every active stop.</p></div><span className="rounded-full bg-blue-950 px-3 py-1.5 text-xs font-bold text-white">{narrationPublishedCount}/{narrationCoverageTotal}</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${narrationCoverageTotal ? Math.round((narrationPublishedCount / narrationCoverageTotal) * 100) : 0}%` }}/></div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Published recording means visitors hear stored audio without a new TTS charge. Device voice is the automatic fallback when no recording is published.</p>
      </section>
      <div className="mt-4 grid grid-cols-[minmax(9rem,1.4fr)_repeat(3,minmax(7rem,1fr))] gap-2 overflow-x-auto pb-2 text-[10px]">
        <div className="sticky left-0 z-10 rounded-xl bg-slate-100 p-2 font-bold text-slate-700">Tour stop</div>{PILOT_NARRATION_LANGUAGES.map((language) => <div key={language} className="rounded-xl bg-slate-100 p-2 text-center font-bold text-slate-700">{CONTENT_LANGUAGE_LABELS[language]}</div>)}
        {narrationStops.map((site) => <React.Fragment key={site.id}>
          <div className="sticky left-0 z-10 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"><p className="font-bold text-slate-900">{site.name}</p><p className="mt-1 text-[9px] text-slate-500">{cities.find((city) => city.id === site.cityId)?.name || site.cityName || 'City not assigned'} · Stop {site.tourOrder || '—'}</p>{canEdit && <button type="button" onClick={() => { setEditingSite(site); setView('stops'); }} className="mt-2 font-bold text-blue-800 underline">Edit audio</button>}</div>
          {PILOT_NARRATION_LANGUAGES.map((language: PilotNarrationLanguage) => {
                const coverage = narrationCoverageCell(narrationItems, site.id, language);
                const work = statusPresentation(coverage.latestWork);
                return <div key={`${site.id}-${language}`} className={`rounded-xl border p-2 ${coverage.published ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : work.className}`}>
              <p className="font-bold">{coverage.published ? '✓ Published recording' : work.label}</p>
              {coverage.published && <p className="mt-1 text-[9px] opacity-75">{coverage.published.sourceType.replaceAll('_', ' ')}</p>}
              {coverage.published && coverage.latestWork && <p className={`mt-2 rounded-lg border p-1.5 text-[9px] font-bold ${work.className}`}>Update: {work.label}</p>}
            </div>;
            })}
        </React.Fragment>)}
      </div>
      {narrationStops.length === 0 && <p className="mt-4 rounded-2xl border bg-white p-5 text-center text-sm text-slate-500">Create or restore stops before checking narration coverage.</p>}
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-[10px] leading-relaxed text-slate-600"><p className="font-bold text-slate-900">Status guide</p><p className="mt-1">Green: stored visitor recording · Amber/blue/purple: recording in workflow · Grey: visitors currently use the device voice.</p></div>
    </div>;
    }
    const archivedNarrationItems = narrationItems.filter((item) => item.status === 'superseded');
    const archivedAiSources = aiSources.filter((source) => source.status === 'disabled');
    const totalArchivedItems = archivedItems.length + archivedReviewItems.length + archivedNarrationItems.length + archivedAiSources.length;
    if (view === 'archive')
        return <div className="mx-auto h-[calc(100vh-120px)] max-w-md overflow-y-auto bg-slate-50 p-4 pb-24">{header}
    <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Archived content is hidden from visitors but retained for audit and recovery. Restored items return as drafts and must complete review before publication.</p>
    {totalArchivedItems === 0 ? <p className="rounded-2xl border bg-white p-5 text-center text-sm text-slate-500">There is no archived content.</p> : <div className="space-y-2">{archivedItems.map((item) => <article key={`${item.kind}-${item.id}`} className="flex items-center gap-3 rounded-2xl border bg-white p-3"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{item.kind}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="text-[10px] text-slate-500">{item.archivedAt ? `Archived ${new Date(item.archivedAt).toLocaleDateString()}` : 'Archived before date tracking was enabled'}</p></div><button disabled={loading} onClick={async () => { try {
            await onRestoreContent(item.kind, item.id);
            setMessage(`${item.name} restored as a draft.`);
        }
        catch (reason) {
            setMessage(reason instanceof Error ? reason.message : 'Content could not be restored.');
        } }} className="flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><ArchiveRestore className="h-3.5 w-3.5"/> Restore</button></article>)}
      {archivedReviewItems.map((item) => <article key={`revision-${item.id}`} className="flex items-center gap-3 rounded-2xl border bg-white p-3"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">proposal</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{String(item.snapshot.name || item.snapshot.title || `${item.contentKind} revision ${item.revisionNumber}`)}</p><p className="text-[10px] text-slate-500">Archived review revision {item.revisionNumber}</p></div><button disabled={loading} onClick={() => void onRestoreRevision(item.id).then(() => setMessage('Proposal restored to the review queue.')).catch((reason) => setMessage(reason instanceof Error ? reason.message : 'Proposal could not be restored.'))} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Restore</button></article>)}
      {archivedNarrationItems.map((item) => <article key={`narration-${item.id}`} className="flex items-center gap-3 rounded-2xl border bg-white p-3"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">audio</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{sites.find((site) => site.id === item.stopId)?.name || item.originalFilename || 'Archived narration'}</p><p className="text-[10px] text-slate-500">{item.language.toUpperCase()} · {item.voice}</p></div><button disabled={loading} onClick={() => void onReviewNarration(item.id, 'generated').then(() => setMessage('Narration restored as a draft.')).catch((reason) => setMessage(reason instanceof Error ? reason.message : 'Narration could not be restored.'))} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Restore</button></article>)}
      {archivedAiSources.map((source) => <article key={`source-${source.id}`} className="flex items-center gap-3 rounded-2xl border bg-white p-3"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">source</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{source.name}</p><p className="text-[10px] text-slate-500">Archived AI knowledge source</p></div><button disabled={loading} onClick={() => void onReviewAiSource(source.id, 'draft').then(() => setMessage('AI source restored as a draft.')).catch((reason) => setMessage(reason instanceof Error ? reason.message : 'Source could not be restored.'))} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Restore</button></article>)}
    </div>}
    {(message || error) && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-900">{error || message}</p>}
  </div>;
    const activeNarrationItems = narrationItems.filter((item) => item.status !== 'superseded');
    const pendingTourRatings = tourRatings.filter((item) => item.status === 'pending_review');
    const ratingQueue = <><h3 className="mb-2 mt-5 font-bold">Tour ratings awaiting review</h3>{pendingTourRatings.length === 0 ? <p className="rounded-2xl border bg-white p-4 text-center text-xs text-slate-500">No tour ratings are waiting for review.</p> : <div className="space-y-3">{pendingTourRatings.map((item) => { const notesKey = `rating-${item.id}`; const tour = tours.find((entry) => entry.id === item.tourId); return <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Tour rating · revision {item.revision}</p><h4 className="mt-1 text-sm font-bold text-slate-900">{tour?.title || 'Tour'}</h4><p className="mt-1 text-[9px] text-slate-400">Visitor account {item.userId.slice(0, 8)}… · {new Date(item.submittedAt).toLocaleDateString()}</p></div><div className="flex" aria-label={`${item.rating} out of 5 stars`}>{[1,2,3,4,5].map(value => <Star key={value} className={`h-4 w-4 ${value <= item.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}`}/>)}</div></div><p className="mt-3 rounded-lg bg-slate-50 p-2 text-[10px] text-slate-600">Only the approved combined score and rating count become public. The visitor identity remains private.</p>{canReview && <><label className={`${label} mt-3`}>Moderation notes</label><textarea className={field} rows={2} value={reviewNotes[notesKey] || ''} onChange={event => setReviewNotes(current => ({ ...current, [notesKey]: event.target.value }))} placeholder="Required when requesting changes"/><div className="mt-3 grid grid-cols-3 gap-2"><button disabled={loading || !reviewNotes[notesKey]?.trim()} onClick={() => void onReviewTourRating(item.id, 'changes_requested', reviewNotes[notesKey]).then(() => setMessage('Rating changes requested.')).catch(reason => setMessage(reason instanceof Error ? reason.message : 'Rating review failed.'))} className="rounded-xl border border-amber-300 py-2 text-[10px] font-bold text-amber-900 disabled:opacity-40">Changes</button><button disabled={loading} onClick={() => void onReviewTourRating(item.id, 'rejected', reviewNotes[notesKey]).then(() => setMessage('Rating rejected and retained privately.')).catch(reason => setMessage(reason instanceof Error ? reason.message : 'Rating review failed.'))} className="rounded-xl border border-rose-200 py-2 text-[10px] font-bold text-rose-700 disabled:opacity-40">Reject</button><button disabled={loading} onClick={() => void onReviewTourRating(item.id, 'approved', reviewNotes[notesKey]).then(() => setMessage('Rating approved for the public aggregate.')).catch(reason => setMessage(reason instanceof Error ? reason.message : 'Rating review failed.'))} className="rounded-xl bg-emerald-700 py-2 text-[10px] font-bold text-white disabled:opacity-40">Approve</button></div></>}</article>; })}</div>}</>;
    const narrationQueue = <><h3 className="mb-2 mt-5 font-bold">Narration library & approval</h3>{activeNarrationItems.length === 0 ? <p className="rounded-2xl border bg-white p-4 text-center text-xs text-slate-500">No active narration recordings.</p> : <div className="space-y-3">{activeNarrationItems.map((item) => { const stop = sites.find((site) => site.id === item.stopId); const notesKey = `narration-${item.id}`; return <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{item.language} · {item.provider} {item.model}</p><h4 className="mt-1 text-sm font-bold text-slate-900">{stop?.name || 'Narration preview'}</h4><p className="mt-1 text-[10px] text-slate-500">{item.voice} · {item.speakingRate}x · {item.sourceCharacters} characters{item.durationSeconds ? ` · ${Math.round(item.durationSeconds)} seconds` : ''}</p><p className="mt-1 text-[9px] font-semibold text-slate-400">Source: {item.sourceType.replaceAll('_', ' ')}{item.originalFilename ? ` · ${item.originalFilename}` : ''}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${item.status === 'published' || item.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : item.status === 'changes_requested' || item.status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'}`}>{item.status.replace('_', ' ')}</span></div>{item.pronunciations.length > 0 && <div className="mt-2 rounded-lg bg-violet-50 p-2 text-[10px] text-violet-950"><p className="font-bold">Pronunciation review ({item.pronunciations.length})</p>{item.pronunciations.map(entry => <p key={entry.phrase} className="mt-1">{entry.phrase} → {entry.pronunciation} <span className="text-violet-600">({entry.encoding.replace('_', ' ')})</span>{entry.reviewerNote ? ` · ${entry.reviewerNote}` : ''}</p>)}</div>}{item.url && <audio className="mt-3 w-full" controls preload="metadata" src={item.url}>Your browser does not support audio review.</audio>}{item.reviewNotes && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[10px] text-amber-900">Review notes: {item.reviewNotes}</p>}{item.status === 'pending_review' && canReview && <><label className={`${label} mt-3`}>Narration review notes</label><textarea className={field} rows={2} value={reviewNotes[notesKey] || ''} onChange={event => setReviewNotes(current => ({ ...current, [notesKey]: event.target.value }))} placeholder="Required when requesting changes"/><div className="mt-3 grid grid-cols-2 gap-2"><button disabled={loading} onClick={async () => { try {
        await onReviewNarration(item.id, 'changes_requested', reviewNotes[notesKey]);
        setMessage('Narration changes requested.');
    }
    catch (reason) {
        setMessage(reason instanceof Error ? reason.message : 'Narration review failed.');
    } }} className="rounded-xl border border-amber-300 py-2 text-xs font-bold text-amber-900 disabled:opacity-50">Request changes</button><button disabled={loading} onClick={async () => { try {
        await onReviewNarration(item.id, 'approved', reviewNotes[notesKey]);
        setMessage('Narration approved.');
    }
    catch (reason) {
        setMessage(reason instanceof Error ? reason.message : 'Narration review failed.');
    } }} className="rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white disabled:opacity-50">Approve narration</button></div></>}{['generated', 'changes_requested'].includes(item.status) && canEdit && <button disabled={loading} onClick={async () => { try {
        await onReviewNarration(item.id, 'pending_review');
        setMessage('Narration submitted for review.');
    }
    catch (reason) {
        setMessage(reason instanceof Error ? reason.message : 'Narration submission failed.');
    } }} className="mt-3 w-full rounded-xl bg-blue-900 py-2.5 text-xs font-bold text-white disabled:opacity-50">Submit narration for review</button>}{item.status === 'approved' && canReview && <button disabled={loading} onClick={async () => { try {
        await onReviewNarration(item.id, 'published', reviewNotes[notesKey]);
        setMessage('Narration published for visitor playback.');
    }
    catch (reason) {
        setMessage(reason instanceof Error ? reason.message : 'Narration publishing failed.');
    } }} className="mt-3 w-full rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white disabled:opacity-50">Publish narration</button>}{canArchive && <button disabled={loading} onClick={() => { if (window.confirm(`Archive this ${item.language.toUpperCase()} narration? The recording will be retained and can be restored.`)) void onReviewNarration(item.id, 'superseded').then(() => setMessage('Narration archived.')).catch((reason) => setMessage(reason instanceof Error ? reason.message : 'Narration could not be archived.')); }} className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-rose-200 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"><ArchiveRestore className="h-3.5 w-3.5"/> Archive recording</button>}</article>; })}</div>}</>;
    if (view === 'review')
        return <div className="mx-auto h-[calc(100vh-120px)] max-w-md overflow-y-auto bg-slate-50 p-4 pb-24">{header}
    <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Review submitted content, request changes when needed, then approve and publish. Every decision is recorded in the audit trail.</p>
    <p className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-950"><strong>Need to change the wording before approval?</strong> Select <strong>Edit</strong> on the proposal card. The text becomes editable in this window, and saving creates an audited replacement revision that still requires approval.</p>
    <nav className="mb-4 grid grid-cols-2 gap-2" aria-label="Review queue sections"><a href="#content-review" className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-900">Content proposals ({reviewItems.length})</a><a href="#media-review" className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-center text-xs font-bold text-violet-900">Photographs ({mediaItems.filter((item) => item.status === 'pending').length})</a></nav>
    {mediaItems.some((item) => item.status === 'pending') && <section className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-3" aria-label="Pending photograph previews"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-violet-950">Photographs awaiting approval</p><p className="mt-0.5 text-[10px] text-violet-800">Select a preview to inspect its full review card.</p></div><a href="#media-review" className="shrink-0 rounded-lg bg-violet-900 px-3 py-2 text-[10px] font-bold text-white">Review photographs</a></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{mediaItems.filter((item) => item.status === 'pending').map((item) => <a key={item.id} href={`#media-${item.id}`} className="overflow-hidden rounded-xl border border-violet-200 bg-white p-1.5"><div className="flex h-24 items-center justify-center rounded-lg bg-slate-100">{item.url && item.mimeType.startsWith('image/') ? <img src={item.url} alt={`Pending ${item.filename}`} className="h-full w-full rounded-lg object-contain"/> : <span className="px-2 text-center text-[9px] font-bold text-amber-900">Preview unavailable</span>}</div><span className="mt-1 block truncate text-[9px] font-bold text-slate-700">{item.filename}</span></a>)}</div></section>}
    {loading && <p className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-900"><Loader2 className="h-4 w-4 animate-spin"/>Updating the review queue…</p>}
    {!loading && reviewItems.length === 0 && <p className="rounded-2xl border bg-white p-5 text-center text-sm text-slate-500">The review queue is clear.</p>}
    <div id="content-review" className="scroll-mt-4 space-y-3">{reviewItems.map((item) => {
                const title = String(item.snapshot.name || item.snapshot.title || item.snapshot.subtitle || `${item.contentKind} ${item.contentId.slice(0, 8)}`);
                const current = item.contentKind === 'city' ? cities.find((entry) => entry.id === item.contentId) : item.contentKind === 'tour' ? tours.find((entry) => entry.id === item.contentId) : sites.find((entry) => entry.id === item.contentId);
                const ignored = new Set(['id', 'organizationId', 'status', 'imageUrl', 'cityName', 'tags', 'keyFacts']);
                const pronunciationChanges = item.contentKind === 'stop' ? pronunciationChangesForReview(item.snapshot, current as HeritageSite | undefined) : [];
                const translationChanges = item.contentKind === 'stop' ? translationChangesForReview(item.snapshot, current as HeritageSite | undefined) : [];
                const changedFields = Object.entries(item.snapshot).filter(([key, value]) => !ignored.has(key) && JSON.stringify((current as unknown as Record<string, unknown> | undefined)?.[key]) !== JSON.stringify(value)).map(([key]) => key === 'translations' ? translationChanges.length > 0 ? `${translationChanges.map((change) => CONTENT_LANGUAGE_LABELS[change.language]).join(', ')} localized content${pronunciationChanges.length > 0 ? ' and pronunciation guidance' : ''}` : 'pronunciation guidance' : key);
                const approvalLocked = pronunciationChanges.length > 0 && !pronunciationReviewCompleted[item.id];
                return <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">{item.contentKind} · revision {item.revisionNumber}</p><h3 className="mt-1 font-bold text-slate-900">{title}</h3>{item.revisesPublishedContent && <p className="mt-1 text-[10px] font-bold text-emerald-700">Live version stays public until this revision is published</p>}</div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{item.status.replace('_', ' ')}</span></div>{editingRevisionId === item.id ? <InlineRevisionTextEditor item={item} onCancel={() => setEditingRevisionId('')} onSave={async (snapshot) => { await onAmendRevision(item.id, snapshot); setEditingRevisionId(''); setMessage('Edited text saved as a new pending revision. Review the replacement before approval.'); }}/> : <><ProposedContentReview item={item} cities={cities} tours={tours} sites={sites}/>{changedFields.length > 0 && <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3"><p className="text-[10px] font-bold uppercase text-blue-800">What changed</p><p className="mt-1 text-xs text-blue-950">{changedFields.join(', ')}</p></div>}{translationChanges.length > 0 && <TranslationRevisionReview changes={translationChanges}/>} {pronunciationChanges.length > 0 && <PronunciationRevisionReview item={item} changes={pronunciationChanges} onCompleted={() => setPronunciationReviewCompleted((currentValue) => currentValue[item.id] ? currentValue : { ...currentValue, [item.id]: true })}/>}<details className="mt-3"><summary className="cursor-pointer text-[10px] font-bold text-slate-400">Technical details (optional)</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-600">{JSON.stringify(item.snapshot, null, 2)}</pre></details></>}{item.status === 'pending_review' ? editingRevisionId === item.id ? null : <><label className={`${label} mt-3`}>Review notes (optional when approving)</label><textarea className={field} rows={2} value={reviewNotes[item.id] || ''} onChange={(event) => setReviewNotes((currentValue) => ({ ...currentValue, [item.id]: event.target.value }))} placeholder="Add an approval note or explain requested changes"/><div className="mt-3 grid grid-cols-2 gap-2"><button disabled={loading || approvalLocked} title={approvalLocked ? 'Listen to the complete proposed pronunciation before approving.' : 'Approve this revision'} onClick={async () => { try {
                    await onReview(item, 'approved', reviewNotes[item.id]);
                    setMessage('Revision approved.');
                }
                catch (reason) {
                    setMessage(reason instanceof Error ? reason.message : 'Review failed.');
                } }} className="rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{approvalLocked ? 'Listen before approval' : 'Approve'}</button>{canEdit && canReview ? <button type="button" disabled={loading} onClick={() => setEditingRevisionId(item.id)} className="flex items-center justify-center gap-1 rounded-xl border border-blue-300 bg-white py-2 text-xs font-bold text-blue-900 disabled:opacity-40"><Edit3 className="h-3.5 w-3.5"/> Edit</button> : <button disabled={loading || !reviewNotes[item.id]?.trim()} onClick={async () => { try {
                    await onReview(item, 'changes_requested', reviewNotes[item.id]);
                    setMessage('Changes requested from the editor.');
                }
                catch (reason) {
                    setMessage(reason instanceof Error ? reason.message : 'Review failed.');
                } }} className="rounded-xl border border-amber-300 py-2 text-xs font-bold text-amber-900 disabled:opacity-40">Request changes</button>}</div></> : editingRevisionId === item.id ? null : <div className="mt-3 flex items-center gap-2"><button disabled={loading} onClick={async () => { try {
                    await onPublish(item.id);
                    setMessage('Revision published.');
                }
                catch (reason) {
                    setMessage(reason instanceof Error ? reason.message : 'Publishing failed.');
                } }} className="min-w-0 flex-1 rounded-xl bg-blue-900 py-2.5 text-xs font-bold text-white disabled:opacity-50">Publish approved revision</button>{canEdit && canReview && <button type="button" disabled={loading} onClick={() => setEditingRevisionId(item.id)} className="flex shrink-0 items-center justify-center gap-1 rounded-xl border border-blue-300 bg-white px-3 py-2.5 text-xs font-bold text-blue-900 disabled:opacity-40" title="Make a last-minute text correction before publication"><Edit3 className="h-3.5 w-3.5"/> Edit</button>}</div>}{canArchive && <button disabled={loading} onClick={() => { if (window.confirm(`Archive revision ${item.revisionNumber}? Its audit record will be retained and it can be restored.`)) void onArchiveRevision(item.id).then(() => setMessage('Revision archived.')).catch((reason) => setMessage(reason instanceof Error ? reason.message : 'Revision could not be archived.')); }} className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-rose-200 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"><ArchiveRestore className="h-3.5 w-3.5"/> Archive proposal</button>}</article>;
            })}</div>
    <section id="media-review" className="scroll-mt-4"><div className="mb-3 mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4"><h3 className="font-bold text-violet-950">Photograph approval</h3><p className="mt-1 text-xs leading-relaxed text-violet-800">Inspect the complete, uncropped photograph and its creator, source, licence and public credit before approving it.</p></div>
    {mediaItems.filter((item) => item.status === 'pending').length === 0 ? <p className="rounded-2xl border bg-white p-4 text-center text-xs text-slate-500">No uploaded media is waiting for approval.</p> : <div className="space-y-3">{mediaItems.filter((item) => item.status === 'pending').map((item) => <article id={`media-${item.id}`} key={item.id} className="scroll-mt-4 rounded-2xl border bg-white p-4 shadow-sm">{item.url && item.mimeType.startsWith('image/') ? <a href={item.url} target="_blank" rel="noreferrer" className="block rounded-xl bg-slate-100 p-2" title={`Open full-size ${item.filename}`}><img src={item.url} alt={`Review ${item.filename}`} className="max-h-[28rem] min-h-48 w-full rounded-lg object-contain"/><span className="mt-2 block text-center text-[10px] font-bold text-blue-800">Open full-size photograph</span></a> : <div className="mb-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900">Image preview unavailable — do not approve until the file can be opened.</div>}<p className="mt-3 break-all text-sm font-bold text-slate-900">{item.filename}</p><p className="mt-1 text-[10px] text-slate-500">{item.mimeType} · {(item.byteSize / 1024 / 1024).toFixed(2)} MB</p><div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-[10px] leading-relaxed text-blue-950"><p className="font-bold uppercase">Rights: {item.rightsStatus.replaceAll('_', ' ')}</p><p className="mt-1"><strong>Public credit:</strong> {item.attributionText || 'Missing'}</p>{item.creatorName && <p><strong>Creator:</strong> {item.creatorName}</p>}{item.sourceUrl && <p className="break-all"><strong>Source:</strong> <a className="underline" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceUrl}</a></p>}{item.licenseName && <p><strong>Licence:</strong> {item.licenseUrl ? <a className="underline" href={item.licenseUrl} target="_blank" rel="noreferrer">{item.licenseName}</a> : item.licenseName}</p>}{item.rightsNotes && <p><strong>Notes:</strong> {item.rightsNotes}</p>}</div><label className={`${label} mt-3`}>Media review notes</label><textarea className={field} rows={2} value={reviewNotes[`media-${item.id}`] || ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [`media-${item.id}`]: event.target.value }))} placeholder="Required when rejecting"/><div className="mt-3 grid grid-cols-2 gap-2"><button disabled={loading} onClick={async () => { try {
            await onReviewMedia(item.id, 'rejected', reviewNotes[`media-${item.id}`]);
            setMessage('Media rejected and archived from the approval queue.');
        }
        catch (reason) {
            setMessage(reason instanceof Error ? reason.message : 'Media review failed.');
        } }} className="rounded-xl border border-rose-300 py-2 text-xs font-bold text-rose-800 disabled:opacity-50">Reject & archive</button><button disabled={loading} onClick={async () => { try {
            await onReviewMedia(item.id, 'approved', reviewNotes[`media-${item.id}`]);
            setMessage('Media approved for published content.');
        }
        catch (reason) {
            setMessage(reason instanceof Error ? reason.message : 'Media review failed.');
        } }} className="rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white disabled:opacity-50">Approve media</button></div></article>)}</div>}</section>
    {ratingQueue}
    <CmsCommunityModeration comments={tourComments} bans={communityBans} tours={tours} sites={sites} loading={loading} canReview={canReview} canBan={canArchive} onReviewComment={onReviewTourComment} onBanUser={onBanCommunityUser} onLiftBan={onLiftCommunityBan}/>
    <CmsHeritageStoriesModeration stories={heritageStories} tours={tours} loading={loading} canReview={canReview} canBan={canArchive} onReview={onReviewHeritageStory} onBanUser={onBanCommunityUser}/>
    {narrationQueue}
    {(message || error) && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-900">{error || message}</p>}
  </div>;
    if (view === 'wizard')
        return <div className="mx-auto h-[calc(100vh-120px)] max-w-md overflow-y-auto bg-slate-50 p-4 pb-24">{header}
    <div className="mb-4 flex gap-2">{[1, 2, 3, 4].map((step) => <div key={step} className={`h-2 flex-1 rounded-full ${step <= wizardStep ? 'bg-blue-700' : 'bg-slate-200'}`}/>)}</div>
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      {wizardStep === 1 && <div className="space-y-3"><h3 className="font-bold">Step 1 — City, Identity, Country & Flag</h3><div><label className={label}>City / Destination Name</label><input className={field} value={draftCity.name} onChange={(e) => setDraftCity({ ...draftCity, name: e.target.value })}/></div><div><label className={label}>Select Country</label><select className={field} value={draftCity.country} onChange={(e) => selectCountry(e.target.value, setDraftCity)}><option value="">Choose a country</option>{COUNTRIES.map((country) => <option key={country.code} value={country.name}>{country.name}</option>)}</select></div><div><label className={label}>Flag Emoji</label><div className="rounded-xl border bg-slate-50 px-3 py-2 text-2xl">{draftCity.flagEmoji || '🏳️'}</div></div><div><label className={label}>Tour Subtitle / Tagline</label><input className={field} value={draftCity.subtitle} onChange={(e) => setDraftCity({ ...draftCity, subtitle: e.target.value })}/></div><button onClick={() => setWizardStep(2)} className="w-full rounded-xl bg-blue-900 py-2.5 text-sm font-bold text-white">Next Step</button></div>}
      {wizardStep === 2 && <div className="space-y-3"><h3 className="font-bold">Step 2 — Tour Story & Overview</h3><div><label className={label}>Detailed Heritage Tour Overview</label><textarea rows={9} className={field} value={draftCity.description} onChange={(e) => setDraftCity({ ...draftCity, description: e.target.value })}/></div><button disabled={isGeocoding} onClick={() => geocode(`${draftCity.name}, ${draftCity.country}`, (lat, lng) => setDraftCity({ ...draftCity, centerLat: lat, centerLng: lng }))} className="w-full rounded-xl border border-blue-200 bg-blue-50 py-2 text-xs font-bold text-blue-900 disabled:opacity-50">{isGeocoding ? 'Finding city coordinates…' : 'Find real-world city coordinates'}</button><div className="grid grid-cols-2 gap-2"><input aria-label="City latitude" className={field} type="number" value={draftCity.centerLat} onChange={(e) => setDraftCity({ ...draftCity, centerLat: Number(e.target.value) })}/><input aria-label="City longitude" className={field} type="number" value={draftCity.centerLng} onChange={(e) => setDraftCity({ ...draftCity, centerLng: Number(e.target.value) })}/></div><div className="flex gap-2"><button onClick={() => setWizardStep(1)} className="flex-1 rounded-xl border py-2.5 text-sm font-bold">Back</button><button onClick={() => { setDraftStop(emptySite({ ...draftCity, id: draftCity.id || slugify(draftCity.name) })); setWizardStep(3); }} className="flex-1 rounded-xl bg-blue-900 py-2.5 text-sm font-bold text-white">Add Stops</button></div></div>}
      {wizardStep === 3 && <div className="space-y-3"><h3 className="font-bold">Step 3 — Add Landmark / Tour Stops</h3><div><label className={label}>Stop Title</label><input className={field} value={draftStop.name} onChange={(e) => setDraftStop({ ...draftStop, name: e.target.value })}/></div><div><label className={label}>Street Address (recommended)</label><input className={field} value={draftStop.address} onChange={(e) => setDraftStop({ ...draftStop, address: e.target.value })} placeholder="Street, number, postcode"/></div><div><label className={label}>Interest</label><select className={field} value={draftStop.category} onChange={(e) => setDraftStop({ ...draftStop, category: e.target.value as SiteCategory })}>{CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></div><div><label className={label}>Image preview URL</label><input className={field} value={draftStop.imageUrl} onChange={(e) => setDraftStop({ ...draftStop, imageUrl: e.target.value })} placeholder="https://…"/></div><div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><p className="text-[10px] font-bold uppercase text-blue-900">Image rights and public credit</p><div className="mt-2"><label className={label}>Rights status</label><select className={field} value={wizardImageRights.rightsStatus} onChange={e => setWizardImageRights({ ...wizardImageRights, rightsStatus: e.target.value as CmsImageRights['rightsStatus'] })}><option value="unknown">Choose rights status</option><option value="own_work">Own work</option><option value="public_domain">Public domain / CC0</option><option value="cc_by">Creative Commons Attribution</option><option value="cc_by_sa">Creative Commons Attribution-ShareAlike</option><option value="permission_granted">Permission granted</option><option value="other_licensed">Other reusable licence</option></select></div><div className="mt-2"><label className={label}>Creator / photographer</label><input className={field} value={wizardImageRights.creatorName} onChange={e => setWizardImageRights({ ...wizardImageRights, creatorName: e.target.value })}/></div><div className="mt-2"><label className={label}>Source page</label><input className={field} value={wizardImageRights.sourceUrl} onChange={e => setWizardImageRights({ ...wizardImageRights, sourceUrl: e.target.value })}/></div><div className="mt-2 grid grid-cols-2 gap-2"><input className={field} value={wizardImageRights.licenseName} onChange={e => setWizardImageRights({ ...wizardImageRights, licenseName: e.target.value })} placeholder="Licence name"/><input className={field} value={wizardImageRights.licenseUrl} onChange={e => setWizardImageRights({ ...wizardImageRights, licenseUrl: e.target.value })} placeholder="Licence URL"/></div><div className="mt-2"><label className={label}>Exact public image credit</label><input className={field} value={wizardImageRights.attributionText} onChange={e => setWizardImageRights({ ...wizardImageRights, attributionText: e.target.value })}/></div></div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-xs font-bold text-slate-600"><ImagePlus className="h-4 w-4"/> Upload Picture with Rights Record<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0], setDraftStop)}/></label><button disabled={isGeocoding} onClick={() => geocode(`${draftStop.name}, ${draftStop.address}, ${draftCity.name}, ${draftCity.country}`, (lat, lng) => setDraftStop({ ...draftStop, lat, lng }), 'landmark')} className="w-full rounded-xl border border-blue-200 bg-blue-50 py-2 text-xs font-bold text-blue-900 disabled:opacity-50">{isGeocoding ? 'Finding stop coordinates…' : 'Find real-world stop coordinates'}</button><div className="grid grid-cols-2 gap-2"><input aria-label="Stop latitude" className={field} type="number" value={draftStop.lat} onChange={(e) => setDraftStop({ ...draftStop, lat: Number(e.target.value) })}/><input aria-label="Stop longitude" className={field} type="number" value={draftStop.lng} onChange={(e) => setDraftStop({ ...draftStop, lng: Number(e.target.value) })}/></div><button onClick={addWizardStop} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-blue-950"><Plus className="h-4 w-4"/> Add New Stop</button>{wizardStops.length > 0 && <p className="rounded-xl bg-emerald-50 p-2 text-xs font-bold text-emerald-800">{wizardStops.length} stop(s) ready to publish</p>}<div className="flex gap-2"><button onClick={() => setWizardStep(2)} className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700">Back</button><button onClick={publishTour} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white"><Check className="h-4 w-4"/> Publish Tour</button></div></div>}
      {wizardStep === 4 && <div className="space-y-3"><h3 className="font-bold">Step 4 — Review & Publish</h3><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Tour destination</p><p className="mt-1 font-bold">{draftCity.flagEmoji} {draftCity.name}, {draftCity.country}</p><p className="mt-1 text-xs text-slate-600">{draftCity.subtitle}</p><p className="mt-2 text-xs leading-relaxed text-slate-600">{draftCity.description}</p><p className="mt-2 text-[10px] text-slate-500">GPS: {draftCity.centerLat}, {draftCity.centerLng}</p></div><div className="space-y-2">{wizardStops.map((stop, index) => <div key={stop.id} className="rounded-xl border p-3"><p className="text-xs font-bold">{index + 1}. {stop.name}</p><p className="text-[10px] text-slate-500">{stop.category.replace('_', ' ')} · {stop.lat}, {stop.lng}</p></div>)}</div><div className="flex gap-2"><button onClick={() => setWizardStep(3)} className="flex-1 rounded-xl border py-3 text-sm font-bold">Back</button><button onClick={publishTour} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white"><Check className="h-4 w-4"/> Publish Tour</button></div></div>}
    </div>{message && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-900">{message}</p>}</div>;
    if (view === 'tour') {
        const selectedTour = tours.find((tour) => tour.id === tourFilter);
        const selectedTourCity = cities.find((city) => city.id === selectedTour?.cityId);
        const assignmentPosition = (site: HeritageSite) => site.tourAssignments?.find((assignment) => assignment.tourId === tourFilter)?.position ?? (site.tourId === tourFilter ? site.tourOrder : undefined) ?? 999;
        const tourStops = sites.filter((site) => site.tourId === tourFilter || site.tourAssignments?.some((assignment) => assignment.tourId === tourFilter)).sort((a, b) => assignmentPosition(a) - assignmentPosition(b));
        const availableStops = sites.filter((site) => site.cityId === selectedTour?.cityId && !tourStops.some((assigned) => assigned.id === site.id)).sort((a, b) => a.name.localeCompare(b.name));
        const packageNeedsReview = Boolean(selectedTour && selectedTourCity && [selectedTour.status, selectedTourCity.status, ...tourStops.map((site) => site.status)].some((status) => ['draft', 'changes_requested', undefined].includes(status)));
        const replaceTourStops = async (stopIds: string[], successMessage: string) => {
            if (!selectedTour)
                return;
            try {
                const result = await onReplaceTourStops(selectedTour, stopIds);
                setMessage(result === 'submitted' ? `${successMessage} Submitted for review; the current published route remains live.` : successMessage);
            }
            catch (reason) {
                setMessage(reason instanceof Error ? reason.message : 'Tour assignments could not be saved.');
            }
        };
        const moveTourStop = async (index: number, direction: -1 | 1) => {
            if (!selectedTour)
                return;
            const target = index + direction;
            if (target < 0 || target >= tourStops.length)
                return;
            const reordered = [...tourStops];
            [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
            try {
                const result = await onReorderTourStops(selectedTour, reordered.map((stop) => stop.id));
                setMessage(result === 'submitted' ? 'New stop order submitted for review. The current published route remains live.' : 'Stop order saved.');
            }
            catch (reason) {
                setMessage(reason instanceof Error ? reason.message : 'Stop order could not be saved.');
            }
        };
        return <div className="mx-auto h-[calc(100vh-120px)] max-w-md overflow-y-auto bg-slate-50 p-4 pb-24">{header}
      <p className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">{canArchive ? 'Select any non-archived tour to edit its identity, overview, GPS information and every stop. Saved changes return to the draft and review workflow.' : 'Editors may change drafts and content returned with change requests. An Administrator must reopen published content before it can be revised.'}</p>
      <div className="grid grid-cols-[1fr_auto] gap-2"><select aria-label="Select a tour" className={field} value={tourFilter} onChange={(event) => { setTourFilter(event.target.value); setEditingTour(null); setEditingSite(null); setAssigningStops(false); }}><option value="">Select a tour</option>{sortedTours.map((tour) => { const city = cities.find((item) => item.id === tour.cityId); return <option key={tour.id} value={tour.id}>{city?.flagEmoji} {city?.name} — {tour.title}</option>; })}</select><button onClick={() => { setTourFilter(''); setEditingSite(null); setAssigningStops(false); setEditingTour(emptyTour(sortedCities[0]?.id)); }} className="rounded-xl bg-blue-900 px-3 text-xs font-bold text-white">Add Tour</button></div>
      {editingTour && <div className="mt-3"><TourEditor tour={editingTour} cities={sortedCities} field={field} label={label} onCancel={() => setEditingTour(null)} onSave={async (tour) => { try {
            const saved = await onSaveTour(tour);
            setEditingTour(null);
            setTourFilter(saved.id);
            setMessage(tour.status === 'published' ? 'Proposed changes submitted for review. The current published tour remains live.' : 'Tour saved as a draft.');
        }
        catch (reason) {
            setMessage(reason instanceof Error ? reason.message : 'Tour could not be saved.');
        } }}/></div>}
      {selectedTour && !editingTour && <div className="mt-3 space-y-3"><div className="rounded-2xl border bg-white p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{selectedTourCity?.flagEmoji} {selectedTourCity?.name}</p><h3 className="mt-1 font-bold">{selectedTour.title}</h3><p className="mt-1 text-xs text-slate-500">{selectedTour.subtitle}</p></div><div className="flex gap-1"><button aria-label={`Edit complete ${selectedTour.title} tour`} onClick={() => setEditingTour({ ...selectedTour })} className="rounded-lg bg-blue-50 p-2 text-blue-800"><Edit3 className="h-4 w-4"/></button>{canArchive && <button aria-label={`Archive complete ${selectedTour.title} tour`} onClick={() => confirm(`Archive ${selectedTour.title}? The tour will leave public view, while its reusable stops remain available to other tours.`) && onDeleteTour(selectedTour.id)} className="rounded-lg bg-rose-50 p-2 text-rose-700"><Trash2 className="h-4 w-4"/></button>}</div></div><p className="mt-3 text-xs leading-relaxed text-slate-600">{selectedTour.overview}</p><p className="mt-2 text-[10px] font-bold uppercase text-slate-400">{selectedTour.status || 'draft'} · {selectedTour.difficulty || 'easy'} · {selectedTour.accessMode || 'free'}</p>{canEdit && packageNeedsReview && selectedTourCity && <button disabled={loading} onClick={async () => { try {
                await onSubmitTourPackage(selectedTourCity, selectedTour, tourStops);
                setMessage('City, tour and draft stops submitted for review.');
            }
            catch (reason) {
                setMessage(reason instanceof Error ? reason.message : 'The complete tour could not be submitted.');
            } }} className="mt-3 w-full rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-blue-950 disabled:opacity-50">{loading ? 'Submitting complete tour…' : 'Submit city, tour & draft stops for review'}</button>}</div>
        <div className="flex items-center justify-between gap-2"><h3 className="font-bold">Tour stops ({tourStops.length})</h3><div className="flex gap-1"><button onClick={() => setAssigningStops((current) => !current)} className="flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-2 text-[10px] font-bold text-blue-900"><Link2 className="h-3.5 w-3.5"/> Existing</button><button onClick={() => selectedTourCity && setEditingSite({ ...emptySite({ ...selectedTourCity, tourId: selectedTour.id }), id: `${selectedTour.id}-new-${Date.now()}`, tourId: selectedTour.id, tourOrder: tourStops.length + 1, status: 'draft' })} className="flex items-center gap-1 rounded-xl bg-blue-900 px-2.5 py-2 text-[10px] font-bold text-white"><Plus className="h-3.5 w-3.5"/> New Stop</button></div></div>
        {assigningStops && <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-blue-950">Add an existing city stop</p><p className="text-[10px] text-blue-700">A stop may be reused in several tours.</p></div><button onClick={() => setAssigningStops(false)} className="text-xs font-bold text-blue-800">Close</button></div>{availableStops.length === 0 ? <p className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-500">Every active stop in this city is already assigned.</p> : <div className="mt-3 space-y-2">{availableStops.map((site) => <div key={site.id} className="flex items-center gap-2 rounded-xl bg-white p-2"><span className="min-w-0 flex-1 truncate text-xs font-bold">{site.name}</span><button disabled={loading} onClick={() => replaceTourStops([...tourStops.map((stop) => stop.id), site.id], `${site.name} added to the tour.`)} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Assign</button></div>)}</div>}</div>}
        {editingSite ? <SiteEditor site={editingSite} cities={sortedCities} field={field} label={label} onNarrationUploaded={onRefresh} onCancel={() => setEditingSite(null)} onSave={async (site) => { await onSaveSite(site); setEditingSite(null); setMessage(site.status === 'published' ? 'Proposed stop changes submitted for review. The current published stop remains live.' : 'Stop changes saved as a draft.'); }}/> : tourStops.map((site, index) => <div key={site.id} className="flex items-center gap-2 rounded-xl border bg-white p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-900">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{site.name}</p><p className="text-[10px] text-slate-500">{site.status || 'draft'} · {site.category.replace('_', ' ')}</p></div><div className="flex flex-col"><button disabled={loading || index === 0} aria-label={`Move ${site.name} up`} title="Move stop up" onClick={() => moveTourStop(index, -1)} className="rounded p-1 text-blue-800 disabled:text-slate-300"><ArrowUp className="h-3.5 w-3.5"/></button><button disabled={loading || index === tourStops.length - 1} aria-label={`Move ${site.name} down`} title="Move stop down" onClick={() => moveTourStop(index, 1)} className="rounded p-1 text-blue-800 disabled:text-slate-300"><ArrowDown className="h-3.5 w-3.5"/></button></div><button aria-label={`Edit ${site.name}`} onClick={() => setEditingSite({ ...site })} className="p-2 text-blue-800"><Edit3 className="h-4 w-4"/></button><button aria-label={`Remove ${site.name} from ${selectedTour.title}`} title="Remove from this tour only" onClick={() => replaceTourStops(tourStops.filter((stop) => stop.id !== site.id).map((stop) => stop.id), `${site.name} removed from this tour but kept in the stop database.`)} className="p-2 text-amber-700"><Unlink className="h-4 w-4"/></button>{canArchive && <button aria-label={`Archive ${site.name}`} onClick={() => confirm(`Archive ${site.name}? It will be removed from every tour and public view but retained in the audit history.`) && onDeleteSite(site.id)} className="p-2 text-rose-700"><Trash2 className="h-4 w-4"/></button>}</div>)}
        {message && <p className="rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-900">{message}</p>}
      </div>}
    </div>;
    }
    if (view === 'stops')
        return <div className="mx-auto h-[calc(100vh-120px)] max-w-md overflow-y-auto bg-slate-50 p-4 pb-24">{header}<p className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">Every non-archived stop remains fully editable. Archive controls are restricted to Administrators and the Super Admin.</p><div className="relative mb-3"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input className={`${field} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all stops…"/></div>{editingSite ? <SiteEditor site={editingSite} cities={sortedCities} field={field} label={label} onNarrationUploaded={onRefresh} onCancel={() => setEditingSite(null)} onSave={async (site) => { await onSaveSite(site); setEditingSite(null); setMessage(site.status === 'published' ? 'Proposed stop changes submitted for review. The current published stop remains live.' : 'Stop changes saved as a draft.'); }}/> : <div className="space-y-2">{filteredSites.map((site) => <div key={site.id} className="flex items-center gap-3 rounded-2xl border bg-white p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{site.name}</p><p className="text-xs text-slate-500">{site.cityName} · {site.category.replace('_', ' ')}</p></div><button aria-label={`Edit ${site.name}`} onClick={() => setEditingSite({ ...site })} className="rounded-lg bg-blue-50 p-2 text-blue-800"><Edit3 className="h-4 w-4"/></button>{canArchive && <button aria-label={`Archive ${site.name}`} onClick={() => confirm(`Archive ${site.name}? It will be removed from public view but retained in the audit history.`) && onDeleteSite(site.id)} className="rounded-lg bg-rose-50 p-2 text-rose-700"><Trash2 className="h-4 w-4"/></button>}</div>)}</div>}</div>;
    if (view === 'cities') {
        const city = editingCity || { id: '', name: '', country: '', flagEmoji: '', subtitle: '', description: '', centerLat: 0, centerLng: 0 };
        return <div className="mx-auto h-[calc(100vh-120px)] max-w-md overflow-y-auto bg-slate-50 p-4 pb-24">{header}
      <div className="rounded-2xl border bg-white p-4"><h3 className="mb-3 font-bold">{editingCity?.id ? 'Edit Complete City Tour' : 'Add New City Tour Destination'}</h3><div className="space-y-3">
        <div><label className={label}>City Name</label><input className={field} value={city.name} onChange={(event) => setEditingCity({ ...city, name: event.target.value })}/></div>
        <div><label className={label}>Country</label><select className={field} value={city.country} onChange={(event) => { const country = COUNTRIES.find((item) => item.name === event.target.value); setEditingCity({ ...city, country: event.target.value, flagEmoji: country?.flagEmoji || '' }); }}><option value="">Choose a country</option>{COUNTRIES.map((country) => <option key={country.code}>{country.name}</option>)}</select></div>
        <div><label className={label}>Flag Emoji</label><div className="rounded-xl border bg-slate-50 p-2 text-2xl">{city.flagEmoji || '🏳️'}</div></div>
        <div><label className={label}>Tour Subtitle / Tagline</label><input className={field} value={city.subtitle} onChange={(event) => setEditingCity({ ...city, subtitle: event.target.value })}/></div>
        <div><label className={label}>Detailed Tour Overview</label><textarea rows={7} className={field} value={city.description} onChange={(event) => setEditingCity({ ...city, description: event.target.value })}/></div>
        <button onClick={() => locate((lat, lng) => setEditingCity({ ...city, centerLat: lat, centerLng: lng }))} className="w-full rounded-xl border border-blue-200 bg-blue-50 py-2 text-xs font-bold text-blue-900">Find real-world city coordinates</button>
        <div className="grid grid-cols-2 gap-2"><input aria-label="City latitude" className={field} type="number" value={city.centerLat} onChange={(event) => setEditingCity({ ...city, centerLat: Number(event.target.value) })}/><input aria-label="City longitude" className={field} type="number" value={city.centerLng} onChange={(event) => setEditingCity({ ...city, centerLng: Number(event.target.value) })}/></div>
        <button onClick={async () => { if (!city.name || !city.country)
            return setMessage('City name and country are required.'); try {
            await onSaveCity({ ...city, id: city.id || slugify(city.name) });
            setEditingCity(null);
            setMessage('Tour changes saved as a draft.');
        }
        catch (reason) {
            setMessage(reason instanceof Error ? reason.message : 'Tour changes could not be saved.');
        } }} className="w-full rounded-xl bg-blue-900 py-2.5 text-sm font-bold text-white">Save Tour Changes</button>
      </div></div>
      <h3 className="mb-2 mt-5 font-bold">Configure City Tours</h3><div className="space-y-2">{sortedCities.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl border bg-white p-3"><span className="text-xl">{item.flagEmoji}</span><span className="flex-1 text-sm font-bold">{item.name}</span><button aria-label={`Edit ${item.name} tour`} onClick={() => setEditingCity({ ...item })} className="p-2 text-blue-800"><Edit3 className="h-4 w-4"/></button>{canArchive && <button aria-label={`Archive ${item.name} tour`} onClick={() => confirm(`Archive ${item.name}, its complete tour and all its stops? This is recoverable and preserves the audit history.`) && onDeleteCity(item.id, item.tourId)} className="p-2 text-rose-700"><Trash2 className="h-4 w-4"/></button>}</div>)}</div>
      {message && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-800">{message}</p>}
    </div>;
    }
    return <div className="mx-auto h-[calc(100vh-120px)] max-w-md overflow-y-auto bg-slate-50 p-4 pb-24">{header}<div className="space-y-3"><button onClick={exportJson} className="flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left"><Download className="h-6 w-6 text-blue-800"/><span><strong className="block">Export to JSON</strong><small className="text-slate-500">Download {cities.length} cities and {sites.length} stops</small></span></button><button onClick={() => importRef.current?.click()} className="flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left"><Upload className="h-6 w-6 text-emerald-700"/><span><strong className="block">Import Tour Database</strong><small className="text-slate-500">Validate draft content and licensed photographs before import</small></span></button><input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importJson(e.target.files?.[0])}/>{pendingImport && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-bold text-amber-900">Import preview</p><p className="mt-1 text-xs text-amber-800">{pendingImport.cities.length} cities and {pendingImport.sites.length} stops will be added as drafts. {pendingImport.licensedMedia.length} licensed photographs will be privately stored and left pending human approval.</p><div className="mt-3 flex gap-2"><button onClick={() => setPendingImport(null)} className="flex-1 rounded-xl border bg-white py-2 text-xs font-bold">Cancel</button><button disabled={loading} onClick={async () => { try {
        await onImport(pendingImport.cities, pendingImport.sites, pendingImport.licensedMedia);
        setPendingImport(null);
        setMessage('Tour database imported as drafts.');
    }
    catch (reason) {
        setMessage(reason instanceof Error ? reason.message : 'Import failed.');
    } }} className="flex-1 rounded-xl bg-amber-600 py-2 text-xs font-bold text-white disabled:opacity-50">Confirm Import</button></div></div>}{message && <p className="rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-900">{message}</p>}</div></div>;
};
const TourEditor: React.FC<{
    tour: TourSummary;
    cities: TourCity[];
    field: string;
    label: string;
    onCancel: () => void;
    onSave: (tour: TourSummary) => Promise<void>;
}> = ({ tour, cities, field, label, onCancel, onSave }) => {
    const [draft, setDraft] = useState({ ...tour });
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');
    const save = async () => {
        if (!draft.cityId)
            return setNotice('Choose a city for this tour.');
        if (!draft.title.trim())
            return setNotice('Enter a tour title.');
        setSaving(true);
        setNotice('');
        try {
            await onSave(draft);
        }
        catch (reason) {
            setNotice(reason instanceof Error ? reason.message : 'Tour could not be saved.');
        }
        finally {
            setSaving(false);
        }
    };
    return <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Complete tour record</p><h3 className="font-bold">{tour.id ? 'Edit Tour' : 'Add Tour'}</h3></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{tour.status || 'draft'}</span></div>
    <div className="space-y-3">
      <div><label className={label}>City / Destination</label><select className={field} value={draft.cityId} onChange={(event) => setDraft({ ...draft, cityId: event.target.value })}><option value="">Choose a city</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.flagEmoji} {city.name}</option>)}</select></div>
      <div><label className={label}>Tour Title</label><input className={field} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/></div>
      <div><label className={label}>Tour Subtitle / Tagline</label><input className={field} value={draft.subtitle || ''} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })}/></div>
      <div><label className={label}>Detailed Heritage Tour Overview</label><textarea rows={7} className={field} value={draft.overview || ''} onChange={(event) => setDraft({ ...draft, overview: event.target.value })}/></div>
      <div><label className={label}>End-of-tour Completion Message</label><textarea rows={3} className={field} value={draft.completionMessage || ''} onChange={(event) => setDraft({ ...draft, completionMessage: event.target.value })} placeholder="Thank visitors, invite feedback and present the tip-the-guide option."/></div>
      <div className="grid grid-cols-2 gap-2"><div><label className={label}>Duration (minutes)</label><input className={field} type="number" min="1" value={draft.estimatedDurationMinutes || ''} onChange={(event) => setDraft({ ...draft, estimatedDurationMinutes: Number(event.target.value) || undefined })}/></div><div><label className={label}>Distance (metres)</label><input className={field} type="number" min="0" value={draft.distanceMetres || ''} onChange={(event) => setDraft({ ...draft, distanceMetres: Number(event.target.value) || undefined })}/></div></div>
      <div className="grid grid-cols-2 gap-2"><div><label className={label}>Difficulty</label><select className={field} value={draft.difficulty || 'easy'} onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as TourSummary['difficulty'] })}><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="challenging">Challenging</option></select></div><div><label className={label}>Access Model</label><select className={field} value={draft.accessMode || 'free'} onChange={(event) => setDraft({ ...draft, accessMode: event.target.value as TourSummary['accessMode'] })}><option value="free">Free</option><option value="paid">Paid</option><option value="subscription">Subscription</option></select></div></div>
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700"><input type="checkbox" checked={Boolean(draft.wheelchairAccessible)} onChange={(event) => setDraft({ ...draft, wheelchairAccessible: event.target.checked })}/> Wheelchair accessible</label>
      {notice && <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">{notice}</p>}
      <div className="flex gap-2"><button disabled={saving} onClick={onCancel} className="flex-1 rounded-xl border py-2.5 text-sm font-bold disabled:opacity-50">Cancel</button><button disabled={saving || cities.length === 0} onClick={save} className="flex-1 rounded-xl bg-blue-900 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save as Draft'}</button></div>
    </div>
  </div>;
};
const SiteEditor: React.FC<{
    site: HeritageSite;
    cities: TourCity[];
    field: string;
    label: string;
    onCancel: () => void;
    onSave: (site: HeritageSite) => Promise<void>;
    onNarrationUploaded: () => Promise<void>;
}> = ({ site, cities, field, label, onCancel, onSave, onNarrationUploaded }) => {
    const [draft, setDraft] = useState({ ...site, tags: site.tags || [], keyFacts: site.keyFacts || [] });
    const [step, setStep] = useState(1);
    const [tagInput, setTagInput] = useState('');
    const [notice, setNotice] = useState('');
    const [findingCoordinates, setFindingCoordinates] = useState(false);
    const [narrationConfig, setNarrationConfig] = useState<CmsNarrationConfig | null>(null);
    const [narrationLanguage, setNarrationLanguage] = useState<CmsNarrationVoice['language']>('en');
    const [contentLanguage, setContentLanguage] = useState<ContentLanguage>('en');
    const [narrationVoice, setNarrationVoice] = useState('en-GB-Chirp3-HD-Aoede');
    const [narrationRate, setNarrationRate] = useState(1);
    const [narrationPreview, setNarrationPreview] = useState('');
    const [previewingNarration, setPreviewingNarration] = useState(false);
    const [manualNarrationSource, setManualNarrationSource] = useState<'kokoro_tts' | 'human_recording' | 'other_tts'>('kokoro_tts');
    const [manualNarrationModel, setManualNarrationModel] = useState('Kokoro-82M');
    const [manualNarrationVoice, setManualNarrationVoice] = useState('');
    const [manualNarrationFile, setManualNarrationFile] = useState<File | null>(null);
    const [imageRights, setImageRights] = useState<CmsImageRights>(emptyImageRights);
    const [uploadingNarration, setUploadingNarration] = useState(false);
    const [savingStop, setSavingStop] = useState(false);
    const [pronunciationDraft, setPronunciationDraft] = useState<PronunciationEntry>({ phrase: '', encoding: 'ipa', pronunciation: '', reviewerNote: '' });
    const activeTranslation = siteTranslation(draft, contentLanguage);
    const activeNarrationTranscript = siteTranslation(draft, narrationLanguage).transcript;
    const updateActiveTranslation = (patch: Partial<HeritageSiteTranslation>) => { setDraft(current => setSiteTranslation(current, contentLanguage, patch)); setNarrationPreview(''); };
    const addPronunciation = () => { try {
        const next = normalizePronunciations([...(activeTranslation.pronunciations || []), pronunciationDraft], activeTranslation.transcript);
        updateActiveTranslation({ pronunciations: next });
        setPronunciationDraft({ phrase: '', encoding: 'ipa', pronunciation: '', reviewerNote: '' });
        setNotice('Pronunciation guidance added. Save the stop before generating or uploading narration.');
    }
    catch (error) {
        setNotice(error instanceof Error ? error.message : 'Pronunciation guidance is invalid.');
    } };
    const updatePronunciationPhrase = (phrase: string) => { const suggestion = pronunciationDraft.encoding === 'ipa' ? pronunciationSuggestion(contentLanguage, phrase) : null; setPronunciationDraft(current => ({ ...current, phrase, pronunciation: suggestion?.pronunciation || '', reviewerNote: suggestion?.reviewerNote || '' })); };
    const updatePronunciationEncoding = (encoding: PronunciationEntry['encoding']) => { const suggestion = encoding === 'ipa' ? pronunciationSuggestion(contentLanguage, pronunciationDraft.phrase) : null; setPronunciationDraft(current => ({ ...current, encoding, pronunciation: suggestion?.pronunciation || '', reviewerNote: suggestion?.reviewerNote || '' })); };
    const suggestions = INTEREST_VALUES.map((value) => DEFAULT_INTEREST_LABELS[value]);
    const presets = [
        ['Synagogue', 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=80'],
        ['Historic quarter', 'https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=900&q=80'],
        ['Memorial', 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=900&q=80'],
    ];
    const addTag = (tag: string) => { const clean = tag.trim(); if (clean && !draft.tags.some(item => item.toLowerCase() === clean.toLowerCase()))
        setDraft({ ...draft, tags: [...draft.tags, clean] }); setTagInput(''); };
    const findCoords = async () => { const city = cities.find(item => item.id === draft.cityId); setFindingCoordinates(true); setNotice('Finding real-world coordinates…'); try {
        const response = await fetch(apiUrl(`/api/geocode?q=${encodeURIComponent(`${draft.name}, ${draft.address}, ${city?.name || draft.cityName || ''}, ${city?.country || ''}`)}&scope=landmark`));
        const data = await response.json();
        if (!response.ok || !data.result)
            throw new Error(data.error || 'No reliable match found.');
        setDraft(current => ({ ...current, lat: data.result.lat, lng: data.result.lng }));
        setNotice(`Coordinates found: ${data.result.displayName}`);
    }
    catch (error) {
        setNotice(error instanceof Error ? error.message : 'No reliable match found.');
    }
    finally {
        setFindingCoordinates(false);
    } };
    const upload = async (file?: File) => { if (!file)
        return; if (!draft.organizationId) {
        setNotice('Choose a saved city before uploading an image.');
        return;
    } setNotice('Uploading image securely…'); try {
        const { data } = await supabase.auth.getUser();
        if (!data.user)
            throw new Error('Sign in again before uploading.');
        const uploaded = await uploadSharedCmsImage(draft.organizationId, data.user.id, file, imageRights);
        setDraft(current => ({ ...current, imageUrl: uploaded.url, imageMediaId: uploaded.mediaId }));
        setNotice('Image uploaded and awaiting media approval.');
    }
    catch (error) {
        setNotice(error instanceof Error ? error.message : 'Image upload failed.');
    } };
    useEffect(() => { let active = true; void loadCmsNarrationConfig().then(config => { if (active)
        setNarrationConfig(config); }).catch(error => { if (active)
        setNotice(error instanceof Error ? error.message : 'Narration settings could not be loaded.'); }); return () => { active = false; }; }, []);
    const previewNarration = async () => { if (!draft.organizationId)
        return setNotice('Save the stop before previewing narration.'); if (!activeNarrationTranscript.trim())
        return setNotice(`Enter and save the ${CONTENT_LANGUAGE_LABELS[narrationLanguage]} transcript before previewing narration.`); setPreviewingNarration(true); setNarrationPreview(''); setNotice('Preparing narration preview...'); try {
        const translation = siteTranslation(draft, narrationLanguage);
        const result = await previewCmsNarration({ organizationId: draft.organizationId, stopId: /^[0-9a-f-]{36}$/i.test(draft.id) ? draft.id : undefined, language: narrationLanguage, voice: narrationVoice, speakingRate: narrationRate, transcript: activeNarrationTranscript, pronunciations: translation.pronunciations || [] });
        if (result.audioUrl)
            setNarrationPreview(result.audioUrl);
        setNotice(result.message || `${result.cached ? 'Cached' : 'New'} ${result.mode} preview ready. ${result.status ? `Status: ${result.status}.` : ''}`);
    }
    catch (error) {
        setNotice(error instanceof Error ? error.message : 'Narration preview failed.');
    }
    finally {
        setPreviewingNarration(false);
    } };
    const uploadManualNarration = async () => { if (!draft.organizationId || !/^[0-9a-f-]{36}$/i.test(draft.id))
        return setNotice('Save the stop before uploading narration.'); if (!manualNarrationFile)
        return setNotice('Choose an MP3 or WAV audio file.'); if (!activeNarrationTranscript.trim())
        return setNotice(`Enter and save the ${CONTENT_LANGUAGE_LABELS[narrationLanguage]} transcript before uploading narration.`); setUploadingNarration(true); setNarrationPreview(''); setNotice('Validating and uploading the audio privately...'); try {
        const translation = siteTranslation(draft, narrationLanguage);
        const result = await uploadCmsNarrationAudio({ organizationId: draft.organizationId, stopId: draft.id, language: narrationLanguage, sourceType: manualNarrationSource, model: manualNarrationModel, voice: manualNarrationVoice, speakingRate: narrationRate, transcript: activeNarrationTranscript, pronunciations: translation.pronunciations || [], file: manualNarrationFile });
        if (result.audioUrl)
            setNarrationPreview(result.audioUrl);
        await onNarrationUploaded();
        setNotice(result.message || `${result.cached ? 'Existing' : 'New'} uploaded narration ready. Status: ${result.status}.`);
        setManualNarrationFile(null);
    }
    catch (error) {
        setNotice(error instanceof Error ? error.message : 'Narration upload failed.');
    }
    finally {
        setUploadingNarration(false);
    } };
    const saveStop = async () => { setSavingStop(true); setNotice('Validating stop changes…'); try {
        for (const language of CONTENT_LANGUAGES) {
            const value = siteTranslation(draft, language);
            if (language !== 'en' && translationHasContent(value)) {
                const missing = incompleteTranslationFields(value);
                if (missing.length) {
                    setContentLanguage(language);
                    setStep(2);
                    throw new Error(`${CONTENT_LANGUAGE_LABELS[language]} needs: ${missing.join(', ')}.`);
                }
            }
        }
        setNotice('Saving stop changes…');
        await onSave(draft);
    }
    catch (error) {
        setNotice(error instanceof Error ? error.message : 'Stop changes could not be saved.');
    }
    finally {
        setSavingStop(false);
    } };
    const narrationPanel = <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
    <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wide text-blue-800">Quality narration preview</p><p className="mt-0.5 text-[9px] text-blue-700">{narrationConfig?.mode === 'live' ? 'Google live generation is configured.' : 'Safe simulator: pre-generated samples only; no paid call.'}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${narrationConfig?.mode === 'live' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{narrationConfig?.mode || 'loading'}</span></div>
    <div className="mt-3 grid grid-cols-2 gap-2"><div><label className={label}>Language</label><select className={field} value={narrationLanguage} onChange={e => { const language = e.target.value as CmsNarrationVoice['language']; setNarrationLanguage(language); setContentLanguage(language); setNarrationVoice(narrationConfig?.voices.find(voice => voice.language === language)?.id || ''); setNarrationPreview(''); }}>{(narrationConfig?.languages || ['en', 'he', 'fr']).map(language => <option key={language} value={language}>{CONTENT_LANGUAGE_LABELS[language]}</option>)}</select><p className="mt-1 text-[9px] text-blue-700">Pilot narration: English, Hebrew and French.</p></div><div><label className={label}>Pace</label><select className={field} value={narrationRate} onChange={e => { setNarrationRate(Number(e.target.value)); setNarrationPreview(''); }}><option value="0.9">Measured</option><option value="1">Natural</option><option value="1.1">Lively</option></select></div></div>
    <div className="mt-2"><label className={label}>Voice</label><select className={field} value={narrationVoice} onChange={e => { setNarrationVoice(e.target.value); setNarrationPreview(''); }}>{(narrationConfig?.voices || []).filter(voice => voice.language === narrationLanguage).map(voice => <option key={voice.id} value={voice.id}>{voice.label} - {voice.style}</option>)}</select></div>
    {!activeNarrationTranscript.trim() && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[10px] font-semibold text-amber-900">No saved {CONTENT_LANGUAGE_LABELS[narrationLanguage]} transcript. Add it above and save the stop before creating or uploading audio.</p>}
    <button type="button" disabled={previewingNarration || !narrationConfig || !activeNarrationTranscript.trim() || !narrationVoice} onClick={previewNarration} className="mt-3 w-full rounded-xl bg-blue-900 py-2.5 text-xs font-bold text-white disabled:opacity-50">{previewingNarration ? 'Preparing preview...' : 'Preview selected voice'}</button>
    {narrationPreview && <audio className="mt-3 w-full" controls preload="metadata" src={narrationPreview}>Your browser does not support audio preview.</audio>}
    <div className="mt-4 border-t border-blue-100 pt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-800">Upload existing MP3 or WAV audio</p><p className="mt-1 text-[9px] leading-relaxed text-blue-700">Use Kokoro, another TTS service or a human narrator. MP3 uses less storage; WAV preserves the original uncompressed audio. The saved {CONTENT_LANGUAGE_LABELS[narrationLanguage]} transcript must match this editor exactly. Uploading does not call Google or incur a TTS generation charge.</p><div className="mt-2 grid grid-cols-2 gap-2"><div><label className={label}>Audio source</label><select className={field} value={manualNarrationSource} onChange={e => { const source = e.target.value as typeof manualNarrationSource; setManualNarrationSource(source); setManualNarrationModel(source === 'kokoro_tts' ? 'Kokoro-82M' : source === 'human_recording' ? 'Human recording' : 'External TTS'); }}><option value="kokoro_tts">Kokoro TTS</option><option value="human_recording">Human narrator</option><option value="other_tts">Other TTS</option></select></div><div><label className={label}>Model / recording source</label><input className={field} maxLength={120} value={manualNarrationModel} onChange={e => setManualNarrationModel(e.target.value)}/></div></div><div className="mt-2"><label className={label}>Voice or narrator name</label><input className={field} maxLength={120} value={manualNarrationVoice} onChange={e => setManualNarrationVoice(e.target.value)} placeholder="Example: bf_emma or narrator name"/></div><label className="mt-2 flex cursor-pointer justify-center rounded-xl border border-dashed border-blue-300 bg-white p-3 text-xs font-bold text-blue-900">{manualNarrationFile ? manualNarrationFile.name : 'Choose MP3 (15 MB) or WAV (30 MB)'}<input type="file" accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav" className="hidden" onChange={e => setManualNarrationFile(e.target.files?.[0] || null)}/></label><button type="button" disabled={uploadingNarration || !manualNarrationFile || !manualNarrationVoice.trim() || !activeNarrationTranscript.trim()} onClick={uploadManualNarration} className="mt-2 w-full rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white disabled:opacity-50">{uploadingNarration ? 'Uploading audio...' : 'Upload audio for review'}</button></div>
    <p className="mt-2 text-[9px] leading-relaxed text-slate-500">Recordings are cached by transcript, language, voice and pace. Transcript changes create a new version, and narration must be reviewed before public playback.</p>
  </div>;
    const nav = <div className="mb-4 grid grid-cols-5 gap-1">{['Info', 'Story', 'Media', 'Tags', 'Review'].map((name, index) => <button key={name} onClick={() => setStep(index + 1)} className={`rounded-lg py-2 text-[9px] font-bold ${step === index + 1 ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-500'}`}>{index + 1}. {name}</button>)}</div>;
    return <div className="rounded-2xl border bg-white p-4">{nav}<div className="space-y-3">
    {step === 1 && <><div><label className={label}>Stop Title</label><input className={field} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/></div><div><label className={label}>Native / Hebrew Name</label><input className={field} value={draft.hebrewName} onChange={e => setDraft({ ...draft, hebrewName: e.target.value })}/></div><div><label className={label}>City</label><select className={field} value={draft.cityId} onChange={e => { const city = cities.find(c => c.id === e.target.value); setDraft({ ...draft, cityId: city?.id, cityName: city?.name }); }}>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className={label}>Interest</label><select className={field} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as SiteCategory })}>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div><div><label className={label}>Street Address</label><input className={field} value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })}/></div><button disabled={findingCoordinates} onClick={findCoords} className="w-full rounded-xl bg-blue-50 py-2 text-xs font-bold text-blue-900 disabled:cursor-wait disabled:opacity-60">{findingCoordinates ? 'Finding stop coordinates…' : 'Find real-world stop coordinates'}</button>{notice && <p aria-live="polite" className="rounded-lg bg-blue-50 p-2 text-[10px] font-semibold text-blue-900">{notice}</p>}<div className="grid grid-cols-2 gap-2"><input aria-label="Latitude" className={field} type="number" value={draft.lat} onChange={e => setDraft({ ...draft, lat: Number(e.target.value) })}/><input aria-label="Longitude" className={field} type="number" value={draft.lng} onChange={e => setDraft({ ...draft, lng: Number(e.target.value) })}/></div></>}
    {step === 2 && <><div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><label className={label}>Content language</label><select className={field} value={contentLanguage} onChange={e => { const language = e.target.value as ContentLanguage; setContentLanguage(language); setNarrationLanguage(language); setNarrationVoice(narrationConfig?.voices.find(voice => voice.language === language)?.id || ''); setNarrationPreview(''); }}>{CONTENT_LANGUAGES.map(language => <option key={language} value={language}>{CONTENT_LANGUAGE_LABELS[language]}{siteTranslation(draft, language).transcript.trim() ? ' - transcript ready' : ''}</option>)}</select><p className="mt-1 text-[9px] text-blue-800">Each language is stored separately. Empty languages do not fall back silently in the CMS narration workflow.</p></div>{contentLanguage !== 'en' && <><div><label className={label}>Localized stop title</label><input className={field} value={activeTranslation.title} onChange={e => updateActiveTranslation({ title: e.target.value })}/></div><div><label className={label}>Native / alternate name</label><input className={field} value={activeTranslation.nativeName} onChange={e => updateActiveTranslation({ nativeName: e.target.value })}/></div></>}<div><label className={label}>{CONTENT_LANGUAGE_LABELS[contentLanguage]} short description</label><textarea rows={3} className={field} value={activeTranslation.shortDescription} onChange={e => updateActiveTranslation({ shortDescription: e.target.value })}/></div><div><label className={label}>{CONTENT_LANGUAGE_LABELS[contentLanguage]} historical narrative</label><textarea rows={5} className={field} value={activeTranslation.fullDescription} onChange={e => updateActiveTranslation({ fullDescription: e.target.value })}/></div><div><div className="flex items-center justify-between gap-2"><label className={label}>{CONTENT_LANGUAGE_LABELS[contentLanguage]} audio guide transcript</label><span className="text-[9px] font-semibold text-slate-400">{activeTranslation.transcript.length}/{narrationConfig?.maxCharactersPerRequest || 5000}</span></div><textarea rows={6} dir={contentLanguage === 'he' ? 'rtl' : 'ltr'} maxLength={narrationConfig?.maxCharactersPerRequest || 5000} className={field} value={activeTranslation.transcript} onChange={e => updateActiveTranslation({ transcript: e.target.value })}/></div><div className="rounded-xl border border-violet-200 bg-violet-50 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wide text-violet-900">Pronunciation guidance</p><p className="mt-1 text-[9px] leading-relaxed text-violet-800">Recognised verified glossary phrases suggest IPA automatically; every suggestion still requires audio review.</p></div><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-violet-900">{activeTranslation.pronunciations.length}/30</span></div>{!GOOGLE_CUSTOM_PRONUNCIATION_LANGUAGES.includes(contentLanguage) && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[9px] font-semibold text-amber-900">Google custom phonetics are not supported for {CONTENT_LANGUAGE_LABELS[contentLanguage]}. Use a spoken reviewer hint and verify with a native speaker or manual recording.</p>}<div className="mt-2 grid grid-cols-2 gap-2"><div><label className={label}>Exact phrase in transcript</label><input className={field} value={pronunciationDraft.phrase} onChange={e => updatePronunciationPhrase(e.target.value)} placeholder="Umm el-Umdan"/></div><div><label className={label}>Guidance type</label><select className={field} value={pronunciationDraft.encoding} onChange={e => updatePronunciationEncoding(e.target.value as PronunciationEntry['encoding'])}><option value="ipa">IPA phonetics</option><option value="x_sampa">X-SAMPA phonetics</option><option value="spoken_hint">Reviewer spoken hint</option></select></div></div><div className="mt-2"><label className={label}>Pronunciation</label><input className={field} value={pronunciationDraft.pronunciation} onChange={e => setPronunciationDraft({ ...pronunciationDraft, pronunciation: e.target.value })} placeholder="Phonetics or plain-language guidance"/></div><div className="mt-2"><label className={label}>Reviewer note (optional)</label><input className={field} value={pronunciationDraft.reviewerNote} onChange={e => setPronunciationDraft({ ...pronunciationDraft, reviewerNote: e.target.value })} placeholder="Confirm with a native speaker"/></div><button type="button" onClick={addPronunciation} className="mt-2 w-full rounded-xl bg-violet-800 py-2 text-xs font-bold text-white">Add pronunciation guidance</button>{activeTranslation.pronunciations.length > 0 && <div className="mt-2 space-y-2">{activeTranslation.pronunciations.map((entry, index) => <div key={`${entry.phrase}-${index}`} className="flex items-start gap-2 rounded-lg bg-white p-2 text-[10px]"><div className="min-w-0 flex-1"><p className="font-bold text-slate-900">{entry.phrase} → {entry.pronunciation}</p><p className="text-slate-500">{entry.encoding.replace('_', ' ')}{entry.reviewerNote ? ` · ${entry.reviewerNote}` : ''}</p></div><button type="button" aria-label={`Remove pronunciation for ${entry.phrase}`} onClick={() => updateActiveTranslation({ pronunciations: activeTranslation.pronunciations.filter((_, itemIndex) => itemIndex !== index) })} className="rounded p-1 text-rose-700"><Trash2 className="h-3.5 w-3.5"/></button></div>)}</div>}</div>{narrationPanel}<div className="grid grid-cols-2 gap-2"><div><label className={label}>Audio seconds</label><input className={field} type="number" value={draft.audioDuration} onChange={e => setDraft({ ...draft, audioDuration: Number(e.target.value) })}/></div><div><label className={label}>Historical period</label><input className={field} value={draft.historicalPeriod} onChange={e => setDraft({ ...draft, historicalPeriod: e.target.value })}/></div></div></>}
    {step === 3 && <><div><label className={label}>Image preview URL</label><input className={field} value={draft.imageUrl} onChange={e => setDraft({ ...draft, imageUrl: e.target.value })}/><p className="mt-1 text-[9px] text-amber-800">External URLs are previews only. Download and upload the file below so its rights record and approved copy stay with the tour.</p></div><div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><p className="text-[10px] font-bold uppercase text-blue-900">Image rights and public credit</p><div className="mt-2"><label className={label}>Rights status</label><select className={field} value={imageRights.rightsStatus} onChange={e => setImageRights({ ...imageRights, rightsStatus: e.target.value as CmsImageRights['rightsStatus'] })}><option value="unknown">Choose rights status</option><option value="own_work">Own work</option><option value="public_domain">Public domain / CC0</option><option value="cc_by">Creative Commons Attribution</option><option value="cc_by_sa">Creative Commons Attribution-ShareAlike</option><option value="permission_granted">Permission granted</option><option value="other_licensed">Other reusable licence</option></select></div><div className="mt-2"><label className={label}>Creator / photographer</label><input className={field} value={imageRights.creatorName} onChange={e => setImageRights({ ...imageRights, creatorName: e.target.value })}/></div><div className="mt-2"><label className={label}>Source page</label><input className={field} type="url" value={imageRights.sourceUrl} onChange={e => setImageRights({ ...imageRights, sourceUrl: e.target.value })} placeholder="https://commons.wikimedia.org/wiki/File:…"/></div><div className="mt-2 grid grid-cols-2 gap-2"><div><label className={label}>Licence name</label><input className={field} value={imageRights.licenseName} onChange={e => setImageRights({ ...imageRights, licenseName: e.target.value })} placeholder="CC BY 4.0"/></div><div><label className={label}>Licence URL</label><input className={field} type="url" value={imageRights.licenseUrl} onChange={e => setImageRights({ ...imageRights, licenseUrl: e.target.value })} placeholder="https://creativecommons.org/…"/></div></div><div className="mt-2"><label className={label}>Exact public image credit</label><input className={field} value={imageRights.attributionText} onChange={e => setImageRights({ ...imageRights, attributionText: e.target.value })} placeholder="Photo: Creator / Wikimedia Commons / CC BY 4.0"/></div><div className="mt-2"><label className={label}>Rights notes (optional)</label><textarea className={field} rows={2} value={imageRights.rightsNotes} onChange={e => setImageRights({ ...imageRights, rightsNotes: e.target.value })}/></div></div><label className="flex cursor-pointer justify-center rounded-xl border border-dashed p-3 text-xs font-bold">Upload Picture with Rights Record<input type="file" accept="image/*" className="hidden" onChange={e => upload(e.target.files?.[0])}/></label>{draft.imageUrl && <img src={draft.imageUrl} alt="Stop preview" className="h-40 w-full rounded-xl object-cover"/>}<div><label className={label}>Preset heritage photography</label><div className="grid grid-cols-3 gap-2">{presets.map(([name, url]) => <button key={name} onClick={() => setDraft({ ...draft, imageUrl: url })} className="overflow-hidden rounded-lg border text-[9px] font-bold"><img src={url} alt="" className="h-14 w-full object-cover"/><span className="block p-1">{name}</span></button>)}</div></div></>}
    {step === 4 && <><div className="flex gap-2"><input className={field} value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') {
        e.preventDefault();
        addTag(tagInput);
    } }} placeholder="Custom keyword"/><button onClick={() => addTag(tagInput)} className="rounded-xl bg-blue-900 px-3 text-xs font-bold text-white">Add</button></div><div className="flex flex-wrap gap-1.5">{draft.tags.map(tag => <button key={tag} onClick={() => setDraft({ ...draft, tags: draft.tags.filter(item => item !== tag) })} className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-900">{tag} ×</button>)}</div><div><label className={label}>Suggested interests</label><div className="flex flex-wrap gap-1">{suggestions.map(tag => <button key={tag} onClick={() => addTag(tag)} className="rounded-full border px-2 py-1 text-[10px]">+ {tag}</button>)}</div></div></>}
    {step === 5 && <div className="space-y-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Review changes</p><h3 className="mt-1 font-bold">{draft.name || 'Untitled stop'}</h3><p className="text-xs text-slate-500">{draft.cityName} · {draft.category} · Stop order {draft.tourOrder || 'not set'}</p><p className="mt-2 text-xs">{draft.shortDescription || 'No description entered.'}</p><p className="mt-2 text-[10px] text-slate-500">{draft.lat}, {draft.lng} · {draft.tags.join(', ') || 'No tags'}</p></div><div><label className={label}>Tour order</label><input className={field} type="number" min="1" value={draft.tourOrder || 1} onChange={e => setDraft({ ...draft, tourOrder: Number(e.target.value) })}/></div><p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Saving creates or updates a draft. Publication still requires the review and approval workflow.</p></div>}
    {step !== 1 && notice && <p aria-live="polite" className="rounded-lg bg-blue-50 p-2 text-[10px] font-semibold text-blue-900">{notice}</p>}<div className="flex gap-2"><button disabled={savingStop} onClick={step === 1 ? onCancel : () => setStep(step - 1)} className="flex-1 rounded-xl border py-2 font-bold disabled:opacity-50">{step === 1 ? 'Cancel' : 'Back'}</button>{step < 5 ? <button disabled={savingStop} onClick={() => setStep(step + 1)} className="flex-1 rounded-xl bg-blue-900 py-2 font-bold text-white disabled:opacity-50">Next</button> : <button disabled={savingStop} onClick={saveStop} className="flex-1 rounded-xl bg-emerald-700 py-2 font-bold text-white disabled:opacity-50">{savingStop ? 'Saving…' : 'Save Stop Changes'}</button>}</div>
  </div></div>;
};
