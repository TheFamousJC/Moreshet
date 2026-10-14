import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { Router, Request, Response, raw } from 'express';
import { ALLOWED_IMAGE_MIME_TYPES, detectImageMime, MAX_MEDIA_BYTES } from './production.js';
import { detectNarrationAudio, MAX_NARRATION_AUDIO_BYTES } from './audioValidation.js';
import { createNarrationDailyBudget, generateNarrationAudio, loadNarrationConfig, NARRATION_LANGUAGES, NARRATION_VOICES, parseNarrationRequest } from './narrationProvider.js';
import { normalizePronunciations } from '../src/lib/pronunciation.js';

type PlatformRole = 'super_admin' | 'user';
type OrganizationRole = 'administrator' | 'editor' | 'reviewer';

interface Caller {
  user: User;
  platformRole: PlatformRole;
  adminOrganizationIds: string[];
  editableOrganizationIds: string[];
  reviewableOrganizationIds: string[];
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bearerToken(req: Request) {
  const value = req.header('authorization') || '';
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : '';
}

function safeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function createAuthAdminRouter() {
  const router = Router();
  router.post(['/admin/narration/preview','/admin/narration/pronunciation-preview'], (_req,res) => res.status(410).json({error:'Generated narration is disabled in this MVP. Upload a human-reviewed recording or use device read-aloud.'}));
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const secretKey = process.env.SUPABASE_SECRET_KEY || '';
  const configured = Boolean(supabaseUrl && secretKey);
  const admin = configured ? createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) : null;
  const narrationConfig = loadNarrationConfig({ ...process.env, NARRATION_MODE:'simulator' });
  const narrationBudget = createNarrationDailyBudget(narrationConfig.dailyCharacterLimit);
  const simulatorPreviewCache = new Map<string, { audioUrl: string | null; createdAt: string }>();

