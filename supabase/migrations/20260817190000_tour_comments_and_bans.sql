-- Stage 6B: moderated tour comments and recoverable organization-level community bans.

create table public.tour_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  tour_id uuid not null,
  user_id uuid not null references auth.users (id) on delete restrict,
  body text not null,
  status public.community_review_status not null default 'pending_review',
  revision integer not null default 1,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tour_comments_tour_fk foreign key (organization_id, tour_id)
    references public.tours (organization_id, id) on delete restrict,
  constraint tour_comments_one_per_user unique (tour_id, user_id),
  constraint tour_comments_body_length check (char_length(btrim(body)) between 3 and 2000),
  constraint tour_comments_revision check (revision > 0),
  constraint tour_comments_notes_length check (review_notes is null or char_length(review_notes) <= 2000),
  constraint tour_comments_review_pair check (
    (reviewed_by is null and reviewed_at is null)
    or (reviewed_by is not null and reviewed_at is not null)
  )
);

create index tour_comments_moderation_idx
  on public.tour_comments (organization_id, status, submitted_at);
create index tour_comments_public_idx
  on public.tour_comments (tour_id, reviewed_at desc)
  where status = 'approved';

create table public.tour_comment_moderation_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  comment_id uuid not null references public.tour_comments (id) on delete restrict,
  revision integer not null,
  decision public.community_review_status not null,
  moderator_user_id uuid not null references auth.users (id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  constraint comment_moderation_decision check (decision in ('changes_requested', 'approved', 'rejected')),
  constraint comment_moderation_revision check (revision > 0),
  constraint comment_moderation_notes_length check (notes is null or char_length(notes) <= 2000)
);

create table public.community_user_bans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  scope text not null default 'community_submissions',
  reason text not null,
  banned_by uuid not null references auth.users (id) on delete restrict,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  lifted_at timestamptz,
  lifted_by uuid references auth.users (id) on delete restrict,
  lift_reason text,
  created_at timestamptz not null default now(),
  constraint community_user_bans_scope check (scope = 'community_submissions'),
  constraint community_user_bans_reason_length check (char_length(btrim(reason)) between 10 and 2000),
  constraint community_user_bans_expiry check (expires_at is null or expires_at > starts_at),
  constraint community_user_bans_lift_pair check (
    (lifted_at is null and lifted_by is null and lift_reason is null)
    or (lifted_at is not null and lifted_by is not null and char_length(btrim(lift_reason)) between 3 and 2000)
  )
);

create index community_user_bans_lookup_idx
  on public.community_user_bans (organization_id, user_id, starts_at desc);

create trigger tour_comments_set_updated_at
before update on public.tour_comments
for each row execute function private.set_updated_at();

create trigger tour_comment_moderation_events_append_only
before update or delete on public.tour_comment_moderation_events
for each row execute function private.prevent_append_only_mutation();

create trigger community_user_bans_append_only
before delete on public.community_user_bans
for each row execute function private.prevent_append_only_mutation();

create or replace function private.is_community_banned(p_organization_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.community_user_bans b
    where b.organization_id = p_organization_id
      and b.user_id = p_user_id
      and b.scope = 'community_submissions'
      and b.starts_at <= now()
      and b.lifted_at is null
      and (b.expires_at is null or b.expires_at > now())
  );
$$;

create or replace function public.submit_tour_comment(p_tour_id uuid, p_body text)
returns public.tour_comments
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
  v_comment public.tour_comments;
begin
  perform private.require_active_rating_user(v_actor);
  if char_length(v_body) not between 3 and 2000 then
    raise exception 'Comment must contain between 3 and 2000 characters' using errcode = '22023';
  end if;
  select organization_id into v_organization_id
  from public.tours where id = p_tour_id and status = 'published';
  if v_organization_id is null then raise exception 'Published tour not found' using errcode = '22023'; end if;
  if private.is_community_banned(v_organization_id, v_actor) then
    raise exception 'Community submissions are currently disabled for this account' using errcode = '42501';
  end if;

  insert into public.tour_comments (organization_id, tour_id, user_id, body)
  values (v_organization_id, p_tour_id, v_actor, v_body)
  on conflict (tour_id, user_id) do update set
    body = excluded.body,
    status = 'pending_review',
    revision = public.tour_comments.revision + 1,
    submitted_at = now(),
    reviewed_by = null,
    reviewed_at = null,
    review_notes = null
  returning * into v_comment;
  return v_comment;
