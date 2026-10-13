-- Tudela Global Stage 4F: force CMS image writes through the server validation gateway.

update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id = 'tour-media';

drop policy if exists tour_media_writer_insert on storage.objects;
drop policy if exists tour_media_writer_update on storage.objects;

alter table public.media_assets
  add constraint media_assets_image_mime_check
  check (kind <> 'image' or mime_type in ('image/jpeg','image/png','image/webp','image/gif')) not valid;

alter table public.media_assets
  add constraint media_assets_pilot_size_check
  check (byte_size > 0 and byte_size <= 8388608) not valid;

alter table public.media_assets validate constraint media_assets_image_mime_check;
alter table public.media_assets validate constraint media_assets_pilot_size_check;

comment on table public.media_assets is
  'Private media metadata. CMS binary writes use the server validation gateway; Reviewer approval remains required before publication.';
