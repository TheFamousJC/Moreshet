-- Tudela Global Stage 5 Checkpoint 17: versioned, provider-aware pronunciation guidance.

create function private.valid_pronunciation_guide(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_value) = 'array'
    and jsonb_array_length(p_value) <= 30
    and not exists (
      select 1 from jsonb_array_elements(p_value) item
      where jsonb_typeof(item) <> 'object'
        or char_length(btrim(coalesce(item->>'phrase',''))) not between 1 and 120
        or coalesce(item->>'encoding','') not in ('ipa','x_sampa','spoken_hint')
        or char_length(btrim(coalesce(item->>'pronunciation',''))) not between 1 and 240
        or char_length(coalesce(item->>'reviewerNote','')) > 500
    );
$$;

create function private.valid_pronunciation_guide_for_transcript(p_value jsonb, p_transcript text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select private.valid_pronunciation_guide(p_value)
    and not exists (
      select 1
      from jsonb_array_elements(p_value) item
      where position(lower(btrim(item->>'phrase')) in lower(coalesce(p_transcript,''))) = 0
    )
    and not exists (
      select 1
      from jsonb_array_elements(p_value) item
      group by lower(btrim(item->>'phrase'))
      having count(*) > 1
    );
$$;

alter table public.stop_translations
  add column pronunciation_guide jsonb not null default '[]'::jsonb,
  add constraint stop_translations_pronunciation_guide_valid
    check (private.valid_pronunciation_guide_for_transcript(pronunciation_guide, audio_transcript));

alter table public.narration_assets
  add column pronunciation_guide jsonb not null default '[]'::jsonb,
  add constraint narration_assets_pronunciation_guide_valid
    check (private.valid_pronunciation_guide(pronunciation_guide));

comment on column public.stop_translations.pronunciation_guide is
  'Language-specific IPA, X-SAMPA or reviewer-only spoken hints stored separately from the approved transcript.';
comment on column public.narration_assets.pronunciation_guide is
  'Immutable-by-version pronunciation guidance bound into the narration cache key and shown during review.';

create or replace function private.apply_content_snapshot(
  p_kind public.content_kind,
  p_content_id uuid,
  p_snapshot jsonb,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := private.content_organization_id(p_kind, p_content_id);
  v_language text;
  v_translation jsonb;
  v_guide jsonb;
begin
  perform private.apply_content_snapshot_checkpoint15(p_kind, p_content_id, p_snapshot, p_actor);

  if p_kind <> 'stop' or jsonb_typeof(p_snapshot->'translations') <> 'object' then
    return;
  end if;

  perform set_config('app.applying_approved_revision', 'on', true);
  for v_language, v_translation in
    select key, value from jsonb_each(p_snapshot->'translations')
  loop
    if v_language not in ('en','he','ru','fr','de','es') then raise exception 'Unsupported stop translation language'; end if;
    if jsonb_typeof(v_translation) <> 'object'
       or nullif(btrim(v_translation->>'title'),'') is null
       or nullif(btrim(v_translation->>'shortDescription'),'') is null
       or nullif(btrim(v_translation->>'fullDescription'),'') is null then
      raise exception 'Every submitted stop translation requires a title, short description and historical narrative';
    end if;
    v_guide := coalesce(v_translation->'pronunciations','[]'::jsonb);
    if not private.valid_pronunciation_guide(v_guide) then raise exception 'Invalid pronunciation guidance'; end if;

    insert into public.stop_translations (
      organization_id, stop_id, language, title, native_name, short_description,
      narrative, audio_transcript, pronunciation_guide, status, created_by, updated_by
    ) values (
      v_org, p_content_id, v_language::public.supported_language, btrim(v_translation->>'title'),
      nullif(btrim(v_translation->>'nativeName'),''), btrim(v_translation->>'shortDescription'),
      btrim(v_translation->>'fullDescription'), nullif(btrim(v_translation->>'transcript'),''),
      v_guide, 'published', p_actor, p_actor
    )
    on conflict (organization_id, stop_id, language) do update set
      title=excluded.title,native_name=excluded.native_name,short_description=excluded.short_description,
      narrative=excluded.narrative,audio_transcript=excluded.audio_transcript,
      pronunciation_guide=excluded.pronunciation_guide,status='published',updated_by=p_actor;
  end loop;
  perform set_config('app.applying_approved_revision', 'off', true);
end;
$$;

grant execute on function private.valid_pronunciation_guide(jsonb) to service_role;
grant execute on function private.valid_pronunciation_guide_for_transcript(jsonb,text) to service_role;
