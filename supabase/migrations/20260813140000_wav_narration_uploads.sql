-- Tudela Global Stage 5 Checkpoint 14: accept validated WAV as well as MP3 narration.

update storage.buckets
set file_size_limit = 31457280,
    allowed_mime_types = array['audio/mpeg','audio/wav','audio/x-wav']
where id = 'narration-audio';

alter table public.narration_assets
  drop constraint narration_assets_mime_type_check,
  drop constraint narration_assets_byte_size_check;

alter table public.narration_assets
  add constraint narration_assets_mime_type_check
    check (mime_type in ('audio/mpeg','audio/wav')),
  add constraint narration_assets_byte_size_check
    check (byte_size > 0 and byte_size <= 31457280);

comment on column public.narration_assets.mime_type is 'Validated narration format: compressed MP3 or RIFF/WAVE audio.';
comment on column public.narration_assets.file_sha256 is 'SHA-256 of uploaded narration bytes for duplicate detection and integrity.';
