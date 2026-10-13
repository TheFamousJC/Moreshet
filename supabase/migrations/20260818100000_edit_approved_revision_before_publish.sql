create or replace function public.amend_pending_content_revision(
  p_revision_id uuid,
  p_snapshot jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_revision public.content_revisions%rowtype;
  v_allowed_keys text[];
  v_revision_number integer;
  v_replacement_id uuid;
  v_original_translation_controls jsonb;
  v_proposed_translation_controls jsonb;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_revision
  from public.content_revisions
  where id = p_revision_id
  for update;

  if not found then
    raise exception 'Revision does not exist' using errcode = '23503';
  end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_revision.organization_id, array['administrator'::public.organization_role], v_actor)) then
    raise exception 'Only Administrators or the Super Admin may edit a submitted proposal inline' using errcode = '42501';
  end if;
  if v_revision.status not in ('pending_review', 'approved') then
    raise exception 'Only a pending or approved unpublished revision may be edited' using errcode = '55000';
  end if;
  if jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'Revision snapshot must be a JSON object' using errcode = '22023';
  end if;

  v_allowed_keys := case v_revision.content_kind
    when 'city'::public.content_kind then array['name','subtitle','description']::text[]
    when 'tour'::public.content_kind then array['title','subtitle','overview','completionMessage']::text[]
    when 'stop'::public.content_kind then array['name','hebrewName','address','shortDescription','fullDescription','transcript','historicalPeriod','tags','keyFacts','translations']::text[]
  end;

  if (v_revision.snapshot - v_allowed_keys) is distinct from (p_snapshot - v_allowed_keys) then
    raise exception 'Inline review editing may change text only; use the specialist CMS editor for GPS, order, category, access or identity changes' using errcode = '22023';
  end if;
  if v_revision.content_kind = 'stop' then
    if jsonb_typeof(coalesce(p_snapshot->'translations', '{}'::jsonb)) <> 'object' then
      raise exception 'Localized text must be a language-keyed object' using errcode = '22023';
    end if;
    select coalesce(jsonb_object_agg(language, translation - array['title','nativeName','shortDescription','fullDescription','transcript']::text[]), '{}'::jsonb)
      into v_original_translation_controls
    from jsonb_each(coalesce(v_revision.snapshot->'translations', '{}'::jsonb)) as localized(language, translation);
    select coalesce(jsonb_object_agg(language, translation - array['title','nativeName','shortDescription','fullDescription','transcript']::text[]), '{}'::jsonb)
      into v_proposed_translation_controls
    from jsonb_each(coalesce(p_snapshot->'translations', '{}'::jsonb)) as localized(language, translation);
    if v_original_translation_controls is distinct from v_proposed_translation_controls then
      raise exception 'Inline review editing cannot change pronunciation or other localized control data' using errcode = '22023';
    end if;
  end if;
  if p_snapshot is not distinct from v_revision.snapshot then
    raise exception 'No text changes were made' using errcode = '22023';
  end if;
  if (v_revision.content_kind = 'city' and nullif(btrim(p_snapshot->>'name'), '') is null)
     or (v_revision.content_kind = 'tour' and nullif(btrim(p_snapshot->>'title'), '') is null)
     or (v_revision.content_kind = 'stop' and nullif(btrim(p_snapshot->>'name'), '') is null) then
    raise exception 'The title or destination name cannot be empty' using errcode = '22023';
  end if;

  if v_revision.status = 'approved' then
    update public.content_revisions
    set status = 'changes_requested'
    where id = v_revision.id;
    insert into public.audit_log (
      organization_id, actor_user_id, actor_role, action, entity_type, entity_id, before_summary, after_summary
    ) values (
      v_revision.organization_id,
      v_actor,
      case when private.is_super_admin(v_actor) then 'super_admin' else 'administrator' end,
      'withdraw_approval_for_amendment',
      'content_revision',
      v_revision.id,
      jsonb_build_object('status', 'approved'),
      jsonb_build_object('status', 'changes_requested', 'reason', 'Last-minute text amendment before publication')
    );
  else
    insert into public.review_decisions (organization_id, revision_id, decision, notes, reviewer_user_id)
    values (
      v_revision.organization_id,
      v_revision.id,
      'changes_requested',
      'Superseded by an inline text amendment in the review screen.',
      v_actor
    );
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_revision_number
  from public.content_revisions
  where organization_id = v_revision.organization_id
    and content_kind = v_revision.content_kind
    and content_id = v_revision.content_id;

  insert into public.content_revisions (
    organization_id, content_kind, content_id, revision_number, snapshot,
    status, source, author_user_id, submitted_at, revises_published_content
  ) values (
    v_revision.organization_id, v_revision.content_kind, v_revision.content_id,
    v_revision_number, p_snapshot, 'pending_review', 'human', v_actor, now(),
    v_revision.revises_published_content
  ) returning id into v_replacement_id;

  if not v_revision.revises_published_content then
    perform private.set_content_status(v_revision.content_kind, v_revision.content_id, 'pending_review');
  end if;

  return v_replacement_id;
end;
$$;

comment on function public.amend_pending_content_revision(uuid, jsonb) is
  'Creates an audited replacement revision when an Administrator or Super Admin edits pending or approved-unpublished proposal text; an amended approval must be reviewed again and non-text workflow fields remain immutable.';
