-- Stage 6C: moderated personal heritage stories with explicit consent and up to three private photographs.

create type public.heritage_story_status as enum (
  'draft', 'pending_review', 'changes_requested', 'approved', 'rejected', 'withdrawn'
);

create type public.heritage_story_attribution as enum ('anonymous', 'display_name');

create table public.heritage_stories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  tour_id uuid not null,
  user_id uuid not null references auth.users (id) on delete restrict,
  original_language public.supported_language not null default 'en',
  title text not null default '',
  body text not null default '',
  attribution_mode public.heritage_story_attribution not null default 'anonymous',
  status public.heritage_story_status not null default 'draft',
  revision integer not null default 0,
  published_revision integer,
  consent_version text,
  consent_accepted_at timestamptz,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  review_notes text,
  withdrawn_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint heritage_stories_tour_fk foreign key (organization_id, tour_id)
    references public.tours (organization_id, id) on delete restrict,
  constraint heritage_story_title_length check (char_length(title) <= 120),
  constraint heritage_story_body_length check (char_length(body) <= 5000),
  constraint heritage_story_revision check (revision >= 0 and (published_revision is null or published_revision between 1 and revision)),
  constraint heritage_story_notes_length check (review_notes is null or char_length(review_notes) <= 2000),
  constraint heritage_story_review_pair check (
    (reviewed_by is null and reviewed_at is null)
    or (reviewed_by is not null and reviewed_at is not null)
  )
);

create index heritage_stories_owner_idx on public.heritage_stories (user_id, tour_id, updated_at desc);
create index heritage_stories_moderation_idx on public.heritage_stories (organization_id, status, submitted_at);
create index heritage_stories_public_idx on public.heritage_stories (tour_id, reviewed_at desc) where published_revision is not null;

create table public.heritage_story_revisions (
  story_id uuid not null references public.heritage_stories (id) on delete restrict,
  revision integer not null,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  title text not null,
  body text not null,
  original_language public.supported_language not null,
  attribution_mode public.heritage_story_attribution not null,
  consent_version text not null,
  consent_accepted_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  primary key (story_id, revision),
  constraint heritage_story_revision_title check (char_length(btrim(title)) between 3 and 120),
  constraint heritage_story_revision_body check (char_length(btrim(body)) between 20 and 5000),
  constraint heritage_story_revision_positive check (revision > 0)
);

create table public.heritage_story_media (
  story_id uuid not null,
  revision integer not null,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  position smallint not null,
  storage_bucket text not null default 'heritage-story-media',
  object_path text not null,
  caption text,
  created_at timestamptz not null default now(),
  primary key (story_id, revision, position),
  constraint heritage_story_media_revision_fk foreign key (story_id, revision)
    references public.heritage_story_revisions (story_id, revision) on delete restrict,
  constraint heritage_story_media_position check (position between 1 and 3),
  constraint heritage_story_media_bucket check (storage_bucket = 'heritage-story-media'),
  constraint heritage_story_media_caption check (caption is null or char_length(caption) <= 240),
  constraint heritage_story_media_path_unique unique (storage_bucket, object_path)
);

create table public.heritage_story_moderation_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  story_id uuid not null references public.heritage_stories (id) on delete restrict,
  revision integer not null,
  decision public.heritage_story_status not null,
  moderator_user_id uuid not null references auth.users (id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  constraint heritage_story_event_decision check (decision in ('changes_requested', 'approved', 'rejected')),
  constraint heritage_story_event_revision check (revision > 0),
  constraint heritage_story_event_notes check (notes is null or char_length(notes) <= 2000)
);

