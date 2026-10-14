import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { loadPublishedContent } from '../server/publicContent.js';
import { createAuthAdminRouter } from '../server/authAdmin.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const secret = process.env.SUPABASE_SECRET_KEY || '';
const publishable = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
assert.ok(url && secret && publishable, 'Local Supabase URL, secret and publishable key are required.');

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = randomUUID().slice(0, 8);
const password = `Pilot-${suffix}-QA!`;
const primaryOrganizationId = randomUUID();
const isolatedOrganizationId = randomUUID();
const primarySlug = `pilot-acceptance-${suffix}`;
const isolatedSlug = `pilot-isolated-${suffix}`;
const cityId = randomUUID();
const tourId = randomUUID();
const stopIds = [randomUUID(), randomUUID()];
let mediaId = '';
let mediaPath = '';
const createdUsers: string[] = [];

const clientFor = () => createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
const must = (error: { message: string } | null, context: string) => { if (error) throw new Error(`${context}: ${error.message}`); };
const signIn = async (email: string) => {
  const client = clientFor();
  const { error } = await client.auth.signInWithPassword({ email, password });
  must(error, `Sign in ${email}`);
  return client;
};
const createUser = async (role: string) => {
  const email = `stage4e-${role}-${suffix}@moreshetglobal.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { display_name: `Stage 4E ${role}`, username: `stage4e-${role}-${suffix}`, age_16_confirmed: true, preferred_language: 'en' },
  });
  must(error, `Create ${role}`);
  assert.ok(data.user);
  createdUsers.push(data.user.id);
  await admin.from('profiles').update({ password_reset_required: false }).eq('user_id', data.user.id);
  return { id: data.user.id, email };
};
const submit = async (client: SupabaseClient, kind: 'city' | 'tour' | 'stop', id: string, snapshot: Record<string, unknown>) => {
  const { data, error } = await client.rpc('submit_content_for_review', { p_content_kind: kind, p_content_id: id, p_snapshot: snapshot, p_source: 'human' });
  must(error, `Submit ${kind}`);
  assert.ok(data);
  return data as string;
};
const approveAndPublish = async (reviewer: SupabaseClient, reviewerId: string, revisionId: string) => {
  const { error: reviewError } = await reviewer.from('review_decisions').insert({ organization_id: primaryOrganizationId, revision_id: revisionId, decision: 'approved', notes: 'Stage 4E acceptance approval.', reviewer_user_id: reviewerId });
  must(reviewError, 'Approve revision');
  const { error: publishError } = await reviewer.rpc('publish_content_revision', { p_revision_id: revisionId });
  must(publishError, 'Publish revision');
};
const uploadThroughValidatedGateway = async (client: SupabaseClient, png: Buffer) => {
  const app = express();
  app.use('/api', createAuthAdminRouter());
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const { data } = await client.auth.getSession();
    assert.ok(data.session?.access_token);
    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/media`, {
      method: 'POST', body: png,
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        'Content-Type': 'image/png',
        'X-Organization-Id': primaryOrganizationId,
        'X-File-Name': 'stage4e-pilot.png',
        'X-Media-Rights-Status': 'own_work',
        'X-Media-Creator': encodeURIComponent('Moreshet QA'),
        'X-Media-Attribution': encodeURIComponent('Test image: Moreshet QA'),
        'X-Media-Rights-Notes': encodeURIComponent('Disposable one-pixel image generated solely for automated acceptance testing.'),
      },
    });
    const body = await response.json() as { mediaId?: string; error?: string };
    assert.equal(response.status, 201, body.error || 'Validated media upload must succeed.');
    assert.ok(body.mediaId);
    return body.mediaId;
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
};

