-- Stage 6A: privacy-preserving tour completion evidence and moderated ratings.

create type public.community_review_status as enum (
  'pending_review',
  'changes_requested',
  'approved',
  'rejected',
  'withdrawn'
);

create table public.tour_stop_completions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  tour_id uuid not null,
  stop_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  completion_method text not null default 'audio_completed',
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint tour_stop_completions_tour_fk foreign key (organization_id, tour_id)
    references public.tours (organization_id, id) on delete restrict,
  constraint tour_stop_completions_stop_fk foreign key (organization_id, stop_id)
    references public.stops (organization_id, id) on delete restrict,
  constraint tour_stop_completions_one_per_user unique (tour_id, stop_id, user_id),
  constraint tour_stop_completions_method check (completion_method in ('audio_completed', 'gps_arrival'))
);

create index tour_stop_completions_user_tour_idx
  on public.tour_stop_completions (user_id, tour_id, completed_at desc);
create index tour_stop_completions_aggregate_idx
  on public.tour_stop_completions (organization_id, tour_id, completed_at desc);

create table public.tour_ratings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  tour_id uuid not null,
  user_id uuid not null references auth.users (id) on delete restrict,
  rating smallint not null,
  status public.community_review_status not null default 'pending_review',
  revision integer not null default 1,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tour_ratings_tour_fk foreign key (organization_id, tour_id)
    references public.tours (organization_id, id) on delete restrict,
  constraint tour_ratings_one_per_user unique (tour_id, user_id),
  constraint tour_ratings_value check (rating between 1 and 5),
  constraint tour_ratings_revision check (revision > 0),
  constraint tour_ratings_notes_length check (review_notes is null or char_length(review_notes) <= 2000),
  constraint tour_ratings_review_pair check (
    (reviewed_by is null and reviewed_at is null)
    or (reviewed_by is not null and reviewed_at is not null)
  )
);

create index tour_ratings_moderation_idx
  on public.tour_ratings (organization_id, status, submitted_at);
create index tour_ratings_public_aggregate_idx
  on public.tour_ratings (tour_id, rating)
  where status = 'approved';

create table public.tour_rating_moderation_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  rating_id uuid not null references public.tour_ratings (id) on delete restrict,
  revision integer not null,
  decision public.community_review_status not null,
  moderator_user_id uuid not null references auth.users (id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  constraint rating_moderation_decision check (decision in ('changes_requested', 'approved', 'rejected')),
  constraint rating_moderation_revision check (revision > 0),
  constraint rating_moderation_notes_length check (notes is null or char_length(notes) <= 2000)
);

create trigger tour_ratings_set_updated_at
before update on public.tour_ratings
for each row execute function private.set_updated_at();

create trigger tour_rating_moderation_events_append_only
before update or delete on public.tour_rating_moderation_events
for each row execute function private.prevent_append_only_mutation();

create or replace function private.require_active_rating_user(p_user_id uuid)
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_user_id is null or not exists (
    select 1 from public.profiles p
    where p.user_id = p_user_id
      and p.status = 'active'
      and p.email_verified_at is not null
      and p.age_eligibility_confirmed_at is not null
  ) then
    raise exception 'A verified eligible account is required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.mark_tour_stop_completed(p_tour_id uuid, p_stop_id uuid, p_method text default 'audio_completed')
