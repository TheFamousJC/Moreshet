-- Tudela Global Stage 5 Checkpoint 13: narration provenance for manual MP3 uploads.

alter table public.narration_assets
  add column source_type text not null default 'provider_generated'
    check (source_type in ('provider_generated','kokoro_tts','human_recording','other_tts')),
  add column original_filename text,
  add column file_sha256 text;

alter table public.narration_assets
  add constraint narration_assets_original_filename_length
    check (original_filename is null or char_length(original_filename) between 1 and 255),
  add constraint narration_assets_file_sha256_format
    check (file_sha256 is null or file_sha256 ~ '^[0-9a-f]{64}$');

comment on column public.narration_assets.source_type is 'Distinguishes provider-generated audio from Kokoro, human and other manually uploaded recordings.';
comment on column public.narration_assets.original_filename is 'Sanitized original filename retained for staff provenance and audit.';
comment on column public.narration_assets.file_sha256 is 'SHA-256 of uploaded MP3 bytes for duplicate detection and integrity.';
