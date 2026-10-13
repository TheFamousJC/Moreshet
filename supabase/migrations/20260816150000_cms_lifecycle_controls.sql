-- Consistent CMS lifecycle controls: archive instead of destructive deletion,
-- recover archived workflow items, and keep one public narration per language.

create or replace function public.review_narration_asset(p_asset_id uuid,p_decision text,p_notes text default null)
returns void language plpgsql security definer set search_path=''
as $$
declare v_asset public.narration_assets; v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_asset from public.narration_assets where id=p_asset_id for update;
  if not found then raise exception 'Narration asset not found'; end if;

  if p_decision='pending_review' then
    if not (private.is_super_admin(v_actor) or private.has_org_role(v_asset.organization_id,array['administrator'::public.organization_role,'editor'::public.organization_role],v_actor)) then
      raise exception 'Editor access is required' using errcode='42501';
    end if;
    if v_asset.status not in ('generated','changes_requested') then raise exception 'Only generated or returned narration may be submitted'; end if;
    update public.narration_assets set status='pending_review',review_notes=null where id=p_asset_id;
  elsif p_decision in ('approved','changes_requested','published') then
    if not (private.is_super_admin(v_actor) or private.has_org_role(v_asset.organization_id,array['administrator'::public.organization_role,'reviewer'::public.organization_role],v_actor)) then
      raise exception 'Reviewer access is required' using errcode='42501';
    end if;
    if p_decision='approved' and v_asset.status<>'pending_review' then raise exception 'Only submitted narration may be approved'; end if;
    if p_decision='changes_requested' and (v_asset.status<>'pending_review' or nullif(btrim(p_notes),'') is null) then raise exception 'A submitted narration and review reason are required'; end if;
    if p_decision='published' and v_asset.status<>'approved' then raise exception 'Only approved narration may be published'; end if;
    if p_decision='published' then
      update public.narration_assets
      set status='superseded',review_notes='Automatically archived when a newer narration was published.'
      where organization_id=v_asset.organization_id and stop_id is not distinct from v_asset.stop_id
        and language=v_asset.language and status='published' and id<>p_asset_id;
    end if;
    update public.narration_assets set status=p_decision,review_notes=nullif(btrim(p_notes),''),reviewed_by=v_actor,reviewed_at=now(),published_by=case when p_decision='published' then v_actor else published_by end,published_at=case when p_decision='published' then now() else published_at end where id=p_asset_id;
  elsif p_decision='superseded' then
    if not (private.is_super_admin(v_actor) or private.has_org_role(v_asset.organization_id,array['administrator'::public.organization_role],v_actor)) then
      raise exception 'Administrator access is required to archive narration' using errcode='42501';
    end if;
    if v_asset.status='superseded' then raise exception 'Narration is already archived'; end if;
    update public.narration_assets set status='superseded',review_notes=coalesce(nullif(btrim(p_notes),''),'Archived by an administrator.') where id=p_asset_id;
  elsif p_decision='generated' then
    if not (private.is_super_admin(v_actor) or private.has_org_role(v_asset.organization_id,array['administrator'::public.organization_role],v_actor)) then
      raise exception 'Administrator access is required to restore narration' using errcode='42501';
    end if;
    if v_asset.status<>'superseded' then raise exception 'Only archived narration may be restored'; end if;
    update public.narration_assets set status='generated',review_notes=null,reviewed_by=null,reviewed_at=null,published_by=null,published_at=null where id=p_asset_id;
  else raise exception 'Unsupported narration decision';
  end if;
end;
$$;

create or replace function public.archive_content_revision(p_revision_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_revision public.content_revisions; v_actor uuid := auth.uid();
begin
  select * into v_revision from public.content_revisions where id=p_revision_id for update;
  if not found then raise exception 'Revision not found'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_revision.organization_id,array['administrator'::public.organization_role],v_actor)) then
    raise exception 'Only an Administrator or the Super Admin may archive a revision' using errcode='42501';
  end if;
  if v_revision.status not in ('pending_review','approved') then raise exception 'Only an active review proposal may be archived'; end if;
  update public.content_revisions set status='archived' where id=p_revision_id;
  if not v_revision.revises_published_content then perform private.set_content_status(v_revision.content_kind,v_revision.content_id,'draft'); end if;
end;
$$;

create or replace function public.restore_content_revision(p_revision_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_revision public.content_revisions; v_actor uuid := auth.uid(); v_status public.content_status;
begin
  select * into v_revision from public.content_revisions where id=p_revision_id for update;
  if not found then raise exception 'Revision not found'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_revision.organization_id,array['administrator'::public.organization_role],v_actor)) then
    raise exception 'Only an Administrator or the Super Admin may restore a revision' using errcode='42501';
  end if;
  if v_revision.status<>'archived' then raise exception 'Only an archived revision may be restored'; end if;
  select case when exists(select 1 from public.review_decisions d where d.revision_id=p_revision_id and d.decision='approved') then 'approved'::public.content_status else 'pending_review'::public.content_status end into v_status;
  update public.content_revisions set status=v_status where id=p_revision_id;
  if not v_revision.revises_published_content then perform private.set_content_status(v_revision.content_kind,v_revision.content_id,v_status); end if;
end;
$$;

