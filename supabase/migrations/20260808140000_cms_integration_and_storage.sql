-- Tudela Global Stage 4B: CMS integration helpers and private media storage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tour-media',
  'tour-media',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.storage_object_organization_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_first text;
begin
  v_first := split_part(p_name, '/', 1);
  if v_first ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return v_first::uuid;
  end if;
  return null;
end;
$$;

create policy tour_media_staff_select
on storage.objects for select to authenticated
using (
  bucket_id = 'tour-media'
  and (
    private.is_super_admin()
    or private.is_org_member(private.storage_object_organization_id(name))
  )
);

create policy tour_media_writer_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'tour-media'
  and (
    private.is_super_admin()
    or private.has_org_role(
      private.storage_object_organization_id(name),
      array['administrator'::public.organization_role,'editor'::public.organization_role]
    )
  )
);

create policy tour_media_writer_update
on storage.objects for update to authenticated
using (
  bucket_id = 'tour-media'
  and (
    private.is_super_admin()
    or private.has_org_role(
      private.storage_object_organization_id(name),
      array['administrator'::public.organization_role,'editor'::public.organization_role]
    )
  )
)
with check (
  bucket_id = 'tour-media'
  and (
    private.is_super_admin()
    or private.has_org_role(
      private.storage_object_organization_id(name),
      array['administrator'::public.organization_role,'editor'::public.organization_role]
    )
  )
);

create policy tour_media_administrator_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'tour-media'
  and (
    private.is_super_admin()
    or private.has_org_role(
      private.storage_object_organization_id(name),
      array['administrator'::public.organization_role]
    )
  )
);

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
  v_organization_id := private.content_organization_id(p_content_kind, p_content_id);
  if v_organization_id is null then raise exception 'Content does not exist' using errcode = '23503'; end if;
  if not (
    private.is_super_admin(v_actor)
    or private.has_org_role(v_organization_id, array['administrator'::public.organization_role], v_actor)
  ) then
    raise exception 'Only an Administrator or the Super Admin may archive content' using errcode = '42501';
  end if;
  perform private.set_content_status(p_content_kind, p_content_id, 'archived');
end;
$$;

grant execute on function public.archive_content(public.content_kind, uuid) to authenticated;
grant execute on function private.storage_object_organization_id(text) to authenticated, service_role;
revoke all on function private.set_content_status(public.content_kind, uuid, public.content_status) from public, anon, authenticated;

comment on function public.archive_content(public.content_kind, uuid) is 'Recoverable Administrator/Super Admin content removal used by the CMS.';