end;
$$;

create or replace function public.moderate_tour_comment(p_comment_id uuid, p_decision text, p_notes text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_comment public.tour_comments;
  v_role text;
begin
  select * into v_comment from public.tour_comments where id = p_comment_id for update;
  if not found then raise exception 'Comment not found'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_comment.organization_id, array['administrator'::public.organization_role, 'reviewer'::public.organization_role], v_actor)) then
    raise exception 'Reviewer access is required' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'changes_requested', 'rejected') then raise exception 'Unsupported comment decision'; end if;
  if v_comment.status = 'approved' and p_decision <> 'rejected' then raise exception 'Published comments may only be removed'; end if;
  if v_comment.status not in ('pending_review', 'approved') then raise exception 'This comment is not reviewable'; end if;
  if p_decision = 'changes_requested' and nullif(btrim(p_notes), '') is null then raise exception 'Explain the required changes'; end if;

  update public.tour_comments set
    status = p_decision::public.community_review_status,
    reviewed_by = v_actor,
    reviewed_at = now(),
    review_notes = nullif(btrim(p_notes), '')
  where id = p_comment_id;
  insert into public.tour_comment_moderation_events (organization_id, comment_id, revision, decision, moderator_user_id, notes)
  values (v_comment.organization_id, v_comment.id, v_comment.revision, p_decision::public.community_review_status, v_actor, nullif(btrim(p_notes), ''));

  if private.is_super_admin(v_actor) then v_role := 'super_admin';
  elsif private.has_org_role(v_comment.organization_id, array['administrator'::public.organization_role], v_actor) then v_role := 'administrator';
  else v_role := 'reviewer'; end if;
  insert into public.audit_log (organization_id, actor_user_id, actor_role, action, entity_type, entity_id, after_summary)
  values (v_comment.organization_id, v_actor, v_role, 'tour_comment_' || p_decision, 'tour_comment', v_comment.id, jsonb_build_object('revision', v_comment.revision, 'decision', p_decision));
end;
$$;