create or replace function private.enforce_ai_source_write()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_actor uuid := auth.uid(); v_target_org uuid;
begin
  if auth.role()='service_role' then return new; end if;
  if v_actor is null then raise exception 'Sign in before changing AI sources' using errcode='42501'; end if;
  if tg_op='UPDATE' and new.status<>old.status then
    if (to_jsonb(new)-array['status','review_notes','reviewed_by','reviewed_at','updated_by','updated_at']) <> (to_jsonb(old)-array['status','review_notes','reviewed_by','reviewed_at','updated_by','updated_at']) then raise exception 'Review decisions may not alter source content'; end if;
    if new.status='pending_review' then
      if not (private.is_super_admin(v_actor) or private.has_org_role(old.organization_id,array['administrator'::public.organization_role,'editor'::public.organization_role],v_actor)) then raise exception 'Only Editors, Administrators or the Super Admin may submit AI sources' using errcode='42501'; end if;
    elsif new.status in ('disabled','draft') then
      if not (private.is_super_admin(v_actor) or private.has_org_role(old.organization_id,array['administrator'::public.organization_role],v_actor)) then raise exception 'Only an Administrator or the Super Admin may archive or restore a source' using errcode='42501'; end if;
    elsif not (private.is_super_admin(v_actor) or private.has_org_role(old.organization_id,array['administrator'::public.organization_role,'reviewer'::public.organization_role],v_actor)) then raise exception 'Only Reviewers, Administrators or the Super Admin may review AI sources' using errcode='42501'; end if;
    if not ((old.status in ('draft','changes_requested') and new.status='pending_review') or (old.status='pending_review' and new.status in ('published','changes_requested')) or new.status='disabled' or (old.status='disabled' and new.status='draft')) then raise exception 'Invalid AI source workflow transition'; end if;
    return new;
  end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(new.organization_id,array['administrator'::public.organization_role,'editor'::public.organization_role],v_actor)) then raise exception 'Only Editors, Administrators or the Super Admin may edit AI sources' using errcode='42501'; end if;
  if tg_op='INSERT' then
    new.status:='draft'; new.created_by:=v_actor; new.updated_by:=v_actor; new.reviewed_by:=null; new.reviewed_at:=null; new.review_notes:=null;
  else
    if new.organization_id<>old.organization_id or new.id<>old.id then raise exception 'AI source identity cannot be changed'; end if;
    if old.status not in ('draft','changes_requested') or new.status<>old.status then raise exception 'Published or submitted sources cannot be edited; create a revised draft' using errcode='42501'; end if;
    new.updated_by:=v_actor; new.reviewed_by:=null; new.reviewed_at:=null;
  end if;
  if new.city_id is not null then select organization_id into v_target_org from public.cities where id=new.city_id; end if;
  if new.tour_id is not null then select organization_id into v_target_org from public.tours where id=new.tour_id; end if;
  if new.stop_id is not null then select organization_id into v_target_org from public.stops where id=new.stop_id; end if;
  if new.scope_type<>'organization' and v_target_org is distinct from new.organization_id then raise exception 'The selected scope must belong to the same organization'; end if;
  return new;
end;
$$;

create or replace function public.review_ai_source(p_source_id uuid,p_decision text,p_notes text default null)
returns void language plpgsql security definer set search_path=''
as $$
declare v_source public.ai_sources; v_actor uuid := auth.uid(); v_status text;
begin
  select * into v_source from public.ai_sources where id=p_source_id for update;
  if not found then raise exception 'AI source not found'; end if;
  if p_decision='draft' then
    if not (private.is_super_admin(v_actor) or private.has_org_role(v_source.organization_id,array['administrator'::public.organization_role],v_actor)) then raise exception 'Only an Administrator or the Super Admin may restore a source' using errcode='42501'; end if;
    if v_source.status<>'disabled' then raise exception 'Only an archived source may be restored'; end if;
    v_status:='draft';
  else
    if not (private.is_super_admin(v_actor) or private.has_org_role(v_source.organization_id,array['administrator'::public.organization_role,'reviewer'::public.organization_role],v_actor)) then raise exception 'Only Reviewers, Administrators or the Super Admin may review AI sources' using errcode='42501'; end if;
    if p_decision='published' then if v_source.status<>'pending_review' then raise exception 'Only a submitted source may be published'; end if; v_status:='published';
    elsif p_decision='changes_requested' then if v_source.status<>'pending_review' then raise exception 'Only a submitted source may be returned'; end if; if nullif(btrim(p_notes),'') is null then raise exception 'Explain the changes required'; end if; v_status:='changes_requested';
    elsif p_decision='disabled' then if not (private.is_super_admin(v_actor) or private.has_org_role(v_source.organization_id,array['administrator'::public.organization_role],v_actor)) then raise exception 'Only an Administrator or the Super Admin may archive a source' using errcode='42501'; end if; v_status:='disabled';
    else raise exception 'Unsupported AI source decision'; end if;
  end if;
  update public.ai_sources set status=v_status,review_notes=case when v_status='draft' then null else nullif(btrim(p_notes),'') end,reviewed_by=case when v_status='draft' then null else v_actor end,reviewed_at=case when v_status='draft' then null else now() end,updated_by=v_actor,updated_at=now() where id=p_source_id;
end;
$$;

grant execute on function public.archive_content_revision(uuid) to authenticated;
grant execute on function public.restore_content_revision(uuid) to authenticated;

comment on function public.archive_content_revision(uuid) is 'Archives an active proposal without deleting its audit history or changing already published visitor content.';
comment on function public.restore_content_revision(uuid) is 'Restores an archived proposal to its previous review stage.';