  const requireCaller = async (req: Request, res: Response): Promise<Caller | null> => {
    if (!admin) {
      res.status(503).json({ error: 'Supabase server authentication is not configured.' });
      return null;
    }
    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Sign in is required.' });
      return null;
    }
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      res.status(401).json({ error: 'The session is invalid or expired.' });
      return null;
    }
    const [{ data: profile }, { data: memberships }] = await Promise.all([
      admin.from('profiles').select('platform_role,status').eq('user_id', userData.user.id).single(),
      admin.from('organization_memberships').select('organization_id,role,status').eq('user_id', userData.user.id).eq('status', 'active'),
    ]);
    if (!profile || profile.status !== 'active') {
      res.status(403).json({ error: 'The account is not active.' });
      return null;
    }
    return {
      user: userData.user,
      platformRole: profile.platform_role as PlatformRole,
      adminOrganizationIds: (memberships || []).filter((item) => item.role === 'administrator').map((item) => item.organization_id),
      editableOrganizationIds: (memberships || []).filter((item) => item.role === 'administrator' || item.role === 'editor').map((item) => item.organization_id),
      reviewableOrganizationIds: (memberships || []).filter((item) => item.role === 'administrator' || item.role === 'reviewer').map((item) => item.organization_id),
    };
  };

  const canManageOrganization = (caller: Caller, organizationId: string) =>
    caller.platformRole === 'super_admin' || caller.adminOrganizationIds.includes(organizationId);
  const canEditOrganization = (caller: Caller, organizationId: string) =>
    caller.platformRole === 'super_admin' || caller.editableOrganizationIds.includes(organizationId);
  const canReviewOrganization = (caller: Caller, organizationId: string) =>
    caller.platformRole === 'super_admin' || caller.reviewableOrganizationIds.includes(organizationId);

  router.get('/admin/narration/config', async (req, res) => {
    const caller = await requireCaller(req, res);
    if (!caller) return;
    return res.json({
      mode: narrationConfig.mode,
      provider: narrationConfig.provider,
      model: narrationConfig.model,
      maxCharactersPerRequest: narrationConfig.maxCharactersPerRequest,
      budget: narrationBudget.status(),
      languages: NARRATION_LANGUAGES,
      voices: NARRATION_VOICES,
      liveConfigured: narrationConfig.mode === 'live',
    });
  });

  router.post('/admin/narration/preview', async (req, res) => {
    const caller = await requireCaller(req, res);
    if (!caller || !admin) return;
    let request;
    try { request = parseNarrationRequest(req.body, narrationConfig); }
    catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid narration request.' }); }
    if (!canEditOrganization(caller, request.organizationId)) return res.status(403).json({ error: 'Editor access is required for this organization.' });

    const simulated = simulatorPreviewCache.get(request.cacheKey);
    if (narrationConfig.mode === 'simulator' && simulated) {
      return res.json({ ...simulated, cacheKey: request.cacheKey, cached: true, mode: 'simulator', provider: narrationConfig.provider, model: narrationConfig.model });
    }

    if (narrationConfig.mode === 'live') {
      const { data: cachedAsset } = await admin.from('narration_assets')
        .select('id,storage_bucket,object_path,status')
        .eq('organization_id', request.organizationId)
        .eq('cache_key', request.cacheKey)
        .in('status', ['generated', 'pending_review', 'approved', 'published'])
        .maybeSingle();
      if (cachedAsset?.object_path) {
        const { data: signed } = await admin.storage.from(cachedAsset.storage_bucket).createSignedUrl(cachedAsset.object_path, 3600);
        if (signed?.signedUrl) {
          await admin.from('narration_generation_events').insert({ organization_id: request.organizationId, asset_id: cachedAsset.id, user_id: caller.user.id, provider: narrationConfig.provider, model: narrationConfig.model, characters: request.transcript.length, cache_hit: true, status: 'succeeded' });
          return res.json({ audioUrl: signed.signedUrl, assetId: cachedAsset.id, status: cachedAsset.status, cacheKey: request.cacheKey, cached: true, mode: 'live', provider: narrationConfig.provider, model: narrationConfig.model });
        }
      }
      if (!narrationBudget.tryConsume(request.transcript.length)) return res.status(429).json({ error: 'The daily narration generation safety limit has been reached. No paid request was sent.' });
    }

    try {
      const generated = await generateNarrationAudio(request, narrationConfig);
      if (generated.mode === 'simulator') {
        const preview = { audioUrl: generated.audioUrl, createdAt: new Date().toISOString() };
        simulatorPreviewCache.set(request.cacheKey, preview);
        return res.json({ ...preview, cacheKey: request.cacheKey, cached: false, mode: 'simulator', provider: generated.provider, model: generated.model, message: generated.audioUrl ? 'Playing a pre-generated evaluation sample. No paid narration was generated.' : 'This language has no bundled evaluation sample yet. No paid narration was generated.' });
      }

      const objectPath = `${request.organizationId}/${request.stopId || 'preview'}/${request.language}/${request.cacheKey}.mp3`;
      const { error: uploadError } = await admin.storage.from('narration-audio').upload(objectPath, generated.bytes!, { contentType: generated.mimeType, upsert: false });
      if (uploadError && !/already exists/i.test(uploadError.message)) throw uploadError;
      const { data: asset, error: assetError } = await admin.from('narration_assets').upsert({
        organization_id: request.organizationId,
        stop_id: request.stopId || null,
        language: request.language,
        provider: generated.provider,
        model: generated.model,
        voice_name: request.voice,
        speaking_rate: request.speakingRate,
        transcript_sha256: request.cacheKey,
        cache_key: request.cacheKey,
        source_characters: request.transcript.length,
        pronunciation_guide: request.pronunciations,
        storage_bucket: 'narration-audio',
        object_path: objectPath,
        byte_size: generated.bytes!.length,
        status: 'generated',
        generated_by: caller.user.id,
      }, { onConflict: 'organization_id,cache_key' }).select('id,status').single();
      if (assetError || !asset) throw new Error(assetError?.message || 'Narration metadata could not be saved.');
      await admin.from('narration_generation_events').insert({
        organization_id: request.organizationId, asset_id: asset.id, user_id: caller.user.id,
        provider: generated.provider, model: generated.model, characters: request.transcript.length,
        cache_hit: false, status: 'succeeded',
      });
      const { data: signed, error: signedError } = await admin.storage.from('narration-audio').createSignedUrl(objectPath, 3600);
      if (signedError || !signed) throw new Error(signedError?.message || 'The narration preview could not be signed.');
      return res.status(201).json({ audioUrl: signed.signedUrl, assetId: asset.id, status: asset.status, cacheKey: request.cacheKey, cached: false, mode: 'live', provider: generated.provider, model: generated.model });
    } catch (error) {
      console.error('Narration preview failed:', error instanceof Error ? error.message : error);
      if (narrationConfig.mode === 'live') await admin.from('narration_generation_events').insert({ organization_id: request.organizationId, user_id: caller.user.id, provider: narrationConfig.provider, model: narrationConfig.model, characters: request.transcript.length, cache_hit: false, status: 'failed', error_code: 'provider_or_storage_failure' });
      return res.status(502).json({ error: error instanceof Error ? error.message : 'Narration generation failed.' });
    }
  });

  router.post('/admin/narration/pronunciation-preview', async (req, res) => {
    const caller = await requireCaller(req, res);
    if (!caller || !admin) return;
    if (narrationConfig.mode !== 'live') return res.status(409).json({ error: 'Live narration must be enabled before a reviewer can hear and approve pronunciation guidance.' });

    const revisionId = String(req.body?.revisionId || '').trim();
    const language = String(req.body?.language || '').trim();
    const phrase = String(req.body?.phrase || '').trim();
    const voice = String(req.body?.voice || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(revisionId)) return res.status(400).json({ error: 'The revision identifier is invalid.' });
    const { data: revision, error: revisionError } = await admin.from('content_revisions')
      .select('id,organization_id,content_kind,status,snapshot')
      .eq('id', revisionId).single();
    if (revisionError || !revision) return res.status(404).json({ error: 'The submitted revision was not found.' });
    if (revision.content_kind !== 'stop' || !['pending_review', 'approved'].includes(revision.status)) return res.status(409).json({ error: 'Only a submitted stop pronunciation can be previewed.' });
    if (!canReviewOrganization(caller, revision.organization_id)) return res.status(403).json({ error: 'Reviewer access is required for this organization.' });

    const snapshot = (revision.snapshot && typeof revision.snapshot === 'object' ? revision.snapshot : {}) as Record<string, unknown>;
    const translations = (snapshot.translations && typeof snapshot.translations === 'object' ? snapshot.translations : {}) as Record<string, unknown>;
    const translation = (translations[language] && typeof translations[language] === 'object' ? translations[language] : {}) as Record<string, unknown>;
    const entries = normalizePronunciations(translation.pronunciations || [], String(translation.transcript || phrase));
    const pronunciation = entries.find((entry) => entry.phrase.toLocaleLowerCase() === phrase.toLocaleLowerCase());
    if (!pronunciation) return res.status(400).json({ error: 'That pronunciation is not part of the submitted revision.' });

    let request;
    try { request = parseNarrationRequest({ organizationId: revision.organization_id, language, voice, speakingRate: 1, transcript: pronunciation.phrase, pronunciations: [pronunciation] }, narrationConfig); }
    catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'The pronunciation preview is invalid.' }); }
    const objectPath = `${revision.organization_id}/pronunciation-previews/${revision.id}/${language}/${request.cacheKey}.mp3`;
    const startReview = async () => {
      const { data: reviewEvent, error: reviewEventError } = await admin.from('pronunciation_review_events').insert({
        organization_id: revision.organization_id,
        revision_id: revision.id,
        reviewer_user_id: caller.user.id,
        language,
        phrase: pronunciation.phrase,
        guide_entry: pronunciation,
        cache_key: request.cacheKey,
      }).select('id').single();
      if (reviewEventError || !reviewEvent) throw new Error(reviewEventError?.message || 'Pronunciation review evidence could not be started.');
      return reviewEvent.id as string;
    };
    const { data: existing } = await admin.storage.from('narration-audio').createSignedUrl(objectPath, 900);
    if (existing?.signedUrl) {
      try {
        const reviewEventId = await startReview();
        return res.json({ audioUrl: existing.signedUrl, reviewEventId, cached: true, mode: 'live', message: 'Cached pronunciation review audio is ready.' });
      } catch (error) { return res.status(502).json({ error: error instanceof Error ? error.message : 'Pronunciation review evidence could not be started.' }); }
    }
    if (!narrationBudget.tryConsume(request.transcript.length)) return res.status(429).json({ error: 'The daily narration generation safety limit has been reached. No paid request was sent.' });

    try {
      const generated = await generateNarrationAudio(request, narrationConfig);
      if (generated.mode !== 'live' || !generated.bytes) throw new Error('Live pronunciation audio was not returned.');
      const { error: uploadError } = await admin.storage.from('narration-audio').upload(objectPath, generated.bytes, { contentType: generated.mimeType, upsert: true });
      if (uploadError) throw uploadError;
      await admin.from('narration_generation_events').insert({ organization_id: revision.organization_id, asset_id: null, user_id: caller.user.id, provider: generated.provider, model: generated.model, characters: request.transcript.length, cache_hit: false, status: 'succeeded' });
      const { data: signed, error: signedError } = await admin.storage.from('narration-audio').createSignedUrl(objectPath, 900);
      if (signedError || !signed?.signedUrl) throw new Error(signedError?.message || 'The pronunciation preview could not be signed.');
      const reviewEventId = await startReview();
      return res.status(201).json({ audioUrl: signed.signedUrl, reviewEventId, cached: false, mode: 'live', message: 'Proposed pronunciation audio is ready for review.' });
    } catch (error) {
      await admin.from('narration_generation_events').insert({ organization_id: revision.organization_id, asset_id: null, user_id: caller.user.id, provider: narrationConfig.provider, model: narrationConfig.model, characters: request.transcript.length, cache_hit: false, status: 'failed', error_code: 'pronunciation_preview_failure' });
      return res.status(502).json({ error: error instanceof Error ? error.message : 'Pronunciation preview failed.' });
    }
  });

  router.post('/admin/narration/pronunciation-preview/complete', async (req, res) => {
    const caller = await requireCaller(req, res);
    if (!caller || !admin) return;
    const reviewEventId = String(req.body?.reviewEventId || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(reviewEventId)) return res.status(400).json({ error: 'The pronunciation review event is invalid.' });
    const { data: event, error: eventError } = await admin.from('pronunciation_review_events')
      .select('id,organization_id,revision_id,reviewer_user_id,language,phrase,started_at,completed_at')
      .eq('id', reviewEventId).single();
    if (eventError || !event) return res.status(404).json({ error: 'The pronunciation review event was not found.' });
    if (event.reviewer_user_id !== caller.user.id || !canReviewOrganization(caller, event.organization_id)) return res.status(403).json({ error: 'Only the reviewer who started this sample may complete it.' });
    if (event.completed_at) return res.json({ completed: true, completedAt: event.completed_at });
    if (Date.now() - new Date(event.started_at).getTime() < 300) return res.status(409).json({ error: 'Listen to the complete pronunciation sample before approval.' });
    const completedAt = new Date().toISOString();
    const { error: completionError } = await admin.from('pronunciation_review_events').update({ completed_at: completedAt }).eq('id', event.id).is('completed_at', null);
    if (completionError) return res.status(400).json({ error: completionError.message });
    const actorRole = caller.platformRole === 'super_admin' ? 'super_admin' : caller.adminOrganizationIds.includes(event.organization_id) ? 'administrator' : 'reviewer';
    await admin.from('audit_log').insert({
      organization_id: event.organization_id,
      actor_user_id: caller.user.id,
      actor_role: actorRole,
      action: 'pronunciation_review_completed',
      entity_type: 'content_revision',
      entity_id: event.revision_id,
      after_summary: { language: event.language, phrase: event.phrase, reviewEventId: event.id },
    });
    return res.json({ completed: true, completedAt });
  });

  router.post('/admin/narration/upload', raw({ type: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'application/octet-stream'], limit: MAX_NARRATION_AUDIO_BYTES }), async (req, res) => {
    const caller = await requireCaller(req, res);
    if (!caller || !admin) return;
    const organizationId = String(req.header('x-organization-id') || '').trim();
    const stopId = String(req.header('x-stop-id') || '').trim();
    const language = String(req.header('x-narration-language') || '').trim();
    const sourceType = String(req.header('x-narration-source') || '').trim();
    const transcriptHash = String(req.header('x-transcript-sha256') || '').trim().toLowerCase();
    const speakingRate = Number(req.header('x-speaking-rate') || '1');
    const decodeHeader = (name: string) => {
      try { return decodeURIComponent(String(req.header(name) || '')); }
      catch { return ''; }
    };
    const originalFilename = decodeHeader('x-original-filename').split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255) || '';
    const requestedModel = decodeHeader('x-narration-model').trim().slice(0, 120);
    const voiceName = decodeHeader('x-narration-voice').trim().slice(0, 120);
    let pronunciations;
    try { pronunciations = normalizePronunciations(JSON.parse(decodeHeader('x-pronunciation-guide') || '[]')); }
    catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid pronunciation guidance.' }); }
    if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !/^[0-9a-f-]{36}$/i.test(stopId)) return res.status(400).json({ error: 'Choose a saved stop before uploading narration.' });
    if (!canEditOrganization(caller, organizationId)) return res.status(403).json({ error: 'Editor access is required for this organization.' });
    if (!['en','he','ru','fr','de','es'].includes(language)) return res.status(400).json({ error: 'Choose one of the six supported narration languages.' });
    if (!['kokoro_tts','human_recording','other_tts'].includes(sourceType)) return res.status(400).json({ error: 'Choose a valid narration source.' });
    if (!/^[0-9a-f]{64}$/.test(transcriptHash)) return res.status(400).json({ error: 'The transcript version could not be verified.' });
    if (!Number.isFinite(speakingRate) || speakingRate < 0.85 || speakingRate > 1.15) return res.status(400).json({ error: 'Narration pace must be between 0.85 and 1.15.' });
    const requestedExtension = originalFilename.split('.').pop()?.toLowerCase();
    if (!originalFilename || !['mp3', 'wav'].includes(requestedExtension || '')) return res.status(400).json({ error: 'Choose an MP3 or WAV file.' });
    if (!voiceName || voiceName.length < 2) return res.status(400).json({ error: 'Enter the Kokoro voice or narrator name.' });
    const detectedAudio = Buffer.isBuffer(req.body) ? detectNarrationAudio(req.body) : null;
    if (!detectedAudio) return res.status(415).json({ error: 'The selected file is not a valid MP3 or WAV, or it exceeds the format size limit.' });
    if (requestedExtension !== detectedAudio.extension) return res.status(415).json({ error: `The file extension does not match its ${detectedAudio.extension.toUpperCase()} audio content.` });

    const [{ data: stop }, { data: translation }] = await Promise.all([
      admin.from('stops').select('id').eq('id', stopId).eq('organization_id', organizationId).neq('status', 'archived').maybeSingle(),
      admin.from('stop_translations').select('audio_transcript,pronunciation_guide').eq('stop_id', stopId).eq('organization_id', organizationId).eq('language', language).maybeSingle(),
    ]);
    if (!stop) return res.status(404).json({ error: 'The saved stop was not found in this organization.' });
    const persistedTranscript = String(translation?.audio_transcript || '').trim();
    if (!persistedTranscript) return res.status(409).json({ error: 'Save and publish the narration transcript before uploading its audio.' });
    if (persistedTranscript.length > 10_000) return res.status(400).json({ error: 'Manual narration is limited to a 10,000-character transcript per stop.' });
    const persistedHash = createHash('sha256').update(persistedTranscript).digest('hex');
    if (persistedHash !== transcriptHash) return res.status(409).json({ error: 'This audio does not match the saved transcript version. Save or publish the transcript, then upload again.' });
    try { pronunciations = normalizePronunciations(pronunciations, persistedTranscript); }
    catch (error) { return res.status(409).json({ error: error instanceof Error ? error.message : 'Pronunciation guidance does not match the saved transcript.' }); }
    const persistedPronunciations = normalizePronunciations(translation?.pronunciation_guide || [], persistedTranscript);
    if (JSON.stringify(pronunciations) !== JSON.stringify(persistedPronunciations)) return res.status(409).json({ error: 'Save the pronunciation guidance before uploading its audio.' });

    const provider = sourceType === 'kokoro_tts' ? 'kokoro' : sourceType === 'human_recording' ? 'human' : 'other_tts';
    const model = requestedModel || (sourceType === 'kokoro_tts' ? 'Kokoro-82M' : sourceType === 'human_recording' ? 'Human recording' : 'External TTS');
    const fileHash = createHash('sha256').update(req.body).digest('hex');
    const cacheKey = createHash('sha256').update(JSON.stringify({ transcriptHash, fileHash, language, provider, model, voiceName, speakingRate, pronunciations })).digest('hex');
    const { data: existing } = await admin.from('narration_assets').select('id,storage_bucket,object_path,status').eq('organization_id', organizationId).eq('cache_key', cacheKey).maybeSingle();
    if (existing?.object_path) {
      const { data: signed } = await admin.storage.from(existing.storage_bucket).createSignedUrl(existing.object_path, 3600);
      return res.json({ audioUrl: signed?.signedUrl || null, assetId: existing.id, status: existing.status, cached: true, sourceType });
    }

    const objectPath = `${organizationId}/${stopId}/${language}/${cacheKey}.${detectedAudio.extension}`;
    const { error: uploadError } = await admin.storage.from('narration-audio').upload(objectPath, req.body, { contentType: detectedAudio.mimeType, upsert: false });
    const uploadedNew = !uploadError;
    if (uploadError && !/already exists/i.test(uploadError.message)) return res.status(502).json({ error: 'The private narration file could not be stored.' });
    const { data: asset, error: assetError } = await admin.from('narration_assets').insert({
      organization_id: organizationId, stop_id: stopId, language, provider, model, voice_name: voiceName,
      speaking_rate: Math.round(speakingRate * 100) / 100, transcript_sha256: transcriptHash, cache_key: cacheKey,
      source_characters: persistedTranscript.length, storage_bucket: 'narration-audio', object_path: objectPath,
      mime_type: detectedAudio.mimeType, byte_size: req.body.length, status: 'generated', generated_by: caller.user.id, source_type: sourceType,
      original_filename: originalFilename, file_sha256: fileHash,
      pronunciation_guide: pronunciations,
    }).select('id,status').single();
    if (assetError || !asset) {
      if (uploadedNew) await admin.storage.from('narration-audio').remove([objectPath]);
      return res.status(502).json({ error: assetError?.message || 'Narration metadata could not be saved.' });
    }
    const { data: signed } = await admin.storage.from('narration-audio').createSignedUrl(objectPath, 3600);
    return res.status(201).json({ audioUrl: signed?.signedUrl || null, assetId: asset.id, status: asset.status, cached: false, sourceType, format: detectedAudio.extension, message: `${detectedAudio.extension.toUpperCase()} uploaded privately and ready for narration review.` });
  });

  router.post('/admin/media', raw({ type: () => true, limit: MAX_MEDIA_BYTES }), async (req, res) => {
    const caller = await requireCaller(req, res);
    if (!caller || !admin) return;
    const organizationId = String(req.header('x-organization-id') || '');
    if (!canEditOrganization(caller, organizationId)) return res.status(403).json({ error: 'Editor access is required for this organization.' });
    const { data: organization } = await admin.from('organizations').select('status').eq('id', organizationId).single();
    if (!organization || !['trial', 'active'].includes(organization.status)) return res.status(403).json({ error: 'Uploads are disabled for this organization.' });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Choose a non-empty image file.' });
    const declaredMime = String(req.header('content-type') || '').split(';')[0].trim().toLowerCase();
    const detectedMime = detectImageMime(req.body);
    if (!detectedMime || !ALLOWED_IMAGE_MIME_TYPES.includes(detectedMime)) return res.status(415).json({ error: 'Only genuine JPEG, PNG, WebP or GIF images are accepted.' });
    if (declaredMime !== detectedMime) return res.status(415).json({ error: `The file signature is ${detectedMime}, not ${declaredMime || 'the declared type'}.` });
    let originalFilename = 'upload';
    try { originalFilename = decodeURIComponent(String(req.header('x-file-name') || 'upload')); } catch { originalFilename = 'upload'; }
    originalFilename = originalFilename.slice(0, 180);
    const decodeHeader = (name: string, maxLength: number) => {
      const rawValue = String(req.header(name) || '');
      try { return decodeURIComponent(rawValue).trim().slice(0, maxLength); }
      catch { return rawValue.trim().slice(0, maxLength); }
    };
    const rightsStatus = decodeHeader('x-media-rights-status', 40);
    const allowedRights = new Set(['own_work', 'public_domain', 'cc_by', 'cc_by_sa', 'permission_granted', 'other_licensed']);
    const creatorName = decodeHeader('x-media-creator', 200);
    const sourceUrl = decodeHeader('x-media-source-url', 2000);
    const licenseName = decodeHeader('x-media-license-name', 150);
    const licenseUrl = decodeHeader('x-media-license-url', 2000);
    const attributionText = decodeHeader('x-media-attribution', 500);
    const rightsNotes = decodeHeader('x-media-rights-notes', 2000);
    if (!allowedRights.has(rightsStatus) || !attributionText) return res.status(400).json({ error: 'Image rights status and public attribution are required.' });
    if (['cc_by', 'cc_by_sa', 'other_licensed'].includes(rightsStatus) && (!sourceUrl || !licenseName || !licenseUrl)) {
      return res.status(400).json({ error: 'Licensed images require a source page, licence name and licence URL.' });
    }
    const safeName = originalFilename.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+/, '') || 'upload';
    const objectPath = `${organizationId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await admin.storage.from('tour-media').upload(objectPath, req.body, { contentType: detectedMime, upsert: false });
    if (uploadError) return res.status(400).json({ error: uploadError.message });
    const { data, error } = await admin.from('media_assets').insert({
      organization_id: organizationId, kind: 'image', storage_bucket: 'tour-media', object_path: objectPath,
      original_filename: originalFilename, mime_type: detectedMime, byte_size: req.body.length,
      validation_status: 'pending', uploaded_by: caller.user.id, rights_status: rightsStatus,
      creator_name: creatorName || null, source_url: sourceUrl || null, license_name: licenseName || null,
      license_url: licenseUrl || null, attribution_text: attributionText, rights_notes: rightsNotes || null,
    }).select('id').single();
    if (error || !data) {
      await admin.storage.from('tour-media').remove([objectPath]);
      return res.status(400).json({ error: error?.message || 'Image metadata could not be saved.' });
    }
    const { data: signed, error: signedError } = await admin.storage.from('tour-media').createSignedUrl(objectPath, 3600);
    if (signedError || !signed) return res.status(500).json({ error: signedError?.message || 'A secure image preview could not be created.' });
    return res.status(201).json({ mediaId: data.id, url: signed.signedUrl, mimeType: detectedMime, byteSize: req.body.length });
  });

  router.post('/admin/media/import-url', async (req, res) => {
    const caller = await requireCaller(req, res);
    if (!caller || !admin) return;
    const organizationId = String(req.body?.organizationId || '').trim();
    const stopId = String(req.body?.stopId || '').trim();
    if (!canEditOrganization(caller, organizationId)) return res.status(403).json({ error: 'Editor access is required for this organization.' });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stopId)) {
      return res.status(400).json({ error: 'A valid stop is required.' });
    }

    const rights = req.body?.rights || {};
    const rightsStatus = String(rights.rightsStatus || '').trim();
    const creatorName = String(rights.creatorName || '').trim().slice(0, 200);
    const sourceUrl = String(rights.sourceUrl || '').trim().slice(0, 2000);
    const licenseName = String(rights.licenseName || '').trim().slice(0, 150);
    const licenseUrl = String(rights.licenseUrl || '').trim().slice(0, 2000);
    const attributionText = String(rights.attributionText || '').trim().slice(0, 500);
    const rightsNotes = String(rights.rightsNotes || '').trim().slice(0, 2000);
    const allowedRights = new Set(['public_domain', 'cc_by', 'cc_by_sa', 'permission_granted', 'other_licensed']);
    if (!allowedRights.has(rightsStatus) || !attributionText) return res.status(400).json({ error: 'A reviewed rights status and public attribution are required.' });
    if (['cc_by', 'cc_by_sa', 'other_licensed'].includes(rightsStatus) && (!sourceUrl || !licenseName || !licenseUrl)) {
      return res.status(400).json({ error: 'Licensed images require a source page, licence name and licence URL.' });
    }

    let importUrl: URL;
    let sourcePage: URL;
    try {
      importUrl = new URL(String(req.body?.imageUrl || ''));
      sourcePage = new URL(sourceUrl);
    } catch {
      return res.status(400).json({ error: 'Valid Wikimedia image and source URLs are required.' });
    }
    const isCommonsImport = importUrl.protocol === 'https:' && importUrl.hostname === 'commons.wikimedia.org'
      && importUrl.pathname.toLowerCase().startsWith('/wiki/special:redirect/file/');
    const isCommonsSource = sourcePage.protocol === 'https:' && sourcePage.hostname === 'commons.wikimedia.org'
      && sourcePage.pathname.toLowerCase().startsWith('/wiki/file:');
    if (!isCommonsImport || !isCommonsSource) return res.status(400).json({ error: 'Automated imports are restricted to reviewed Wikimedia Commons file pages.' });

    const [{ data: organization }, { data: stop }] = await Promise.all([
      admin.from('organizations').select('status').eq('id', organizationId).maybeSingle(),
      admin.from('stops').select('id').eq('id', stopId).eq('organization_id', organizationId).neq('status', 'archived').maybeSingle(),
    ]);
    if (!organization || !['trial', 'active'].includes(organization.status)) return res.status(403).json({ error: 'Imports are disabled for this organization.' });
    if (!stop) return res.status(404).json({ error: 'The selected stop was not found.' });

    const { data: existing } = await admin.from('media_assets')
      .select('id,storage_bucket,object_path,mime_type,byte_size')
      .eq('organization_id', organizationId).eq('source_url', sourceUrl).is('deleted_at', null).limit(1).maybeSingle();
    if (existing) {
      const { error: attachError } = await admin.from('stops').update({ hero_media_id: existing.id, updated_by: caller.user.id }).eq('id', stopId).eq('organization_id', organizationId);
      if (attachError) return res.status(400).json({ error: attachError.message });
      const { data: signed } = await admin.storage.from(existing.storage_bucket).createSignedUrl(existing.object_path, 3600);
      return res.json({ mediaId: existing.id, url: signed?.signedUrl || null, mimeType: existing.mime_type, byteSize: existing.byte_size, reused: true });
    }

    importUrl.searchParams.set('width', '1600');
    let upstream: globalThis.Response;
    try {
      upstream = await fetch(importUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
        headers: { 'User-Agent': 'MoreshetCMS/1.0 (https://moreshet-production.up.railway.app; contact: jeremy@3sci.com)' },
      });
    } catch {
      return res.status(502).json({ error: 'The Wikimedia image could not be downloaded.' });
    }
    let finalUrl: URL;
    try { finalUrl = new URL(upstream.url); }
    catch { return res.status(502).json({ error: 'Wikimedia returned an invalid image location.' }); }
    if (!upstream.ok || finalUrl.protocol !== 'https:' || finalUrl.hostname !== 'upload.wikimedia.org') {
      const safeReason = !upstream.ok ? `HTTP ${upstream.status}` : `unexpected host ${finalUrl.hostname}`;
      return res.status(502).json({ error: `Wikimedia did not return an approved image file (${safeReason}).` });
    }
    const declaredLength = Number(upstream.headers.get('content-length') || 0);
    if (declaredLength > MAX_MEDIA_BYTES) return res.status(413).json({ error: 'The resized image exceeds the upload limit.' });
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_MEDIA_BYTES) return res.status(413).json({ error: 'The resized image is empty or exceeds the upload limit.' });
    const detectedMime = detectImageMime(bytes);
    if (!detectedMime || !ALLOWED_IMAGE_MIME_TYPES.includes(detectedMime)) return res.status(415).json({ error: 'Wikimedia did not return a supported image.' });

    let originalFilename = String(req.body?.originalFilename || '').trim();
    if (!originalFilename) {
      try { originalFilename = decodeURIComponent(sourcePage.pathname.split('/').pop() || 'commons-image'); }
      catch { originalFilename = 'commons-image'; }
    }
    originalFilename = originalFilename.replace(/^File:/i, '').slice(0, 180);
    const safeName = originalFilename.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+/, '') || 'commons-image';
    const objectPath = `${organizationId}/${crypto.randomUUID()}-${safeName}`;
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const { error: uploadError } = await admin.storage.from('tour-media').upload(objectPath, bytes, { contentType: detectedMime, upsert: false });
    if (uploadError) return res.status(400).json({ error: uploadError.message });
    const { data: media, error: mediaError } = await admin.from('media_assets').insert({
      organization_id: organizationId, kind: 'image', storage_bucket: 'tour-media', object_path: objectPath,
      original_filename: originalFilename, mime_type: detectedMime, byte_size: bytes.length, checksum_sha256: checksum,
      validation_status: 'pending', uploaded_by: caller.user.id, rights_status: rightsStatus,
      creator_name: creatorName || null, source_url: sourceUrl, license_name: licenseName || null,
      license_url: licenseUrl || null, attribution_text: attributionText, rights_notes: rightsNotes || null,
    }).select('id').single();
    if (mediaError || !media) {
      await admin.storage.from('tour-media').remove([objectPath]);
      return res.status(400).json({ error: mediaError?.message || 'Image metadata could not be saved.' });
    }
    const { error: attachError } = await admin.from('stops').update({ hero_media_id: media.id, updated_by: caller.user.id }).eq('id', stopId).eq('organization_id', organizationId);
    if (attachError) {
      await admin.from('media_assets').delete().eq('id', media.id);
      await admin.storage.from('tour-media').remove([objectPath]);
      return res.status(400).json({ error: attachError.message });
    }
    const { data: signed } = await admin.storage.from('tour-media').createSignedUrl(objectPath, 3600);
    return res.status(201).json({ mediaId: media.id, url: signed?.signedUrl || null, mimeType: detectedMime, byteSize: bytes.length, reused: false });
  });

  router.get('/admin/context', async (req, res) => {
    const caller = await requireCaller(req, res);
    if (!caller || !admin) return;
    if (caller.platformRole !== 'super_admin' && caller.adminOrganizationIds.length === 0) return res.status(403).json({ error: 'Administrator access is required.' });

    const organizationQuery = admin.from('organizations').select('id,name,slug,status').order('name');
    const { data: organizations, error: organizationError } = caller.platformRole === 'super_admin'
      ? await organizationQuery
      : await organizationQuery.in('id', caller.adminOrganizationIds);
    if (organizationError) return res.status(500).json({ error: organizationError.message });

    const organizationIds = (organizations || []).map((organization) => organization.id);
    if (!organizationIds.length) return res.json({ organizations: [], staff: [], caller: { platformRole: caller.platformRole } });

    const [{ data: memberships, error: membershipError }, { data: profiles, error: profileError }, usersResult] = await Promise.all([
      admin.from('organization_memberships').select('id,organization_id,user_id,role,status,accepted_at').in('organization_id', organizationIds).order('created_at'),
      admin.from('profiles').select('user_id,username,display_name,status,password_reset_required'),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (membershipError || profileError || usersResult.error) return res.status(500).json({ error: membershipError?.message || profileError?.message || usersResult.error?.message });
    const profileByUser = new Map<string, (typeof profiles)[number]>((profiles || []).map((profile) => [profile.user_id, profile] as const));
    const authByUser = new Map<string, User>(usersResult.data.users.map((user) => [user.id, user] as const));
    const staff = (memberships || []).map((membership) => ({
      ...membership,
      email: authByUser.get(membership.user_id)?.email || '',
      ...profileByUser.get(membership.user_id),
    }));
    return res.json({ organizations, staff, caller: { platformRole: caller.platformRole } });
  });

  router.post('/admin/organizations', async (req, res) => {
    const caller = await requireCaller(req, res);
    if (!caller || !admin) return;
    if (caller.platformRole !== 'super_admin') return res.status(403).json({ error: 'Only the Super Admin can create an organization.' });
    const name = String(req.body?.name || '').trim();
    const slug = safeSlug(String(req.body?.slug || name));
    if (name.length < 2 || !slug) return res.status(400).json({ error: 'Enter a valid organization name and slug.' });
    const { data, error } = await admin.from('organizations').insert({ name, slug, status: 'active', created_by: caller.user.id }).select('id,name,slug,status').single();
    if (error) return res.status(400).json({ error: error.message });
    await admin.from('organization_settings').insert({ organization_id: data.id, application_name: name, enabled_languages: ['en', 'he', 'ru', 'fr', 'de', 'es'] });
    return res.status(201).json({ organization: data });
  });

  router.post('/admin/staff', async (req, res) => {
    const caller = await requireCaller(req, res);
    if (!caller || !admin) return;
    const organizationId = String(req.body?.organizationId || '');
    const email = String(req.body?.email || '').trim().toLowerCase();
    const username = String(req.body?.username || '').trim();
    const displayName = String(req.body?.displayName || '').trim();
    const role = String(req.body?.role || '') as OrganizationRole;
    const temporaryPassword = String(req.body?.temporaryPassword || '');
    if (!canManageOrganization(caller, organizationId)) return res.status(403).json({ error: 'You cannot manage staff for this organization.' });
    if (!['administrator', 'editor', 'reviewer'].includes(role)) return res.status(400).json({ error: 'Select a valid staff role.' });
    if (role === 'administrator' && caller.platformRole !== 'super_admin') return res.status(403).json({ error: 'Only the Super Admin can appoint an Administrator.' });
    if (!emailPattern.test(email) || username.length < 3 || displayName.length < 1) return res.status(400).json({ error: 'Email, display name and a username of at least 3 characters are required.' });
    if (temporaryPassword.length < 16) return res.status(400).json({ error: 'Temporary passwords must contain at least 16 characters.' });

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { username, display_name: displayName, age_16_confirmed: true, preferred_language: 'en' },
    });
    if (createError || !created.user) return res.status(400).json({ error: createError?.message || 'The account could not be created.' });

    const targetUserId = created.user.id;
    const profileResult = await admin.from('profiles').update({ password_reset_required: true }).eq('user_id', targetUserId);
    const membershipResult = await admin.from('organization_memberships').insert({
      organization_id: organizationId,
      user_id: targetUserId,
      role,
      status: 'active',
      invited_by: caller.user.id,
      accepted_at: new Date().toISOString(),
    });
    if (profileResult.error || membershipResult.error) {
      await admin.auth.admin.deleteUser(targetUserId);
      return res.status(400).json({ error: profileResult.error?.message || membershipResult.error?.message });
    }
    await admin.from('account_security_actions').insert({
      organization_id: organizationId,
      target_user_id: targetUserId,
      actor_user_id: caller.user.id,
      action: 'temporary_password_issued',
      reason: 'Initial staff account creation',
      safe_metadata: { role },
    });
    return res.status(201).json({ staff: { userId: targetUserId, email, username, displayName, role }, message: 'Staff account created. Share the temporary password securely; it will not be shown again.' });
  });

  router.post('/admin/staff/reset-password', async (req, res) => {
    const caller = await requireCaller(req, res);
    if (!caller || !admin) return;
    const organizationId = String(req.body?.organizationId || '');
    const targetUserId = String(req.body?.targetUserId || '');
    const temporaryPassword = String(req.body?.temporaryPassword || '');
    const reason = String(req.body?.reason || 'Administrator requested reset').slice(0, 1000);
    if (!canManageOrganization(caller, organizationId)) return res.status(403).json({ error: 'You cannot reset this account.' });
    if (temporaryPassword.length < 16) return res.status(400).json({ error: 'Temporary passwords must contain at least 16 characters.' });
    const { data: targetMembership } = await admin.from('organization_memberships').select('role').eq('organization_id', organizationId).eq('user_id', targetUserId).eq('status', 'active').single();
    if (!targetMembership) return res.status(404).json({ error: 'The staff membership was not found.' });
    if (targetMembership.role === 'administrator' && caller.platformRole !== 'super_admin') return res.status(403).json({ error: 'Only the Super Admin can reset an Administrator account.' });
    const { error: passwordError } = await admin.auth.admin.updateUserById(targetUserId, { password: temporaryPassword });
    if (passwordError) return res.status(400).json({ error: passwordError.message });
    await admin.from('profiles').update({ password_reset_required: true }).eq('user_id', targetUserId);
    await admin.from('account_security_actions').insert({ organization_id: organizationId, target_user_id: targetUserId, actor_user_id: caller.user.id, action: 'temporary_password_issued', reason, safe_metadata: {} });
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}/logout`, { method: 'POST', headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } }).catch(() => undefined);
    return res.json({ message: 'Temporary password issued and active sessions revoked. It will not be shown again.' });
  });

  router.post('/account/password-reset-completed', async (req, res) => {
    const caller = await requireCaller(req, res);
    if (!caller || !admin) return;
    const { error } = await admin.from('profiles').update({ password_reset_required: false }).eq('user_id', caller.user.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Password replacement completed.' });
  });

  return router;
}