returns table (completed_stops integer, total_stops integer, tour_complete boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
begin
  perform private.require_active_rating_user(v_actor);
  if p_method not in ('audio_completed', 'gps_arrival') then raise exception 'Unsupported completion method'; end if;

  select t.organization_id into v_organization_id
  from public.tours t
  join public.tour_stops ts on ts.tour_id = t.id and ts.organization_id = t.organization_id
  join public.stops s on s.id = ts.stop_id and s.organization_id = t.organization_id
  where t.id = p_tour_id and ts.stop_id = p_stop_id
    and t.status = 'published' and s.status = 'published';
  if v_organization_id is null then raise exception 'Published tour stop not found' using errcode = '22023'; end if;

  insert into public.tour_stop_completions (organization_id, tour_id, stop_id, user_id, completion_method)
  values (v_organization_id, p_tour_id, p_stop_id, v_actor, p_method)
  on conflict (tour_id, stop_id, user_id) do update
    set completed_at = greatest(public.tour_stop_completions.completed_at, excluded.completed_at),
        completion_method = excluded.completion_method;

  select count(*)::integer into total_stops
  from public.tour_stops ts join public.stops s on s.id = ts.stop_id
  where ts.tour_id = p_tour_id and s.status = 'published';
  select count(*)::integer into completed_stops
  from public.tour_stop_completions c
  join public.tour_stops ts on ts.tour_id = c.tour_id and ts.stop_id = c.stop_id
  join public.stops s on s.id = c.stop_id
  where c.tour_id = p_tour_id and c.user_id = v_actor and s.status = 'published';
  tour_complete := total_stops > 0 and completed_stops = total_stops;
  return next;
end;
$$;

create or replace function public.submit_tour_rating(p_tour_id uuid, p_rating integer)
returns public.tour_ratings
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
  v_total integer;
  v_completed integer;
  v_rating public.tour_ratings;
begin
  perform private.require_active_rating_user(v_actor);
  if p_rating not between 1 and 5 then raise exception 'Rating must be between 1 and 5' using errcode = '22023'; end if;
  select organization_id into v_organization_id from public.tours where id = p_tour_id and status = 'published';
  if v_organization_id is null then raise exception 'Published tour not found' using errcode = '22023'; end if;

  select count(*)::integer into v_total
  from public.tour_stops ts join public.stops s on s.id = ts.stop_id
  where ts.tour_id = p_tour_id and s.status = 'published';
  select count(*)::integer into v_completed
  from public.tour_stop_completions c
  join public.tour_stops ts on ts.tour_id = c.tour_id and ts.stop_id = c.stop_id
  join public.stops s on s.id = c.stop_id
  where c.tour_id = p_tour_id and c.user_id = v_actor and s.status = 'published';
  if v_total = 0 or v_completed <> v_total then raise exception 'Complete every tour stop before rating this tour' using errcode = '42501'; end if;

  insert into public.tour_ratings (organization_id, tour_id, user_id, rating)
  values (v_organization_id, p_tour_id, v_actor, p_rating)
  on conflict (tour_id, user_id) do update set
    rating = excluded.rating,
    status = 'pending_review',
    revision = public.tour_ratings.revision + 1,
    submitted_at = now(),
    reviewed_by = null,
    reviewed_at = null,
    review_notes = null
  returning * into v_rating;
  return v_rating;
end;
$$;

create or replace function public.moderate_tour_rating(p_rating_id uuid, p_decision text, p_notes text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_rating public.tour_ratings;
  v_role text;
begin
  select * into v_rating from public.tour_ratings where id = p_rating_id for update;
  if not found then raise exception 'Rating not found'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_rating.organization_id, array['administrator'::public.organization_role, 'reviewer'::public.organization_role], v_actor)) then
    raise exception 'Reviewer access is required' using errcode = '42501';
  end if;
  if v_rating.status <> 'pending_review' then raise exception 'Only pending ratings may be reviewed'; end if;
  if p_decision not in ('approved', 'changes_requested', 'rejected') then raise exception 'Unsupported rating decision'; end if;
  if p_decision = 'changes_requested' and nullif(btrim(p_notes), '') is null then raise exception 'Explain the required changes'; end if;

  update public.tour_ratings set status = p_decision::public.community_review_status,
    reviewed_by = v_actor, reviewed_at = now(), review_notes = nullif(btrim(p_notes), '')
  where id = p_rating_id;
  insert into public.tour_rating_moderation_events (organization_id, rating_id, revision, decision, moderator_user_id, notes)
  values (v_rating.organization_id, v_rating.id, v_rating.revision, p_decision::public.community_review_status, v_actor, nullif(btrim(p_notes), ''));

  if private.is_super_admin(v_actor) then v_role := 'super_admin';
  elsif private.has_org_role(v_rating.organization_id, array['administrator'::public.organization_role], v_actor) then v_role := 'administrator';
  else v_role := 'reviewer'; end if;
  insert into public.audit_log (organization_id, actor_user_id, actor_role, action, entity_type, entity_id, after_summary)
  values (v_rating.organization_id, v_actor, v_role, 'tour_rating_' || p_decision, 'tour_rating', v_rating.id, jsonb_build_object('revision', v_rating.revision, 'decision', p_decision));
end;
$$;

create or replace function public.withdraw_tour_rating(p_tour_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.tour_ratings set status = 'withdrawn', reviewed_by = null, reviewed_at = null, review_notes = null
  where tour_id = p_tour_id and user_id = auth.uid();
  if not found then raise exception 'Rating not found'; end if;
end;
$$;

create or replace function public.get_tour_rating_summary(p_tour_id uuid)
returns table (rating_average numeric, rating_count bigint)
language sql stable security definer set search_path = ''
as $$
  select round(avg(r.rating)::numeric, 2), count(*)
  from public.tour_ratings r
  join public.tours t on t.id = r.tour_id
  join public.organizations o on o.id = r.organization_id
  where r.tour_id = p_tour_id and r.status = 'approved'
    and t.status = 'published' and o.status in ('active', 'trial');
$$;

alter table public.tour_stop_completions enable row level security;
alter table public.tour_ratings enable row level security;
alter table public.tour_rating_moderation_events enable row level security;

create policy completion_select_own on public.tour_stop_completions for select to authenticated
using (user_id = (select auth.uid()));
create policy ratings_select_own_or_moderator on public.tour_ratings for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role, 'reviewer'::public.organization_role]))
);
create policy rating_events_select_moderator on public.tour_rating_moderation_events for select to authenticated
using (
  (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role, 'reviewer'::public.organization_role]))
);

revoke all on public.tour_stop_completions, public.tour_ratings, public.tour_rating_moderation_events from anon, authenticated;
grant select on public.tour_stop_completions, public.tour_ratings, public.tour_rating_moderation_events to authenticated;
grant execute on function public.mark_tour_stop_completed(uuid, uuid, text) to authenticated;
grant execute on function public.submit_tour_rating(uuid, integer) to authenticated;
grant execute on function public.moderate_tour_rating(uuid, text, text) to authenticated;
grant execute on function public.withdraw_tour_rating(uuid) to authenticated;
grant execute on function public.get_tour_rating_summary(uuid) to anon, authenticated;

comment on table public.tour_stop_completions is 'Private per-user stop completion evidence; organization clients receive aggregates rather than movement history.';
comment on table public.tour_ratings is 'One moderated 1-5 star rating per authenticated visitor and tour.';
comment on function public.get_tour_rating_summary(uuid) is 'Returns public approved aggregate rating without exposing visitor identities.';
