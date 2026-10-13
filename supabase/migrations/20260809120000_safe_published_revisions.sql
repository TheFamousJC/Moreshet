-- Stage 4D: keep the live version visible while proposed edits are reviewed,
-- then atomically apply an approved snapshot when it is published.

alter table public.content_revisions
  add column if not exists revises_published_content boolean not null default false;

create or replace function private.set_content_status(
  p_kind public.content_kind,
  p_content_id uuid,
  p_status public.content_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  case p_kind
    when 'city' then
      update public.cities set status = p_status where id = p_content_id;
      update public.city_translations set status = p_status where city_id = p_content_id;
    when 'tour' then
      update public.tours set status = p_status where id = p_content_id;
      update public.tour_translations set status = p_status where tour_id = p_content_id;
    when 'stop' then
      update public.stops set status = p_status where id = p_content_id;
      update public.stop_translations set status = p_status where stop_id = p_content_id;
  end case;
end;
$$;

create or replace function private.content_status_for(
  p_kind public.content_kind,
  p_content_id uuid
)
returns public.content_status
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_status public.content_status;
begin
  case p_kind
    when 'city' then select status into v_status from public.cities where id = p_content_id;
    when 'tour' then select status into v_status from public.tours where id = p_content_id;
    when 'stop' then select status into v_status from public.stops where id = p_content_id;
  end case;
  return v_status;
end;
$$;

create or replace function private.enforce_content_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
  v_is_super boolean;
  v_is_admin boolean;
  v_is_editor boolean;
  v_is_reviewer boolean;
begin
  if v_actor is null then return new; end if;
  if to_jsonb(new) ? 'updated_by' then
    new := jsonb_populate_record(new, jsonb_build_object('updated_by', v_actor));
  end if;

  -- This flag is set only inside the non-public snapshot application function.
  if current_setting('app.applying_approved_revision', true) = 'on' then return new; end if;

  v_organization_id := (to_jsonb(new) ->> 'organization_id')::uuid;
  v_is_super := private.is_super_admin(v_actor);
  v_is_admin := private.has_org_role(v_organization_id, array['administrator'::public.organization_role], v_actor);
  v_is_editor := private.has_org_role(v_organization_id, array['editor'::public.organization_role], v_actor);
  v_is_reviewer := private.has_org_role(v_organization_id, array['reviewer'::public.organization_role], v_actor);

  if tg_op = 'INSERT' then
    if to_jsonb(new) ? 'created_by' and (to_jsonb(new) ->> 'created_by')::uuid <> v_actor then raise exception 'Content creator must match the signed-in user' using errcode = '42501'; end if;
    if to_jsonb(new) ? 'author_user_id' and (to_jsonb(new) ->> 'author_user_id')::uuid <> v_actor then raise exception 'Revision author must match the signed-in user' using errcode = '42501'; end if;
    if not (v_is_super or v_is_admin or v_is_editor) then raise exception 'Only Editors, Administrators or the Super Admin may create content' using errcode = '42501'; end if;
    if v_is_editor and new.status <> 'draft' then raise exception 'Editors may create draft content only' using errcode = '42501'; end if;
    return new;
  end if;

  if (to_jsonb(new) ? 'created_by' and (to_jsonb(new) ->> 'created_by') is distinct from (to_jsonb(old) ->> 'created_by'))
     or (to_jsonb(new) ? 'author_user_id' and (to_jsonb(new) ->> 'author_user_id') is distinct from (to_jsonb(old) ->> 'author_user_id')) then
    raise exception 'Content creator and revision author are immutable' using errcode = '55000';
  end if;
  if old.status = 'published' and new.status = 'published' and private.content_material(to_jsonb(old)) is distinct from private.content_material(to_jsonb(new)) then
    raise exception 'Published content is immutable; create a new revision' using errcode = '55000';
  end if;
  if v_is_super or v_is_admin then return new; end if;
  if v_is_editor then
    if old.status not in ('draft', 'changes_requested') or new.status not in ('draft', 'pending_review') then raise exception 'Editors may edit drafts and submit them for review, but may not approve or publish' using errcode = '42501'; end if;
    if new.status = 'pending_review' and old.status <> 'pending_review' then new.submitted_at := coalesce(new.submitted_at, now()); end if;
    return new;
  end if;
  if v_is_reviewer then
    if private.content_material(to_jsonb(old)) is distinct from private.content_material(to_jsonb(new)) then raise exception 'Reviewers may change workflow state but may not edit content' using errcode = '42501'; end if;
    if not ((old.status = 'pending_review' and new.status in ('changes_requested', 'approved')) or (old.status = 'approved' and new.status = 'published')) then raise exception 'Invalid Reviewer content transition from % to %', old.status, new.status using errcode = '42501'; end if;
    if new.status in ('changes_requested', 'approved') then new.reviewed_by := v_actor; new.reviewed_at := now(); else new.published_by := v_actor; new.published_at := now(); end if;
    return new;
  end if;
  raise exception 'User is not authorized to change organization content' using errcode = '42501';
end;
$$;

create or replace function private.enforce_tour_stop_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_tour_status public.content_status;
begin
  if v_actor is null then return coalesce(new, old); end if;
  if current_setting('app.applying_approved_revision', true) = 'on' then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then
    if new.created_by <> v_actor then raise exception 'Tour-stop creator must match the signed-in user' using errcode = '42501'; end if;
    new.updated_by := v_actor;
    select status into v_tour_status from public.tours where id = new.tour_id;
  else
    if tg_op = 'UPDATE' then
      if new.created_by is distinct from old.created_by then raise exception 'Tour-stop creator is immutable' using errcode = '55000'; end if;
      new.updated_by := v_actor;
    end if;
    select status into v_tour_status from public.tours where id = old.tour_id;
  end if;
  if v_tour_status = 'published' then raise exception 'Published tour ordering is immutable; create a new tour revision' using errcode = '55000'; end if;
  return coalesce(new, old);
end;
$$;

create or replace function private.validate_content_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity_organization_id uuid;
begin
  v_entity_organization_id := private.content_organization_id(new.content_kind, new.content_id);
  if v_entity_organization_id is null then raise exception 'Content target does not exist' using errcode = '23503'; end if;
  if v_entity_organization_id <> new.organization_id then raise exception 'Content revision organization does not match its target' using errcode = '23514'; end if;
  if tg_op = 'UPDATE' and (
    new.organization_id is distinct from old.organization_id or new.content_kind is distinct from old.content_kind
    or new.content_id is distinct from old.content_id or new.revision_number is distinct from old.revision_number
    or new.snapshot is distinct from old.snapshot or new.source is distinct from old.source
    or new.author_user_id is distinct from old.author_user_id or new.created_at is distinct from old.created_at
    or new.revises_published_content is distinct from old.revises_published_content
  ) then raise exception 'Revision identity and snapshot are immutable' using errcode = '55000'; end if;
  return new;
end;
$$;

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
  v_tour_id uuid;
  v_position integer;
begin
  perform set_config('app.applying_approved_revision', 'on', true);
  case p_kind
    when 'city' then
      update public.cities set
        country_name = coalesce(nullif(p_snapshot->>'country',''), country_name),
        flag_emoji = coalesce(p_snapshot->>'flagEmoji', flag_emoji),
        center_latitude = coalesce((p_snapshot->>'centerLat')::double precision, center_latitude),
        center_longitude = coalesce((p_snapshot->>'centerLng')::double precision, center_longitude),
        hero_media_id = coalesce(nullif(p_snapshot->>'imageMediaId','')::uuid, hero_media_id),
        updated_by = p_actor
      where id = p_content_id;
      update public.city_translations set
        name = coalesce(nullif(p_snapshot->>'name',''), name), subtitle = p_snapshot->>'subtitle',
        description = coalesce(nullif(p_snapshot->>'description',''), description), updated_by = p_actor
      where city_id = p_content_id and language = 'en';
    when 'tour' then
      update public.tours set
        city_id = coalesce(nullif(p_snapshot->>'cityId','')::uuid, city_id),
        estimated_duration_minutes = nullif(p_snapshot->>'estimatedDurationMinutes','')::integer,
        distance_metres = nullif(p_snapshot->>'distanceMetres','')::integer,
        difficulty = coalesce(nullif(p_snapshot->>'difficulty','')::public.tour_difficulty, difficulty),
        wheelchair_accessible = coalesce((p_snapshot->>'wheelchairAccessible')::boolean, wheelchair_accessible),
        access_mode = coalesce(nullif(p_snapshot->>'accessMode','')::public.tour_access_mode, access_mode),
        hero_media_id = coalesce(nullif(p_snapshot->>'imageMediaId','')::uuid, hero_media_id), updated_by = p_actor
      where id = p_content_id;
      update public.tour_translations set
        title = coalesce(nullif(p_snapshot->>'title',''), title), subtitle = p_snapshot->>'subtitle',
        overview = coalesce(nullif(p_snapshot->>'overview',''), overview), completion_message = p_snapshot->>'completionMessage', updated_by = p_actor
      where tour_id = p_content_id and language = 'en';
    when 'stop' then
      update public.stops set
        city_id = coalesce(nullif(p_snapshot->>'cityId','')::uuid, city_id),
        interest = coalesce(nullif(p_snapshot->>'category','')::public.interest_key, interest),
        address = p_snapshot->>'address', latitude = coalesce((p_snapshot->>'lat')::double precision, latitude),
        longitude = coalesce((p_snapshot->>'lng')::double precision, longitude),
        hero_media_id = coalesce(nullif(p_snapshot->>'imageMediaId','')::uuid, hero_media_id),
        audio_duration_seconds = nullif(p_snapshot->>'audioDuration','')::integer,
        historical_period = p_snapshot->>'historicalPeriod', updated_by = p_actor
      where id = p_content_id;
      update public.stop_translations set
        title = coalesce(nullif(p_snapshot->>'name',''), title), native_name = p_snapshot->>'hebrewName',
        short_description = coalesce(nullif(p_snapshot->>'shortDescription',''), short_description),
        narrative = coalesce(nullif(p_snapshot->>'fullDescription',''), narrative),
        audio_transcript = p_snapshot->>'transcript', updated_by = p_actor
      where stop_id = p_content_id and language = 'en';
      v_tour_id := nullif(p_snapshot->>'tourId','')::uuid;
      v_position := coalesce(nullif(p_snapshot->>'tourOrder','')::integer, 1);
      if v_tour_id is not null then
        insert into public.tour_stops (organization_id,tour_id,stop_id,position,created_by,updated_by)
        values (v_org,v_tour_id,p_content_id,v_position,p_actor,p_actor)
        on conflict (tour_id,stop_id) do update set position=excluded.position,updated_by=p_actor;
      end if;
  end case;
  perform private.set_content_status(p_kind, p_content_id, 'published');
  perform set_config('app.applying_approved_revision', 'off', true);
end;
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
  v_target_status := case when new.decision = 'approved' then 'approved'::public.content_status else 'changes_requested'::public.content_status end;
  update public.content_revisions set status=v_target_status,reviewed_by=new.reviewer_user_id,reviewed_at=new.decided_at where id=new.revision_id;
  if not v_revision.revises_published_content then perform private.set_content_status(v_revision.content_kind,v_revision.content_id,v_target_status); end if;
  return new;
end;
$$;

create or replace function public.submit_content_for_review(
  p_content_kind public.content_kind,
  p_content_id uuid,
  p_snapshot jsonb,
  p_source public.content_source default 'human'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid(); v_organization_id uuid; v_revision_id uuid; v_revision_number integer;
  v_revises_published boolean;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_snapshot) <> 'object' then raise exception 'Revision snapshot must be a JSON object' using errcode = '22023'; end if;
  v_organization_id := private.content_organization_id(p_content_kind,p_content_id);
  if v_organization_id is null then raise exception 'Content target does not exist' using errcode = '23503'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_organization_id,array['administrator'::public.organization_role,'editor'::public.organization_role],v_actor)) then raise exception 'Only Editors, Administrators or the Super Admin may submit content' using errcode = '42501'; end if;
  v_revises_published := private.content_status_for(p_content_kind,p_content_id) = 'published';
  select coalesce(max(revision_number),0)+1 into v_revision_number from public.content_revisions where organization_id=v_organization_id and content_kind=p_content_kind and content_id=p_content_id;
  insert into public.content_revisions (organization_id,content_kind,content_id,revision_number,snapshot,status,source,author_user_id,revises_published_content)
  values (v_organization_id,p_content_kind,p_content_id,v_revision_number,p_snapshot,'draft',p_source,v_actor,v_revises_published) returning id into v_revision_id;
  update public.content_revisions set status='pending_review',submitted_at=now() where id=v_revision_id;
  if not v_revises_published then perform private.set_content_status(p_content_kind,p_content_id,'pending_review'); end if;
  return v_revision_id;
