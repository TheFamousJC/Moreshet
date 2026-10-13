-- Qualify the deferred constraint because these security-definer functions use an empty search path.

create or replace function public.reorder_tour_stops(
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
  if not (
    private.is_super_admin(v_actor)
    or private.has_org_role(v_organization_id,array['administrator'::public.organization_role,'editor'::public.organization_role],v_actor)
  ) then raise exception 'Only Editors, Administrators or the Super Admin may reorder tour stops' using errcode = '42501'; end if;
  if v_status = 'published' then raise exception 'Published tour ordering must be submitted as a revision' using errcode = '55000'; end if;
  perform private.validate_tour_stop_order(p_tour_id,p_stop_ids);
  set constraints public.tour_stops_tour_position_unique deferred;
  update public.tour_stops as assignment
  set position=ordered.position::integer,updated_by=v_actor
  from unnest(p_stop_ids) with ordinality as ordered(stop_id,position)
  where assignment.tour_id=p_tour_id and assignment.stop_id=ordered.stop_id;
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
begin
  if new.content_kind <> 'tour' or not new.revises_published_content or not (new.snapshot ? 'stopOrder')
     or old.status <> 'approved' or new.status <> 'published' then return new; end if;
  select coalesce(array_agg(value::uuid order by ordinality),array[]::uuid[])
  into v_stop_ids
  from jsonb_array_elements_text(new.snapshot->'stopOrder') with ordinality as item(value,ordinality);
  perform private.validate_tour_stop_order(new.content_id,v_stop_ids);
  perform set_config('app.applying_approved_revision','on',true);
  set constraints public.tour_stops_tour_position_unique deferred;
  update public.tour_stops as assignment
  set position=ordered.position::integer,updated_by=new.published_by
  from unnest(v_stop_ids) with ordinality as ordered(stop_id,position)
  where assignment.tour_id=new.content_id and assignment.stop_id=ordered.stop_id;
  perform set_config('app.applying_approved_revision','off',true);
  return new;
end;
$$;

grant execute on function public.reorder_tour_stops(uuid,uuid[]) to authenticated;
revoke all on function private.apply_published_tour_stop_order() from public,anon,authenticated;