create trigger heritage_stories_set_updated_at before update on public.heritage_stories
for each row execute function private.set_updated_at();
create trigger heritage_story_revisions_append_only before update or delete on public.heritage_story_revisions
for each row execute function private.prevent_append_only_mutation();
create trigger heritage_story_media_append_only before update or delete on public.heritage_story_media
for each row execute function private.prevent_append_only_mutation();
create trigger heritage_story_events_append_only before update or delete on public.heritage_story_moderation_events
for each row execute function private.prevent_append_only_mutation();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('heritage-story-media', 'heritage-story-media', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create or replace function private.story_path_part(p_name text, p_position integer)
returns text language sql immutable set search_path = ''
as $$ select split_part(p_name, '/', p_position) $$;

create or replace function private.story_path_uuid(p_name text, p_position integer)
returns uuid language plpgsql immutable set search_path = ''
as $$
declare v_part text := split_part(p_name, '/', p_position);
begin
  if v_part ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return v_part::uuid; end if;
  return null;
end;
$$;

create or replace function private.is_published_story_media(p_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.heritage_story_media m
    join public.heritage_stories s on s.id=m.story_id
    where m.object_path=p_name and m.revision=s.published_revision
      and s.withdrawn_at is null and s.removed_at is null
      and not private.is_community_banned(s.organization_id,s.user_id)
  )
$$;

create or replace function public.save_heritage_story_draft(
  p_tour_id uuid, p_title text, p_body text, p_language text default 'en',
  p_attribution text default 'anonymous', p_story_id uuid default null
)
returns public.heritage_stories language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid;
  v_story public.heritage_stories;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not exists (select 1 from public.profiles p where p.user_id=v_actor and p.status='active' and p.email_verified_at is not null and p.age_eligibility_confirmed_at is not null) then
    raise exception 'A verified age-eligible account is required' using errcode='42501';
  end if;
  select t.organization_id into v_org from public.tours t join public.organizations o on o.id=t.organization_id
  where t.id=p_tour_id and t.status='published' and o.status in ('active','trial');
  if v_org is null then raise exception 'Published tour not found'; end if;
  if private.is_community_banned(v_org, v_actor) then raise exception 'Community submissions are currently restricted'; end if;
  if char_length(v_title) > 120 or char_length(v_body) > 5000 then raise exception 'Story title or text is too long'; end if;
  if p_language not in ('en','he','ru','fr','de','es') then raise exception 'Unsupported story language'; end if;
  if p_attribution not in ('anonymous','display_name') then raise exception 'Unsupported attribution choice'; end if;

  if p_story_id is null then
    insert into public.heritage_stories (organization_id,tour_id,user_id,original_language,title,body,attribution_mode)
    values (v_org,p_tour_id,v_actor,p_language::public.supported_language,v_title,v_body,p_attribution::public.heritage_story_attribution)
    returning * into v_story;
  else
    update public.heritage_stories set title=v_title, body=v_body, original_language=p_language::public.supported_language,
      attribution_mode=p_attribution::public.heritage_story_attribution, status='draft', reviewed_by=null, reviewed_at=null,
      review_notes=null, withdrawn_at=null
    where id=p_story_id and user_id=v_actor and tour_id=p_tour_id
    returning * into v_story;
    if not found then raise exception 'Story not found or not owned by this account' using errcode='42501'; end if;
  end if;
  return v_story;
end;
$$;

create or replace function public.submit_heritage_story(
  p_story_id uuid, p_object_paths text[] default array[]::text[], p_consent boolean default false,
  p_consent_version text default 'heritage-story-publication-v1'
)
returns public.heritage_stories language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_story public.heritage_stories;
  v_revision integer;
  v_path text;
  v_position integer := 0;
begin
  select * into v_story from public.heritage_stories where id=p_story_id and user_id=v_actor for update;
  if not found then raise exception 'Story not found or not owned by this account' using errcode='42501'; end if;
  if private.is_community_banned(v_story.organization_id, v_actor) then raise exception 'Community submissions are currently restricted'; end if;
  if not p_consent then raise exception 'Publication consent is required'; end if;
  if char_length(btrim(v_story.title)) not between 3 and 120 then raise exception 'Enter a story title of at least 3 characters'; end if;
  if char_length(btrim(v_story.body)) not between 20 and 5000 then raise exception 'Enter a story of at least 20 characters'; end if;
  if coalesce(array_length(p_object_paths,1),0) > 3 then raise exception 'A story can contain no more than three photographs'; end if;
  if char_length(btrim(coalesce(p_consent_version,''))) not between 3 and 100 then raise exception 'A valid consent version is required'; end if;

  foreach v_path in array coalesce(p_object_paths,array[]::text[]) loop
    if private.story_path_uuid(v_path,1) <> v_story.organization_id
      or private.story_path_uuid(v_path,2) <> v_actor
      or private.story_path_uuid(v_path,3) <> v_story.id
      or not exists (select 1 from storage.objects so where so.bucket_id='heritage-story-media' and so.name=v_path and so.owner_id=v_actor::text)
    then raise exception 'A photograph does not belong to this story' using errcode='42501'; end if;
  end loop;

  v_revision := v_story.revision + 1;
  insert into public.heritage_story_revisions (story_id,revision,organization_id,title,body,original_language,attribution_mode,consent_version,consent_accepted_at)
  values (v_story.id,v_revision,v_story.organization_id,btrim(v_story.title),btrim(v_story.body),v_story.original_language,v_story.attribution_mode,btrim(p_consent_version),now());
  foreach v_path in array coalesce(p_object_paths,array[]::text[]) loop
    v_position := v_position + 1;
    insert into public.heritage_story_media (story_id,revision,organization_id,position,object_path)
    values (v_story.id,v_revision,v_story.organization_id,v_position,v_path);
  end loop;
  update public.heritage_stories set revision=v_revision,status='pending_review',consent_version=btrim(p_consent_version),
    consent_accepted_at=now(),submitted_at=now(),reviewed_by=null,reviewed_at=null,review_notes=null,withdrawn_at=null,removed_at=null
  where id=v_story.id returning * into v_story;
  return v_story;
end;
$$;

create or replace function public.moderate_heritage_story(p_story_id uuid, p_decision text, p_notes text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid(); v_story public.heritage_stories; v_role text;
begin
  select * into v_story from public.heritage_stories where id=p_story_id for update;
  if not found then raise exception 'Story not found'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_story.organization_id,array['administrator'::public.organization_role,'reviewer'::public.organization_role],v_actor)) then
    raise exception 'Reviewer access is required' using errcode='42501'; end if;
  if p_decision not in ('approved','changes_requested','rejected') then raise exception 'Unsupported story decision'; end if;
  if v_story.status not in ('pending_review','approved') then raise exception 'This story is not reviewable'; end if;
  if (p_decision='changes_requested' or (v_story.status='approved' and p_decision='rejected')) and nullif(btrim(p_notes),'') is null then
    raise exception 'Moderation notes are required'; end if;

  update public.heritage_stories set status=p_decision::public.heritage_story_status,reviewed_by=v_actor,reviewed_at=now(),review_notes=nullif(btrim(p_notes),''),
    published_revision=case when p_decision='approved' then revision else published_revision end,
    removed_at=case when v_story.status='approved' and p_decision='rejected' then now() else removed_at end
  where id=p_story_id;
  insert into public.heritage_story_moderation_events (organization_id,story_id,revision,decision,moderator_user_id,notes)
  values (v_story.organization_id,v_story.id,v_story.revision,p_decision::public.heritage_story_status,v_actor,nullif(btrim(p_notes),''));
  if private.is_super_admin(v_actor) then v_role:='super_admin'; elsif private.has_org_role(v_story.organization_id,array['administrator'::public.organization_role],v_actor) then v_role:='administrator'; else v_role:='reviewer'; end if;
  insert into public.audit_log (organization_id,actor_user_id,actor_role,action,entity_type,entity_id,after_summary)
  values (v_story.organization_id,v_actor,v_role,'heritage_story_'||p_decision,'heritage_story',v_story.id,jsonb_build_object('revision',v_story.revision,'decision',p_decision));