end;
$$;

create or replace function public.publish_content_revision(p_revision_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid(); v_revision public.content_revisions%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_revision from public.content_revisions where id=p_revision_id;
  if not found then raise exception 'Revision does not exist' using errcode = '23503'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_revision.organization_id,array['administrator'::public.organization_role,'reviewer'::public.organization_role],v_actor)) then raise exception 'Only Reviewers, Administrators or the Super Admin may publish content' using errcode = '42501'; end if;
  if v_revision.status <> 'approved' then raise exception 'Only an approved revision may be published' using errcode = '55000'; end if;
  if v_revision.revises_published_content then
    perform private.apply_content_snapshot(v_revision.content_kind,v_revision.content_id,v_revision.snapshot,v_actor);
  else
    perform private.set_content_status(v_revision.content_kind,v_revision.content_id,'published');
  end if;
  update public.content_revisions set status='published',published_by=v_actor,published_at=now() where id=p_revision_id;
end;
$$;

revoke all on function private.content_status_for(public.content_kind,uuid) from public,anon,authenticated;
revoke all on function private.apply_content_snapshot(public.content_kind,uuid,jsonb,uuid) from public,anon,authenticated;

comment on column public.content_revisions.revises_published_content is
  'True when this proposal replaces a currently live version without taking that version offline during review.';
