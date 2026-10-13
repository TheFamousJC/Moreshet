import { supabase } from './supabase';

export interface TourCompletionResult {
  completedStops: number;
  totalStops: number;
  tourComplete: boolean;
}

export interface TourRating {
  id: string;
  organizationId: string;
  tourId: string;
  userId: string;
  rating: number;
  status: 'pending_review' | 'changes_requested' | 'approved' | 'rejected' | 'withdrawn';
  revision: number;
  submittedAt: string;
  reviewNotes?: string;
}

export interface TourComment {
  id: string;
  organizationId: string;
  tourId: string;
  stopId?: string;
  userId: string;
  body: string;
  status: 'pending_review' | 'changes_requested' | 'approved' | 'rejected' | 'withdrawn';
  revision: number;
  submittedAt: string;
  reviewNotes?: string;
}

export interface PublicTourComment {
  id: string;
  body: string;
  publishedAt: string;
}

export interface CommunityUserBan {
  id: string;
  organizationId: string;
  userId: string;
  reason: string;
  bannedBy: string;
  startsAt: string;
  expiresAt?: string;
  liftedAt?: string;
  liftedBy?: string;
  liftReason?: string;
}

export interface TourLikeSummary {
  count: number;
  liked: boolean;
}

export type HeritageStoryStatus = 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'rejected' | 'withdrawn';

export interface HeritageStory {
  id: string;
  organizationId: string;
  tourId: string;
  userId: string;
  originalLanguage: 'en' | 'he' | 'ru' | 'fr' | 'de' | 'es';
  title: string;
  body: string;
  attributionMode: 'anonymous' | 'display_name';
  status: HeritageStoryStatus;
  revision: number;
  publishedRevision?: number;
  submittedAt?: string;
  reviewNotes?: string;
  ownerArchivedAt?: string;
  mediaPaths: string[];
  mediaUrls: string[];
}

export interface PublicHeritageStory {
  id: string;
  title: string;
  body: string;
  originalLanguage: HeritageStory['originalLanguage'];
  attribution: string;
  publishedAt: string;
  mediaUrls: string[];
}

const mapStory = (row: any): HeritageStory => ({
  id: row.id,
  organizationId: row.organization_id,
  tourId: row.tour_id,
  userId: row.user_id,
  originalLanguage: row.original_language,
  title: row.title,
  body: row.body,
  attributionMode: row.attribution_mode,
  status: row.status,
  revision: row.revision,
  publishedRevision: row.published_revision || undefined,
  submittedAt: row.submitted_at || undefined,
  reviewNotes: row.review_notes || undefined,
  ownerArchivedAt: row.owner_archived_at || undefined,
  mediaPaths: [],
  mediaUrls: [],
});

async function signedStoryUrls(paths: string[]): Promise<string[]> {
  const signed = await Promise.all(paths.map(async (path) => {
    const { data } = await supabase.storage.from('heritage-story-media').createSignedUrl(path, 3600);
    return data?.signedUrl || '';
  }));
  return signed.filter(Boolean);
}

const mapComment = (row: any): TourComment => ({
  id: row.id,
  organizationId: row.organization_id,
  tourId: row.tour_id,
  stopId: row.stop_id || undefined,
  userId: row.user_id,
  body: row.body,
  status: row.status,
  revision: row.revision,
  submittedAt: row.submitted_at,
  reviewNotes: row.review_notes || undefined,
});

