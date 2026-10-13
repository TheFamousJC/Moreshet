-- Tudela Global Stage 5 Checkpoint 20: server-enforced pronunciation listening audit.

create table public.pronunciation_review_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  revision_id uuid not null,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  language public.supported_language not null,
  phrase text not null,
  guide_entry jsonb not null,
  cache_key text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint pronunciation_review_revision_fk foreign key (organization_id, revision_id)
    references public.content_revisions(organization_id, id) on delete restrict,
  constraint pronunciation_review_phrase_valid check (char_length(btrim(phrase)) between 1 and 120),
  constraint pronunciation_review_guide_valid check (private.valid_pronunciation_guide(jsonb_build_array(guide_entry))),
  constraint pronunciation_review_cache_key_valid check (cache_key ~ '^[0-9a-f]{64}$'),
  constraint pronunciation_review_completion_order check (completed_at is null or completed_at >= started_at)
);

create index pronunciation_review_revision_reviewer_idx
  on public.pronunciation_review_events(revision_id, reviewer_user_id, completed_at);

alter table public.pronunciation_review_events enable row level security;
revoke all on public.pronunciation_review_events from public, anon, authenticated;
grant all on public.pronunciation_review_events to service_role;

create function private.protect_pronunciation_review_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Pronunciation review evidence is append-only' using errcode = '55000';
  end if;
  if new.organization_id is distinct from old.organization_id
     or new.revision_id is distinct from old.revision_id
     or new.reviewer_user_id is distinct from old.reviewer_user_id
     or new.language is distinct from old.language
     or new.phrase is distinct from old.phrase
     or new.guide_entry is distinct from old.guide_entry
     or new.cache_key is distinct from old.cache_key
     or new.started_at is distinct from old.started_at
     or old.completed_at is not null
     or new.completed_at is null then
    raise exception 'Only first completion may update pronunciation review evidence' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger pronunciation_review_events_protect
before update or delete on public.pronunciation_review_events
for each row execute function private.protect_pronunciation_review_event();

create function private.pronunciation_revision_requires_listening(p_revision_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(exists (
    select 1
    from public.content_revisions revision
    cross join lateral jsonb_each(coalesce(revision.snapshot->'translations', '{}'::jsonb)) proposed(language, translation)
    cross join lateral jsonb_array_elements(coalesce(proposed.translation->'pronunciations', '[]'::jsonb)) guide_entry
    left join public.stop_translations current_translation
      on current_translation.stop_id = revision.content_id
     and current_translation.language::text = proposed.language
    where revision.id = p_revision_id
      and revision.content_kind = 'stop'
      and coalesce(proposed.translation->'pronunciations', '[]'::jsonb)
          is distinct from coalesce(current_translation.pronunciation_guide, '[]'::jsonb)
  ), false);
$$;

create function private.pronunciation_revision_listening_complete(p_revision_id uuid, p_reviewer_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.content_revisions revision
    cross join lateral jsonb_each(coalesce(revision.snapshot->'translations', '{}'::jsonb)) proposed(language, translation)
    cross join lateral jsonb_array_elements(coalesce(proposed.translation->'pronunciations', '[]'::jsonb)) guide_entry
    left join public.stop_translations current_translation
      on current_translation.stop_id = revision.content_id
     and current_translation.language::text = proposed.language
    where revision.id = p_revision_id
      and revision.content_kind = 'stop'
      and coalesce(proposed.translation->'pronunciations', '[]'::jsonb)
          is distinct from coalesce(current_translation.pronunciation_guide, '[]'::jsonb)
      and not exists (
        select 1 from public.pronunciation_review_events event
        where event.revision_id = revision.id
          and event.reviewer_user_id = p_reviewer_user_id
          and event.language::text = proposed.language
          and event.phrase = guide_entry->>'phrase'
          and event.guide_entry = guide_entry
          and event.completed_at is not null
      )
  );
$$;

create or replace function private.apply_review_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision public.content_revisions%rowtype;
  v_target_status public.content_status;
begin
  select * into v_revision from public.content_revisions where id = new.revision_id;
  if not found or v_revision.organization_id <> new.organization_id then raise exception 'Revision does not belong to this organization' using errcode = '23503'; end if;
  if new.reviewer_user_id <> auth.uid() then raise exception 'Reviewer identity must match the signed-in user' using errcode = '42501'; end if;
  if not (private.is_super_admin() or private.has_org_role(new.organization_id, array['administrator'::public.organization_role, 'reviewer'::public.organization_role])) then raise exception 'Only Reviewers, Administrators or the Super Admin may record review decisions' using errcode = '42501'; end if;
  if v_revision.status <> 'pending_review' then raise exception 'Only pending revisions may be reviewed' using errcode = '55000'; end if;
  if new.decision = 'approved'
     and private.pronunciation_revision_requires_listening(new.revision_id)
     and not private.pronunciation_revision_listening_complete(new.revision_id, new.reviewer_user_id) then
    raise exception 'Listen to every changed pronunciation before approval' using errcode = '55000';
  end if;
  v_target_status := case when new.decision = 'approved' then 'approved'::public.content_status else 'changes_requested'::public.content_status end;
  update public.content_revisions set status=v_target_status,reviewed_by=new.reviewer_user_id,reviewed_at=new.decided_at where id=new.revision_id;
  if not v_revision.revises_published_content then perform private.set_content_status(v_revision.content_kind,v_revision.content_id,v_target_status); end if;
  return new;
end;
$$;

revoke all on function private.protect_pronunciation_review_event() from public, anon, authenticated;
revoke all on function private.pronunciation_revision_requires_listening(uuid) from public, anon, authenticated;
revoke all on function private.pronunciation_revision_listening_complete(uuid,uuid) from public, anon, authenticated;
grant execute on function private.pronunciation_revision_requires_listening(uuid) to service_role;
grant execute on function private.pronunciation_revision_listening_complete(uuid,uuid) to service_role;

comment on table public.pronunciation_review_events is
  'Private, append-only evidence that an authenticated reviewer heard the exact submitted pronunciation sample before approval.';