end;
$$;

create or replace function public.withdraw_heritage_story(p_story_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.heritage_stories set status='withdrawn',withdrawn_at=now(),reviewed_by=null,reviewed_at=null,review_notes=null
  where id=p_story_id and user_id=auth.uid();
  if not found then raise exception 'Story not found'; end if;
end;
$$;

create or replace function public.get_public_heritage_stories(p_tour_id uuid, p_limit integer default 20, p_offset integer default 0)
returns table (story_id uuid, title text, story_text text, original_language public.supported_language, attribution text, published_at timestamptz, media_paths text[])
language sql stable security definer set search_path = ''
as $$
  select s.id,r.title,r.body,r.original_language,
    case when r.attribution_mode='display_name' then coalesce(nullif(btrim(p.display_name),''),'Community contributor') else 'Anonymous contributor' end,
    s.reviewed_at,
    coalesce(array_agg(m.object_path order by m.position) filter (where m.object_path is not null),array[]::text[])
  from public.heritage_stories s
  join public.heritage_story_revisions r on r.story_id=s.id and r.revision=s.published_revision
  join public.tours t on t.id=s.tour_id and t.organization_id=s.organization_id
  join public.organizations o on o.id=s.organization_id
  join public.profiles p on p.user_id=s.user_id
  left join public.heritage_story_media m on m.story_id=s.id and m.revision=s.published_revision
  where s.tour_id=p_tour_id and s.published_revision is not null and s.withdrawn_at is null and s.removed_at is null
    and t.status='published' and o.status in ('active','trial') and not private.is_community_banned(s.organization_id,s.user_id)
  group by s.id,r.title,r.body,r.original_language,r.attribution_mode,p.display_name,s.reviewed_at
  order by s.reviewed_at desc,s.id
  limit least(greatest(coalesce(p_limit,20),1),50) offset greatest(coalesce(p_offset,0),0);
$$;

alter table public.heritage_stories enable row level security;
alter table public.heritage_story_revisions enable row level security;
alter table public.heritage_story_media enable row level security;
alter table public.heritage_story_moderation_events enable row level security;

create policy heritage_stories_owner_or_moderator_select on public.heritage_stories for select to authenticated using (
  user_id=(select auth.uid()) or (select private.is_super_admin()) or (select private.has_org_role(organization_id,array['administrator'::public.organization_role,'reviewer'::public.organization_role]))
);
create policy heritage_revisions_owner_or_moderator_select on public.heritage_story_revisions for select to authenticated using (
  exists (select 1 from public.heritage_stories s where s.id=heritage_story_revisions.story_id and (s.user_id=(select auth.uid()) or (select private.is_super_admin()) or (select private.has_org_role(s.organization_id,array['administrator'::public.organization_role,'reviewer'::public.organization_role]))))
);
create policy heritage_media_owner_or_moderator_select on public.heritage_story_media for select to authenticated using (
  exists (select 1 from public.heritage_stories s where s.id=heritage_story_media.story_id and (s.user_id=(select auth.uid()) or (select private.is_super_admin()) or (select private.has_org_role(s.organization_id,array['administrator'::public.organization_role,'reviewer'::public.organization_role]))))
);
create policy heritage_events_moderator_select on public.heritage_story_moderation_events for select to authenticated using (
  (select private.is_super_admin()) or (select private.has_org_role(organization_id,array['administrator'::public.organization_role,'reviewer'::public.organization_role]))
);

create policy heritage_storage_owner_insert on storage.objects for insert to authenticated with check (
  bucket_id='heritage-story-media' and private.story_path_uuid(name,2)=(select auth.uid())
  and exists (select 1 from public.heritage_stories s where s.id=private.story_path_uuid(name,3) and s.organization_id=private.story_path_uuid(name,1) and s.user_id=(select auth.uid()))
);
create policy heritage_storage_owner_or_moderator_select on storage.objects for select to authenticated using (
  bucket_id='heritage-story-media' and (
    private.story_path_uuid(name,2)=(select auth.uid()) or (select private.is_super_admin())
    or exists (select 1 from public.heritage_stories s where s.id=private.story_path_uuid(name,3) and (select private.has_org_role(s.organization_id,array['administrator'::public.organization_role,'reviewer'::public.organization_role])))
    or private.is_published_story_media(name)
  )
);
create policy heritage_storage_public_published_select on storage.objects for select to anon using (
  bucket_id='heritage-story-media' and private.is_published_story_media(name)
);

revoke all on public.heritage_stories,public.heritage_story_revisions,public.heritage_story_media,public.heritage_story_moderation_events from anon,authenticated;
grant select on public.heritage_stories,public.heritage_story_revisions,public.heritage_story_media,public.heritage_story_moderation_events to authenticated;
revoke all on function public.save_heritage_story_draft(uuid,text,text,text,text,uuid) from public,anon;
revoke all on function public.submit_heritage_story(uuid,text[],boolean,text) from public,anon;
revoke all on function public.moderate_heritage_story(uuid,text,text) from public,anon;
revoke all on function public.withdraw_heritage_story(uuid) from public,anon;
grant execute on function public.save_heritage_story_draft(uuid,text,text,text,text,uuid) to authenticated;
grant execute on function public.submit_heritage_story(uuid,text[],boolean,text) to authenticated;
grant execute on function public.moderate_heritage_story(uuid,text,text) to authenticated;
grant execute on function public.withdraw_heritage_story(uuid) to authenticated;
grant execute on function public.get_public_heritage_stories(uuid,integer,integer) to anon,authenticated;
grant execute on function private.is_published_story_media(text) to anon,authenticated,service_role;

comment on table public.heritage_stories is 'Moderated personal heritage stories; published_revision keeps the previous approved version live during edits.';
comment on function public.get_public_heritage_stories(uuid,integer,integer) is 'Returns only approved story content, safe attribution and private media paths without account identity.';