export async function markTourStopCompleted(tourId: string, stopId: string): Promise<TourCompletionResult> {
  const { data, error } = await supabase.rpc('mark_tour_stop_completed', {
    p_tour_id: tourId,
    p_stop_id: stopId,
    p_method: 'audio_completed',
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Tour completion could not be confirmed.');
  return {
    completedStops: Number(row.completed_stops),
    totalStops: Number(row.total_stops),
    tourComplete: Boolean(row.tour_complete),
  };
}

export async function loadMyTourRating(tourId: string): Promise<TourRating | null> {
  const { data, error } = await supabase.from('tour_ratings')
    .select('id,organization_id,tour_id,user_id,rating,status,revision,submitted_at,review_notes')
    .eq('tour_id', tourId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    organizationId: data.organization_id,
    tourId: data.tour_id,
    userId: data.user_id,
    rating: data.rating,
    status: data.status,
    revision: data.revision,
    submittedAt: data.submitted_at,
    reviewNotes: data.review_notes || undefined,
  };
}

export async function submitTourRating(tourId: string, rating: number): Promise<TourRating> {
  const { data, error } = await supabase.rpc('submit_tour_rating', { p_tour_id: tourId, p_rating: rating });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('The rating could not be saved.');
  return {
    id: row.id,
    organizationId: row.organization_id,
    tourId: row.tour_id,
    userId: row.user_id,
    rating: row.rating,
    status: row.status,
    revision: row.revision,
    submittedAt: row.submitted_at,
    reviewNotes: row.review_notes || undefined,
  };
}

export async function withdrawTourRating(tourId: string): Promise<void> {
  const { error } = await supabase.rpc('withdraw_tour_rating', { p_tour_id: tourId });
  if (error) throw error;
}

export async function getTourRatingSummary(tourId: string): Promise<{ average: number | null; count: number }> {
  const { data, error } = await supabase.rpc('get_tour_rating_summary', { p_tour_id: tourId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { average: row?.rating_average == null ? null : Number(row.rating_average), count: Number(row?.rating_count || 0) };
}

export async function moderateTourRating(ratingId: string, decision: 'approved' | 'changes_requested' | 'rejected', notes?: string): Promise<void> {
  const { error } = await supabase.rpc('moderate_tour_rating', { p_rating_id: ratingId, p_decision: decision, p_notes: notes || null });
  if (error) throw error;
}

export async function loadMyTourComment(tourId: string): Promise<TourComment | null> {
  const { data, error } = await supabase.from('tour_comments')
    .select('id,organization_id,tour_id,user_id,body,status,revision,submitted_at,review_notes')
    .eq('tour_id', tourId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapComment(data) : null;
}

export async function submitTourComment(tourId: string, body: string): Promise<TourComment> {
  const { data, error } = await supabase.rpc('submit_tour_comment', { p_tour_id: tourId, p_body: body });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('The comment could not be saved.');
  return mapComment(row);
}

export async function withdrawTourComment(tourId: string): Promise<void> {
  const { error } = await supabase.rpc('withdraw_tour_comment', { p_tour_id: tourId });
  if (error) throw error;
}

export async function getPublicTourComments(tourId: string, limit = 20): Promise<PublicTourComment[]> {
  const { data, error } = await supabase.rpc('get_public_tour_comments', { p_tour_id: tourId, p_limit: limit, p_offset: 0 });
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.comment_id, body: row.comment_text, publishedAt: row.published_at }));
}

export async function loadMyStopComment(tourId: string, stopId: string): Promise<TourComment | null> {
  const { data, error } = await supabase.from('tour_comments')
    .select('id,organization_id,tour_id,stop_id,user_id,body,status,revision,submitted_at,review_notes')
    .eq('tour_id', tourId).eq('stop_id', stopId).maybeSingle();
  if (error) throw error;
  return data ? mapComment(data) : null;
}

export async function submitStopComment(tourId: string, stopId: string, body: string): Promise<TourComment> {
  const { data, error } = await supabase.rpc('submit_stop_comment', { p_tour_id: tourId, p_stop_id: stopId, p_body: body });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('The comment could not be saved.');
  return mapComment(row);
}

export async function withdrawStopComment(tourId: string, stopId: string): Promise<void> {
  const { error } = await supabase.rpc('withdraw_stop_comment', { p_tour_id: tourId, p_stop_id: stopId });
  if (error) throw error;
}

export async function getPublicStopComments(tourId: string, stopId: string, limit = 20): Promise<PublicTourComment[]> {
  const { data, error } = await supabase.rpc('get_public_stop_comments', { p_tour_id: tourId, p_stop_id: stopId, p_limit: limit, p_offset: 0 });
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.comment_id, body: row.comment_text, publishedAt: row.published_at }));
}

export async function moderateTourComment(commentId: string, decision: 'approved' | 'changes_requested' | 'rejected', notes?: string): Promise<void> {
  const { error } = await supabase.rpc('moderate_tour_comment', { p_comment_id: commentId, p_decision: decision, p_notes: notes || null });
  if (error) throw error;
}

export async function banCommunityUser(organizationId: string, userId: string, reason: string, durationDays?: number): Promise<string> {
  const { data, error } = await supabase.rpc('ban_community_user', {
    p_organization_id: organizationId,
    p_user_id: userId,
    p_reason: reason,
    p_duration_days: durationDays || null,
  });
  if (error) throw error;
  if (!data) throw new Error('The community restriction could not be created.');
  return String(data);
}

