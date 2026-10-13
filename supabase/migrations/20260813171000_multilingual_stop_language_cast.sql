-- Correct the enum cast used while applying reviewed multilingual stop snapshots.

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
begin
  perform private.apply_content_snapshot_checkpoint15(p_kind, p_content_id, p_snapshot, p_actor);

  if p_kind <> 'stop' or jsonb_typeof(p_snapshot->'translations') <> 'object' then
    return;
  end if;

  perform set_config('app.applying_approved_revision', 'on', true);
  for v_language, v_translation in
    select key, value from jsonb_each(p_snapshot->'translations')
  loop
    if v_language not in ('en','he','ru','fr','de','es') then
      raise exception 'Unsupported stop translation language';
    end if;
    if jsonb_typeof(v_translation) <> 'object'
       or nullif(btrim(v_translation->>'title'),'') is null
       or nullif(btrim(v_translation->>'shortDescription'),'') is null
       or nullif(btrim(v_translation->>'fullDescription'),'') is null then
      raise exception 'Every submitted stop translation requires a title, short description and historical narrative';
    end if;

    insert into public.stop_translations (
      organization_id, stop_id, language, title, native_name, short_description,
      narrative, audio_transcript, status, created_by, updated_by
    ) values (
      v_org, p_content_id, v_language::public.supported_language, btrim(v_translation->>'title'),
      nullif(btrim(v_translation->>'nativeName'),''), btrim(v_translation->>'shortDescription'),
      btrim(v_translation->>'fullDescription'), nullif(btrim(v_translation->>'transcript'),''),
      'published', p_actor, p_actor
    )
    on conflict (organization_id, stop_id, language) do update set
      title = excluded.title,
      native_name = excluded.native_name,
      short_description = excluded.short_description,
      narrative = excluded.narrative,
      audio_transcript = excluded.audio_transcript,
      status = 'published',
      updated_by = p_actor;
  end loop;
  perform set_config('app.applying_approved_revision', 'off', true);
end;
$$;
