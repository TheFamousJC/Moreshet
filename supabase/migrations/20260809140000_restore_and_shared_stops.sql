-- Stage 4E: recover archived content and manage reusable stop assignments safely.

create or replace function public.archive_content(
  p_content_kind public.content_kind,
  p_content_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  v_organization_id := private.content_organization_id(p_content_kind,p_content_id);
  if v_organization_id is null then raise exception 'Content does not exist' using errcode = '23503'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_organization_id,array['administrator'::public.organization_role],v_actor)) then raise exception 'Only an Administrator or the Super Admin may archive content' using errcode = '42501'; end if;
  perform private.set_content_status(p_content_kind,p_content_id,'archived');
  case p_content_kind
    when 'city' then update public.cities set archived_at=now() where id=p_content_id;
    when 'tour' then update public.tours set archived_at=now() where id=p_content_id;
    when 'stop' then update public.stops set archived_at=now() where id=p_content_id;
  end case;
end;
$$;

create or replace function public.restore_content(
  p_content_kind public.content_kind,
  p_content_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
  v_status public.content_status;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  v_organization_id := private.content_organization_id(p_content_kind,p_content_id);
  v_status := private.content_status_for(p_content_kind,p_content_id);
  if v_organization_id is null then raise exception 'Content does not exist' using errcode = '23503'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_organization_id,array['administrator'::public.organization_role],v_actor)) then raise exception 'Only an Administrator or the Super Admin may restore content' using errcode = '42501'; end if;
  if v_status <> 'archived' then raise exception 'Only archived content can be restored' using errcode = '55000'; end if;
  perform private.set_content_status(p_content_kind,p_content_id,'draft');
  case p_content_kind
    when 'city' then update public.cities set archived_at=null,updated_by=v_actor where id=p_content_id;
    when 'tour' then update public.tours set archived_at=null,updated_by=v_actor where id=p_content_id;
    when 'stop' then update public.stops set archived_at=null,updated_by=v_actor where id=p_content_id;
  end case;
end;
$$;

create or replace function private.validate_replacement_tour_stops(
  p_tour_id uuid,
  p_stop_ids uuid[]
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_city_id uuid;
  v_supplied integer := coalesce(cardinality(p_stop_ids),0);
  v_distinct integer;
  v_valid integer;
begin
  select organization_id,city_id into v_organization_id,v_city_id from public.tours where id=p_tour_id;
  if v_organization_id is null then raise exception 'Tour does not exist' using errcode = '23503'; end if;
  select count(distinct stop_id) into v_distinct from unnest(coalesce(p_stop_ids,array[]::uuid[])) as supplied(stop_id);
  select count(*) into v_valid from public.stops where id=any(coalesce(p_stop_ids,array[]::uuid[])) and organization_id=v_organization_id and city_id=v_city_id and status <> 'archived';
  if v_distinct <> v_supplied then raise exception 'A stop may appear only once in a tour' using errcode = '22023'; end if;
  if v_valid <> v_supplied then raise exception 'Every assigned stop must be an active stop in the same organization and city' using errcode = '23514'; end if;
end;
$$;

create or replace function public.replace_tour_stops(
  p_tour_id uuid,
  p_stop_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
  v_status public.content_status;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select organization_id,status into v_organization_id,v_status from public.tours where id=p_tour_id;
  if v_organization_id is null then raise exception 'Tour does not exist' using errcode = '23503'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_organization_id,array['administrator'::public.organization_role,'editor'::public.organization_role],v_actor)) then raise exception 'Only Editors, Administrators or the Super Admin may configure tour stops' using errcode = '42501'; end if;
  if v_status='published' then raise exception 'Published tour assignments must be submitted as a revision' using errcode = '55000'; end if;
  perform private.validate_replacement_tour_stops(p_tour_id,p_stop_ids);
  set constraints public.tour_stops_tour_position_unique deferred;
  delete from public.tour_stops where tour_id=p_tour_id and not (stop_id=any(coalesce(p_stop_ids,array[]::uuid[])));
  insert into public.tour_stops (organization_id,tour_id,stop_id,position,created_by,updated_by)
  select v_organization_id,p_tour_id,ordered.stop_id,ordered.position::integer,v_actor,v_actor
  from unnest(coalesce(p_stop_ids,array[]::uuid[])) with ordinality as ordered(stop_id,position)
  on conflict (tour_id,stop_id) do update set position=excluded.position,updated_by=v_actor;
end;
$$;

create or replace function private.apply_published_tour_stop_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stop_ids uuid[];
  v_organization_id uuid := new.organization_id;
begin
  if new.content_kind <> 'tour' or not new.revises_published_content or not (new.snapshot ? 'stopOrder') or old.status <> 'approved' or new.status <> 'published' then return new; end if;
  select coalesce(array_agg(value::uuid order by ordinality),array[]::uuid[]) into v_stop_ids
  from jsonb_array_elements_text(new.snapshot->'stopOrder') with ordinality as item(value,ordinality);
  perform private.validate_replacement_tour_stops(new.content_id,v_stop_ids);
  perform set_config('app.applying_approved_revision','on',true);
  set constraints public.tour_stops_tour_position_unique deferred;
  delete from public.tour_stops where tour_id=new.content_id and not (stop_id=any(v_stop_ids));
  insert into public.tour_stops (organization_id,tour_id,stop_id,position,created_by,updated_by)
  select v_organization_id,new.content_id,ordered.stop_id,ordered.position::integer,new.published_by,new.published_by
  from unnest(v_stop_ids) with ordinality as ordered(stop_id,position)
  on conflict (tour_id,stop_id) do update set position=excluded.position,updated_by=new.published_by;
  perform set_config('app.applying_approved_revision','off',true);
  return new;
end;
$$;

grant execute on function public.archive_content(public.content_kind,uuid) to authenticated;
grant execute on function public.restore_content(public.content_kind,uuid) to authenticated;
grant execute on function public.replace_tour_stops(uuid,uuid[]) to authenticated;
revoke all on function private.validate_replacement_tour_stops(uuid,uuid[]) from public,anon,authenticated;
revoke all on function private.apply_published_tour_stop_order() from public,anon,authenticated;

comment on function public.restore_content(public.content_kind,uuid) is 'Restores archived content to draft for review before any republication.';
comment on function public.replace_tour_stops(uuid,uuid[]) is 'Atomically adds, removes and orders reusable stops for a draft tour.';