export async function liftCommunityUserBan(banId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('lift_community_user_ban', { p_ban_id: banId, p_reason: reason });
  if (error) throw error;
}

export async function getTourLikeSummary(tourId: string): Promise<TourLikeSummary> {
  const { data, error } = await supabase.rpc('get_tour_like_summary', { p_tour_id: tourId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { count: Number(row?.like_count || 0), liked: Boolean(row?.viewer_liked) };
}

export async function setTourLike(tourId: string, liked: boolean): Promise<TourLikeSummary> {
  const { data, error } = await supabase.rpc('set_tour_like', { p_tour_id: tourId, p_liked: liked });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('The tour like could not be updated.');
  return { count: Number(row.like_count || 0), liked: Boolean(row.liked) };
}

export async function getPublicHeritageStories(tourId: string): Promise<PublicHeritageStory[]> {
  const { data, error } = await supabase.rpc('get_public_heritage_stories', { p_tour_id: tourId, p_limit: 20, p_offset: 0 });
  if (error) throw error;
  return Promise.all((data || []).map(async (row: any) => ({
    id: row.story_id,
    title: row.title,
    body: row.story_text,
    originalLanguage: row.original_language,
    attribution: row.attribution,
    publishedAt: row.published_at,
    mediaUrls: await signedStoryUrls(row.media_paths || []),
  })));
}

export async function loadMyHeritageStories(tourId: string): Promise<HeritageStory[]> {
  const { data, error } = await supabase.from('heritage_stories')
    .select('id,organization_id,tour_id,user_id,original_language,title,body,attribution_mode,status,revision,published_revision,submitted_at,review_notes,owner_archived_at')
    .eq('tour_id', tourId).order('updated_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data || []).map(async (row: any) => {
    const story = mapStory(row);
    if (!story.revision) return story;
    const { data: media, error: mediaError } = await supabase.from('heritage_story_media')
      .select('object_path').eq('story_id', story.id).eq('revision', story.revision).order('position');
    if (mediaError) throw mediaError;
    story.mediaPaths = (media || []).map((item: any) => item.object_path);
    story.mediaUrls = await signedStoryUrls(story.mediaPaths);
    return story;
  }));
}

export async function saveHeritageStoryDraft(input: {
  tourId: string; title: string; body: string; language: HeritageStory['originalLanguage'];
  attributionMode: HeritageStory['attributionMode']; storyId?: string;
}): Promise<HeritageStory> {
  const { data, error } = await supabase.rpc('save_heritage_story_draft', {
    p_tour_id: input.tourId, p_title: input.title, p_body: input.body,
    p_language: input.language, p_attribution: input.attributionMode, p_story_id: input.storyId || null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('The story draft could not be saved.');
  return mapStory(row);
}

export async function uploadHeritageStoryPhotos(story: HeritageStory, files: File[]): Promise<string[]> {
  if (files.length > 3) throw new Error('Choose no more than three photographs.');
  const allowed = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);
  const paths: string[] = [];
  for (const file of files) {
    const extension = allowed.get(file.type);
    if (!extension) throw new Error('Story photographs must be JPEG, PNG or WebP.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Each story photograph must be 8 MB or smaller.');
    const path = `${story.organizationId}/${story.userId}/${story.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('heritage-story-media').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

export async function submitHeritageStory(storyId: string, mediaPaths: string[]): Promise<HeritageStory> {
  const { data, error } = await supabase.rpc('submit_heritage_story', {
    p_story_id: storyId, p_object_paths: mediaPaths, p_consent: true,
    p_consent_version: 'heritage-story-publication-v1',
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('The story could not be submitted.');
  return mapStory(row);
}

export async function withdrawHeritageStory(storyId: string): Promise<void> {
  const { error } = await supabase.rpc('withdraw_heritage_story', { p_story_id: storyId });
  if (error) throw error;
}

export async function setHeritageStoryArchived(storyId: string, archived: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_heritage_story_owner_archived', { p_story_id: storyId, p_archived: archived });
  if (error) throw error;
}

export async function moderateHeritageStory(storyId: string, decision: 'approved' | 'changes_requested' | 'rejected', notes?: string): Promise<void> {
  const { error } = await supabase.rpc('moderate_heritage_story', { p_story_id: storyId, p_decision: decision, p_notes: notes || null });
  if (error) throw error;
}