let editor: SupabaseClient | null = null;
let reviewer: SupabaseClient | null = null;
try {
  const editorUser = await createUser('editor');
  const reviewerUser = await createUser('reviewer');

  must((await admin.from('organizations').insert([
    { id: primaryOrganizationId, name: 'Stage 4E Pilot Acceptance', slug: primarySlug, status: 'active', created_by: editorUser.id },
    { id: isolatedOrganizationId, name: 'Stage 4E Isolated Tenant', slug: isolatedSlug, status: 'active', created_by: reviewerUser.id },
  ])).error, 'Create isolated organizations');
  must((await admin.from('organization_memberships').insert([
    { organization_id: primaryOrganizationId, user_id: editorUser.id, role: 'editor', status: 'active', invited_by: editorUser.id, accepted_at: new Date().toISOString() },
    { organization_id: primaryOrganizationId, user_id: reviewerUser.id, role: 'reviewer', status: 'active', invited_by: editorUser.id, accepted_at: new Date().toISOString() },
    { organization_id: isolatedOrganizationId, user_id: reviewerUser.id, role: 'reviewer', status: 'active', invited_by: reviewerUser.id, accepted_at: new Date().toISOString() },
  ])).error, 'Create role memberships');

  editor = await signIn(editorUser.email);
  reviewer = await signIn(reviewerUser.email);

  must((await editor.from('cities').insert({ id: cityId, organization_id: primaryOrganizationId, slug: `acceptance-city-${suffix}`, country_name: 'Israel', country_code: 'IL', flag_emoji: '🇮🇱', center_latitude: 31.8969, center_longitude: 35.0104, created_by: editorUser.id, updated_by: editorUser.id })).error, 'Editor creates city');
  must((await editor.from('city_translations').insert({ organization_id: primaryOrganizationId, city_id: cityId, language: 'en', name: 'Acceptance City', subtitle: 'Disposable pilot destination', description: 'A disposable city created solely for Stage 4E acceptance.', created_by: editorUser.id, updated_by: editorUser.id })).error, 'Editor creates city translation');
  must((await editor.from('tours').insert({ id: tourId, organization_id: primaryOrganizationId, city_id: cityId, slug: `acceptance-tour-${suffix}`, estimated_duration_minutes: 30, distance_metres: 800, difficulty: 'easy', access_mode: 'free', created_by: editorUser.id, updated_by: editorUser.id })).error, 'Editor creates tour');
  must((await editor.from('tour_translations').insert({ organization_id: primaryOrganizationId, tour_id: tourId, language: 'en', title: 'Acceptance Heritage Tour', subtitle: 'Disposable end-to-end route', overview: 'A two-stop route used for automated pilot acceptance.', completion_message: 'Acceptance tour complete.', created_by: editorUser.id, updated_by: editorUser.id })).error, 'Editor creates tour translation');

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');
  const bypassUpload = await editor.storage.from('tour-media').upload(`${primaryOrganizationId}/forbidden.png`, png, { contentType: 'image/png', upsert: false });
  assert.ok(bypassUpload.error, 'Direct browser Storage upload must be denied.');
  mediaId = await uploadThroughValidatedGateway(editor, png);
  const { data: uploadedMedia, error: uploadedMediaError } = await admin.from('media_assets').select('object_path,rights_status,attribution_text').eq('id', mediaId).single();
  must(uploadedMediaError, 'Load validated media metadata');
  assert.equal(uploadedMedia.rights_status, 'own_work');
  assert.equal(uploadedMedia.attribution_text, 'Test image: Moreshet QA');
  mediaPath = uploadedMedia.object_path;

  for (const [index, stopId] of stopIds.entries()) {
    must((await editor.from('stops').insert({ id: stopId, organization_id: primaryOrganizationId, city_id: cityId, slug: `acceptance-stop-${index + 1}-${suffix}`, interest: index ? 'synagogue' : 'historic_sites', address: `Acceptance Street ${index + 1}`, latitude: 31.897 + index * 0.001, longitude: 35.0105 + index * 0.001, hero_media_id: index === 0 ? mediaId : null, audio_duration_seconds: 60, created_by: editorUser.id, updated_by: editorUser.id })).error, `Editor creates stop ${index + 1}`);
    must((await editor.from('stop_translations').insert({ organization_id: primaryOrganizationId, stop_id: stopId, language: 'en', title: `Acceptance Stop ${index + 1}`, short_description: `Short acceptance description ${index + 1}.`, narrative: `Full acceptance narrative ${index + 1}.`, audio_transcript: `Acceptance audio transcript ${index + 1}.`, created_by: editorUser.id, updated_by: editorUser.id })).error, `Editor creates stop translation ${index + 1}`);
    must((await editor.from('tour_stops').insert({ organization_id: primaryOrganizationId, tour_id: tourId, stop_id: stopId, position: index + 1, created_by: editorUser.id, updated_by: editorUser.id })).error, `Assign stop ${index + 1}`);
  }

  const crossTenantRead = await editor.from('cities').select('id').eq('organization_id', isolatedOrganizationId);
  must(crossTenantRead.error, 'Cross-tenant read query');
  assert.equal(crossTenantRead.data?.length, 0, 'Editor must not see another tenant content.');
  const crossTenantInsert = await editor.from('cities').insert({ organization_id: isolatedOrganizationId, slug: `forbidden-${suffix}`, country_name: 'Spain', country_code: 'ES', center_latitude: 40, center_longitude: -3, created_by: editorUser.id, updated_by: editorUser.id });
  assert.ok(crossTenantInsert.error, 'Editor cross-tenant insert must be rejected.');

  const revisions = [
    await submit(editor, 'city', cityId, { name: 'Acceptance City', country: 'Israel', flagEmoji: '🇮🇱', centerLat: 31.8969, centerLng: 35.0104, subtitle: 'Disposable pilot destination', description: 'A disposable city created solely for Stage 4E acceptance.' }),
    await submit(editor, 'tour', tourId, { cityId, title: 'Acceptance Heritage Tour', subtitle: 'Disposable end-to-end route', overview: 'A two-stop route used for automated pilot acceptance.', completionMessage: 'Acceptance tour complete.', estimatedDurationMinutes: 30, distanceMetres: 800, difficulty: 'easy', accessMode: 'free', wheelchairAccessible: false }),
    await submit(editor, 'stop', stopIds[0], { cityId, name: 'Acceptance Stop 1', category: 'historic_sites', address: 'Acceptance Street 1', lat: 31.897, lng: 35.0105, imageMediaId: mediaId, shortDescription: 'Short acceptance description 1.', fullDescription: 'Full acceptance narrative 1.', transcript: 'Acceptance audio transcript 1.', audioDuration: 60, tourId, tourOrder: 1 }),
    await submit(editor, 'stop', stopIds[1], { cityId, name: 'Acceptance Stop 2', category: 'synagogue', address: 'Acceptance Street 2', lat: 31.898, lng: 35.0115, shortDescription: 'Short acceptance description 2.', fullDescription: 'Full acceptance narrative 2.', transcript: 'Acceptance audio transcript 2.', audioDuration: 60, tourId, tourOrder: 2 }),
  ];

  const editorReviewAttempt = await editor.from('review_decisions').insert({ organization_id: primaryOrganizationId, revision_id: revisions[0], decision: 'approved', reviewer_user_id: editorUser.id });
  assert.ok(editorReviewAttempt.error, 'Editor must not approve a revision.');
  const reviewerEditAttempt = await reviewer.from('tour_translations').update({ title: 'Forbidden reviewer edit' }).eq('tour_id', tourId).eq('language', 'en');
  assert.ok(reviewerEditAttempt.error, 'Reviewer must not edit tour content.');

  must((await reviewer.from('media_assets').update({ validation_status: 'approved', validation_notes: 'Stage 4E approved image.', validated_by: reviewerUser.id, validated_at: new Date().toISOString() }).eq('id', mediaId)).error, 'Reviewer approves media');
  for (const revisionId of revisions) await approveAndPublish(reviewer, reviewerUser.id, revisionId);

  const publicPayload = await loadPublishedContent(admin, primarySlug, 'en');
  assert.ok(publicPayload);
  assert.equal(publicPayload.cities.length, 1);
  assert.equal(publicPayload.tours.length, 1);
  assert.equal(publicPayload.sites.length, 2);
  assert.deepEqual(publicPayload.sites.map((stop: any) => stop.name), ['Acceptance Stop 1', 'Acceptance Stop 2']);
  assert.match(publicPayload.sites[0].imageUrl, /^\/api\/public\/media\/[0-9a-f-]+\?organization=/);
  assert.equal(publicPayload.sites[0].imageCredit, 'Test image: Moreshet QA');
  const isolatedPayload = await loadPublishedContent(admin, isolatedSlug, 'en');
  assert.ok(isolatedPayload);
  assert.equal(isolatedPayload.cities.length, 0);
  assert.equal(isolatedPayload.tours.length, 0);
  assert.equal(isolatedPayload.sites.length, 0);

  console.log('Stage 4E pilot acceptance PASS: separate Editor/Reviewer roles, approved private media, 1 published tour, 2 ordered stops, and two-tenant isolation.');
} finally {
  await editor?.auth.signOut();
  await reviewer?.auth.signOut();
  await admin.storage.from('tour-media').remove([mediaPath]);
  const { error: closeError } = await admin.from('organizations').update({ status:'closed' }).in('id',[primaryOrganizationId,isolatedOrganizationId]);
  if (closeError) throw new Error(`Acceptance tenant closure failed: ${closeError.message}`);
  const anonymous = clientFor();
  const { data: closedPublicRows, error: closedPublicError } = await anonymous.from('cities').select('id').eq('organization_id',primaryOrganizationId);
  must(closedPublicError,'Closed-tenant anonymous isolation');
  assert.equal(closedPublicRows?.length,0,'Closed organizations must expose no formerly published rows to anonymous clients.');
  for (const userId of createdUsers.reverse()) {
    await admin.from('profiles').update({ status:'suspended' }).eq('user_id',userId);
    await admin.auth.admin.updateUserById(userId,{ ban_duration:'876000h' });
  }
  const { data: residue } = await admin.from('organizations').select('status').in('id',[primaryOrganizationId,isolatedOrganizationId]);
  assert.equal(residue?.filter((item)=>item.status==='closed').length,2,'Acceptance organizations must be closed after the test.');
}
