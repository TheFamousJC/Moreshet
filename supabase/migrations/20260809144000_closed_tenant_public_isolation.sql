-- Closed or suspended organizations must never expose formerly published rows to anonymous clients.

create or replace function private.is_public_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(select 1 from public.organizations where id=p_organization_id and status in ('trial','active'));
$$;

drop policy if exists media_select_public_approved_or_staff on public.media_assets;
create policy media_select_public_approved_or_staff on public.media_assets for select to anon,authenticated
using ((validation_status='approved' and deleted_at is null and private.is_public_organization(organization_id)) or private.is_super_admin() or private.is_org_member(organization_id));

drop policy if exists cities_select_public_or_staff on public.cities;
create policy cities_select_public_or_staff on public.cities for select to anon,authenticated
using ((status='published' and private.is_public_organization(organization_id)) or private.is_super_admin() or private.is_org_member(organization_id));

drop policy if exists city_translations_select_public_or_staff on public.city_translations;
create policy city_translations_select_public_or_staff on public.city_translations for select to anon,authenticated
using ((status='published' and private.is_public_organization(organization_id) and exists(select 1 from public.cities c where c.id=city_id and c.status='published')) or private.is_super_admin() or private.is_org_member(organization_id));

drop policy if exists tours_select_public_or_staff on public.tours;
create policy tours_select_public_or_staff on public.tours for select to anon,authenticated
using ((status='published' and private.is_public_organization(organization_id)) or private.is_super_admin() or private.is_org_member(organization_id));

drop policy if exists tour_translations_select_public_or_staff on public.tour_translations;
create policy tour_translations_select_public_or_staff on public.tour_translations for select to anon,authenticated
using ((status='published' and private.is_public_organization(organization_id) and exists(select 1 from public.tours t where t.id=tour_id and t.status='published')) or private.is_super_admin() or private.is_org_member(organization_id));

drop policy if exists stops_select_public_or_staff on public.stops;
create policy stops_select_public_or_staff on public.stops for select to anon,authenticated
using ((status='published' and private.is_public_organization(organization_id)) or private.is_super_admin() or private.is_org_member(organization_id));

drop policy if exists stop_translations_select_public_or_staff on public.stop_translations;
create policy stop_translations_select_public_or_staff on public.stop_translations for select to anon,authenticated
using ((status='published' and private.is_public_organization(organization_id) and exists(select 1 from public.stops s where s.id=stop_id and s.status='published')) or private.is_super_admin() or private.is_org_member(organization_id));

drop policy if exists tour_stops_select_public_or_staff on public.tour_stops;
create policy tour_stops_select_public_or_staff on public.tour_stops for select to anon,authenticated
using ((private.is_public_organization(organization_id) and exists(select 1 from public.tours t where t.id=tour_id and t.status='published') and exists(select 1 from public.stops s where s.id=stop_id and s.status='published')) or private.is_super_admin() or private.is_org_member(organization_id));

revoke all on function private.is_public_organization(uuid) from public;
grant execute on function private.is_public_organization(uuid) to anon,authenticated;

comment on function private.is_public_organization(uuid) is 'Central public-delivery guard requiring an active or trial organization.';