create or replace function public.withdraw_tour_comment(p_tour_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.tour_comments set status = 'withdrawn', reviewed_by = null, reviewed_at = null, review_notes = null
  where tour_id = p_tour_id and user_id = auth.uid();
  if not found then raise exception 'Comment not found'; end if;
end;
$$;

create or replace function public.get_public_tour_comments(p_tour_id uuid, p_limit integer default 20, p_offset integer default 0)
returns table (comment_id uuid, comment_text text, published_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.body, c.reviewed_at
  from public.tour_comments c
  join public.tours t on t.id = c.tour_id and t.organization_id = c.organization_id
  join public.organizations o on o.id = c.organization_id
  where c.tour_id = p_tour_id
    and c.status = 'approved'
    and t.status = 'published'
    and o.status in ('active', 'trial')
  order by c.reviewed_at desc, c.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.ban_community_user(p_organization_id uuid, p_user_id uuid, p_reason text, p_duration_days integer default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_id uuid;
  v_role text;
begin
  if not (private.is_super_admin(v_actor) or private.has_org_role(p_organization_id, array['administrator'::public.organization_role], v_actor)) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_user_id = v_actor then raise exception 'You cannot ban your own account'; end if;
  if char_length(v_reason) not between 10 and 2000 then raise exception 'Enter a ban reason of at least 10 characters'; end if;
  if p_duration_days is not null and p_duration_days not between 1 and 365 then raise exception 'Ban duration must be between 1 and 365 days'; end if;
  if not exists (select 1 from public.profiles where user_id = p_user_id) then raise exception 'User not found'; end if;

  insert into public.community_user_bans (organization_id, user_id, reason, banned_by, expires_at)
  values (p_organization_id, p_user_id, v_reason, v_actor, case when p_duration_days is null then null else now() + make_interval(days => p_duration_days) end)
  returning id into v_id;

  with hidden as (
    update public.tour_comments set status = 'rejected', reviewed_by = v_actor, reviewed_at = now(), review_notes = 'Account banned: ' || v_reason
    where organization_id = p_organization_id and user_id = p_user_id and status in ('pending_review', 'approved')
    returning id, organization_id, revision
  )
  insert into public.tour_comment_moderation_events (organization_id, comment_id, revision, decision, moderator_user_id, notes)
  select organization_id, id, revision, 'rejected', v_actor, 'Account banned: ' || v_reason from hidden;

  if private.is_super_admin(v_actor) then v_role := 'super_admin'; else v_role := 'administrator'; end if;
  insert into public.audit_log (organization_id, actor_user_id, actor_role, action, entity_type, entity_id, after_summary)
  values (p_organization_id, v_actor, v_role, 'community_user_banned', 'profile', p_user_id,
    jsonb_build_object('scope', 'community_submissions', 'duration_days', p_duration_days, 'ban_id', v_id));
  return v_id;
end;
$$;

create or replace function public.lift_community_user_ban(p_ban_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_ban public.community_user_bans;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_role text;
begin
  select * into v_ban from public.community_user_bans where id = p_ban_id for update;
  if not found then raise exception 'Ban not found'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_ban.organization_id, array['administrator'::public.organization_role], v_actor)) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if v_ban.lifted_at is not null then raise exception 'Ban is already lifted'; end if;
  if char_length(v_reason) not between 3 and 2000 then raise exception 'Enter a reason for lifting the ban'; end if;
  update public.community_user_bans set lifted_at = now(), lifted_by = v_actor, lift_reason = v_reason where id = p_ban_id;
  if private.is_super_admin(v_actor) then v_role := 'super_admin'; else v_role := 'administrator'; end if;
  insert into public.audit_log (organization_id, actor_user_id, actor_role, action, entity_type, entity_id, after_summary)
  values (v_ban.organization_id, v_actor, v_role, 'community_user_ban_lifted', 'profile', v_ban.user_id,
    jsonb_build_object('ban_id', v_ban.id, 'reason', v_reason));
end;
$$;

alter table public.tour_comments enable row level security;
alter table public.tour_comment_moderation_events enable row level security;
alter table public.community_user_bans enable row level security;

create policy comments_select_own_or_moderator on public.tour_comments for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role, 'reviewer'::public.organization_role]))
);
create policy comment_events_select_moderator on public.tour_comment_moderation_events for select to authenticated
using (
  (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role, 'reviewer'::public.organization_role]))
);
create policy community_bans_select_own_or_moderator on public.community_user_bans for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role, 'reviewer'::public.organization_role]))
);

revoke all on public.tour_comments, public.tour_comment_moderation_events, public.community_user_bans from anon, authenticated;
grant select on public.tour_comments, public.tour_comment_moderation_events, public.community_user_bans to authenticated;
revoke all on function public.submit_tour_comment(uuid, text) from public, anon;
revoke all on function public.moderate_tour_comment(uuid, text, text) from public, anon;
revoke all on function public.withdraw_tour_comment(uuid) from public, anon;
revoke all on function public.ban_community_user(uuid, uuid, text, integer) from public, anon;
revoke all on function public.lift_community_user_ban(uuid, text) from public, anon;
grant execute on function public.submit_tour_comment(uuid, text) to authenticated;
grant execute on function public.moderate_tour_comment(uuid, text, text) to authenticated;
grant execute on function public.withdraw_tour_comment(uuid) to authenticated;
grant execute on function public.get_public_tour_comments(uuid, integer, integer) to anon, authenticated;
grant execute on function public.ban_community_user(uuid, uuid, text, integer) to authenticated;
grant execute on function public.lift_community_user_ban(uuid, text) to authenticated;

comment on table public.tour_comments is 'One current moderated tour comment per visitor and tour; visitor identity remains private in public delivery.';
comment on table public.community_user_bans is 'Recoverable organization-level community submission restrictions with reason, duration and audit evidence.';
comment on function public.get_public_tour_comments(uuid, integer, integer) is 'Returns approved tour comment text and publication time without visitor identifiers.';
