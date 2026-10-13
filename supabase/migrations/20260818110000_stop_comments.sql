-- Stage 6B extension: attach moderated visitor comments to individual tour stops.

alter table public.tour_comments add column stop_id uuid;
alter table public.tour_comments add constraint tour_comments_stop_fk
  foreign key (organization_id, stop_id) references public.stops (organization_id, id) on delete restrict;
alter table public.tour_comments drop constraint tour_comments_one_per_user;

create unique index tour_comments_one_legacy_tour_comment_per_user
  on public.tour_comments (tour_id, user_id) where stop_id is null;
create unique index tour_comments_one_per_stop_user
  on public.tour_comments (tour_id, stop_id, user_id) where stop_id is not null;
create index tour_comments_stop_public_idx
  on public.tour_comments (tour_id, stop_id, reviewed_at desc)
  where stop_id is not null and status = 'approved';

-- Preserve the legacy tour-level API for existing records while keeping it isolated
-- from the new stop threads.
create or replace function public.submit_tour_comment(p_tour_id uuid, p_body text)
returns public.tour_comments
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid(); v_organization_id uuid;
  v_body text := btrim(coalesce(p_body, '')); v_comment public.tour_comments;
begin
  perform private.require_active_rating_user(v_actor);
  if char_length(v_body) not between 3 and 2000 then raise exception 'Comment must contain between 3 and 2000 characters' using errcode = '22023'; end if;
  select organization_id into v_organization_id from public.tours where id = p_tour_id and status = 'published';
  if v_organization_id is null then raise exception 'Published tour not found' using errcode = '22023'; end if;
  if private.is_community_banned(v_organization_id, v_actor) then raise exception 'Community submissions are currently disabled for this account' using errcode = '42501'; end if;
  insert into public.tour_comments (organization_id, tour_id, stop_id, user_id, body)
  values (v_organization_id, p_tour_id, null, v_actor, v_body)
  on conflict (tour_id, user_id) where stop_id is null do update set
    body=excluded.body, status='pending_review', revision=public.tour_comments.revision+1,
    submitted_at=now(), reviewed_by=null, reviewed_at=null, review_notes=null
  returning * into v_comment;
  return v_comment;
end;
$$;

create or replace function public.get_public_tour_comments(p_tour_id uuid, p_limit integer default 20, p_offset integer default 0)
returns table (comment_id uuid, comment_text text, published_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.body, c.reviewed_at from public.tour_comments c
  join public.tours t on t.id=c.tour_id and t.organization_id=c.organization_id
  join public.organizations o on o.id=c.organization_id
  where c.tour_id=p_tour_id and c.stop_id is null and c.status='approved'
    and t.status='published' and o.status in ('active','trial')
  order by c.reviewed_at desc,c.id limit least(greatest(coalesce(p_limit,20),1),50)
  offset greatest(coalesce(p_offset,0),0);
$$;

create or replace function public.submit_stop_comment(p_tour_id uuid, p_stop_id uuid, p_body text)
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
  select t.organization_id into v_organization_id
  from public.tours t
  join public.tour_stops ts on ts.organization_id = t.organization_id and ts.tour_id = t.id
  join public.stops s on s.organization_id = ts.organization_id and s.id = ts.stop_id
  where t.id = p_tour_id and s.id = p_stop_id and t.status = 'published' and s.status = 'published';
  if v_organization_id is null then raise exception 'Published tour stop not found' using errcode = '22023'; end if;
  if private.is_community_banned(v_organization_id, v_actor) then
    raise exception 'Community submissions are currently disabled for this account' using errcode = '42501';
  end if;

  insert into public.tour_comments (organization_id, tour_id, stop_id, user_id, body)
  values (v_organization_id, p_tour_id, p_stop_id, v_actor, v_body)
  on conflict (tour_id, stop_id, user_id) where stop_id is not null do update set
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

create or replace function public.withdraw_stop_comment(p_tour_id uuid, p_stop_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.tour_comments set status = 'withdrawn', reviewed_by = null, reviewed_at = null, review_notes = null
  where tour_id = p_tour_id and stop_id = p_stop_id and user_id = auth.uid();
  if not found then raise exception 'Comment not found'; end if;
end;
$$;

create or replace function public.get_public_stop_comments(
  p_tour_id uuid, p_stop_id uuid, p_limit integer default 20, p_offset integer default 0
)
returns table (comment_id uuid, comment_text text, published_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.body, c.reviewed_at
  from public.tour_comments c
  join public.tours t on t.id = c.tour_id and t.organization_id = c.organization_id
  join public.stops s on s.id = c.stop_id and s.organization_id = c.organization_id
  join public.tour_stops ts on ts.organization_id = c.organization_id and ts.tour_id = c.tour_id and ts.stop_id = c.stop_id
  join public.organizations o on o.id = c.organization_id
  where c.tour_id = p_tour_id and c.stop_id = p_stop_id and c.status = 'approved'
    and t.status = 'published' and s.status = 'published' and o.status in ('active', 'trial')
  order by c.reviewed_at desc, c.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.submit_stop_comment(uuid, uuid, text) from public, anon;
revoke all on function public.withdraw_stop_comment(uuid, uuid) from public, anon;
grant execute on function public.submit_stop_comment(uuid, uuid, text) to authenticated;
grant execute on function public.withdraw_stop_comment(uuid, uuid) to authenticated;
grant execute on function public.get_public_stop_comments(uuid, uuid, integer, integer) to anon, authenticated;

comment on column public.tour_comments.stop_id is 'The published stop this moderated visitor comment belongs to; null only for legacy tour-level comments.';
comment on function public.get_public_stop_comments(uuid, uuid, integer, integer) is 'Returns approved comments for one published tour stop without exposing visitor identity.';
