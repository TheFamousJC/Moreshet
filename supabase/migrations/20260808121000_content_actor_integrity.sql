-- Stage 4A hardening applied after the initial local migration.

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

  v_organization_id := (to_jsonb(new) ->> 'organization_id')::uuid;
  v_is_super := private.is_super_admin(v_actor);
  v_is_admin := private.has_org_role(v_organization_id, array['administrator'::public.organization_role], v_actor);
  v_is_editor := private.has_org_role(v_organization_id, array['editor'::public.organization_role], v_actor);
  v_is_reviewer := private.has_org_role(v_organization_id, array['reviewer'::public.organization_role], v_actor);

  if tg_op = 'INSERT' then
    if to_jsonb(new) ? 'created_by' and (to_jsonb(new) ->> 'created_by')::uuid <> v_actor then
      raise exception 'Content creator must match the signed-in user' using errcode = '42501';
    end if;
    if to_jsonb(new) ? 'author_user_id' and (to_jsonb(new) ->> 'author_user_id')::uuid <> v_actor then
      raise exception 'Revision author must match the signed-in user' using errcode = '42501';
    end if;
    if not (v_is_super or v_is_admin or v_is_editor) then
      raise exception 'Only Editors, Administrators or the Super Admin may create content' using errcode = '42501';
    end if;
    if v_is_editor and new.status <> 'draft' then
      raise exception 'Editors may create draft content only' using errcode = '42501';
    end if;
    return new;
  end if;

  if (to_jsonb(new) ? 'created_by' and (to_jsonb(new) ->> 'created_by') is distinct from (to_jsonb(old) ->> 'created_by'))
     or (to_jsonb(new) ? 'author_user_id' and (to_jsonb(new) ->> 'author_user_id') is distinct from (to_jsonb(old) ->> 'author_user_id')) then
    raise exception 'Content creator and revision author are immutable' using errcode = '55000';
  end if;

  if old.status = 'published' and new.status = 'published'
     and private.content_material(to_jsonb(old)) is distinct from private.content_material(to_jsonb(new)) then
    raise exception 'Published content is immutable; create a new revision' using errcode = '55000';
  end if;
  if v_is_super or v_is_admin then return new; end if;

  if v_is_editor then
    if old.status not in ('draft', 'changes_requested') or new.status not in ('draft', 'pending_review') then
      raise exception 'Editors may edit drafts and submit them for review, but may not approve or publish' using errcode = '42501';
    end if;
    if new.status = 'pending_review' and old.status <> 'pending_review' then
      new.submitted_at := coalesce(new.submitted_at, now());
    end if;
    return new;
  end if;

  if v_is_reviewer then
    if private.content_material(to_jsonb(old)) is distinct from private.content_material(to_jsonb(new)) then
      raise exception 'Reviewers may change workflow state but may not edit content' using errcode = '42501';
    end if;
    if not ((old.status = 'pending_review' and new.status in ('changes_requested', 'approved')) or (old.status = 'approved' and new.status = 'published')) then
      raise exception 'Invalid Reviewer content transition from % to %', old.status, new.status using errcode = '42501';
    end if;
    if new.status in ('changes_requested', 'approved') then
      new.reviewed_by := v_actor;
      new.reviewed_at := now();
    else
      new.published_by := v_actor;
      new.published_at := now();
    end if;
    return new;
  end if;

  raise exception 'User is not authorized to change organization content' using errcode = '42501';
end;
$$;

create or replace function private.enforce_media_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_is_super boolean;
  v_is_admin boolean;
  v_is_editor boolean;
  v_is_reviewer boolean;
begin
  if v_actor is null then return new; end if;
  v_is_super := private.is_super_admin(v_actor);
  v_is_admin := private.has_org_role(new.organization_id, array['administrator'::public.organization_role], v_actor);
  v_is_editor := private.has_org_role(new.organization_id, array['editor'::public.organization_role], v_actor);
  v_is_reviewer := private.has_org_role(new.organization_id, array['reviewer'::public.organization_role], v_actor);

  if tg_op = 'INSERT' then
    if new.uploaded_by <> v_actor then raise exception 'Media uploader must match the signed-in user' using errcode = '42501'; end if;
    if not (v_is_super or v_is_admin or v_is_editor) then raise exception 'Not authorized to create media metadata' using errcode = '42501'; end if;
    if v_is_editor and new.validation_status <> 'pending' then raise exception 'Editors may upload pending media only' using errcode = '42501'; end if;
    return new;
  end if;

  if new.uploaded_by is distinct from old.uploaded_by then raise exception 'Media uploader is immutable' using errcode = '55000'; end if;
  if v_is_super or v_is_admin or v_is_editor then
    if v_is_editor and new.validation_status is distinct from old.validation_status then raise exception 'Editors may not approve or reject media' using errcode = '42501'; end if;
    return new;
  end if;
  if v_is_reviewer then
    if (to_jsonb(new) - array['validation_status','validation_notes','validated_by','validated_at','updated_at']) is distinct from (to_jsonb(old) - array['validation_status','validation_notes','validated_by','validated_at','updated_at']) then
      raise exception 'Reviewers may validate media but may not edit its metadata' using errcode = '42501';
    end if;
    new.validated_by := v_actor;
    new.validated_at := now();
    return new;
  end if;
  raise exception 'Not authorized to change media metadata' using errcode = '42501';
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

drop trigger if exists tour_stops_enforce_write on public.tour_stops;
create trigger tour_stops_enforce_write
before insert or update or delete on public.tour_stops
for each row execute function private.enforce_tour_stop_write();

revoke all on function private.enforce_tour_stop_write() from public, anon, authenticated;
