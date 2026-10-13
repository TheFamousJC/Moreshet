-- Tudela Global Stage 5: reviewed AI sources and append-only AI usage records.

create table public.ai_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  source_type text not null default 'web' check (source_type in ('institution','web','document','book','article','archive')),
  url text,
  citation_label text not null,
  author text,
  publisher text,
  publication_date date,
  rights_status text not null default 'unknown' check (rights_status in ('public_domain','licensed','permission_granted','link_only','unknown')),
  verification_notes text,
  evidence_text text,
  scope_type text not null default 'organization' check (scope_type in ('organization','city','tour','stop')),
  city_id uuid references public.cities(id) on delete restrict,
  tour_id uuid references public.tours(id) on delete restrict,
  stop_id uuid references public.stops(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','pending_review','changes_requested','published','disabled')),
  review_notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint ai_sources_name_not_empty check (char_length(btrim(name)) between 2 and 240),
  constraint ai_sources_citation_not_empty check (char_length(btrim(citation_label)) between 2 and 500),
  constraint ai_sources_url_http check (url is null or url ~* '^https?://'),
  constraint ai_sources_evidence_size check (evidence_text is null or char_length(evidence_text) <= 30000),
  constraint ai_sources_scope_target check (
    (scope_type='organization' and city_id is null and tour_id is null and stop_id is null) or
    (scope_type='city' and city_id is not null and tour_id is null and stop_id is null) or
    (scope_type='tour' and city_id is null and tour_id is not null and stop_id is null) or
    (scope_type='stop' and city_id is null and tour_id is null and stop_id is not null)
  )
);

create index ai_sources_org_status_idx on public.ai_sources (organization_id,status,updated_at desc);
create index ai_sources_city_idx on public.ai_sources (city_id) where city_id is not null;
create index ai_sources_tour_idx on public.ai_sources (tour_id) where tour_id is not null;
create index ai_sources_stop_idx on public.ai_sources (stop_id) where stop_id is not null;

create table public.ai_usage_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  request_id uuid not null default gen_random_uuid(),
  provider text not null,
  model text not null,
  mode text not null check (mode in ('simulator','live')),
  status text not null check (status in ('succeeded','rejected','failed')),
  request_characters integer not null default 0 check (request_characters >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  error_code text,
  created_at timestamptz not null default now()
);

create index ai_usage_events_org_created_idx on public.ai_usage_events (organization_id,created_at desc);
create index ai_usage_events_user_created_idx on public.ai_usage_events (user_id,created_at desc) where user_id is not null;

-- Owner-reviewed starter catalogue. These are approved reference links but contain no
-- copied evidence text, so they cannot by themselves ground specific public claims.
insert into public.ai_sources (
  organization_id,name,source_type,url,citation_label,rights_status,verification_notes,
  evidence_text,scope_type,status,created_by,updated_by,reviewed_by,reviewed_at,review_notes
)
select organization.id, source.name, source.source_type, source.url, source.citation_label,
  'link_only', source.verification_notes, null, 'organization', 'published',
  organization.created_by, organization.created_by, organization.created_by, now(),
  'Reviewed and approved by the Tudela Global owner on 11 August 2026.'
from public.organizations organization
cross join (values
  ('Totally Jewish Travel','web','https://www.totallyjewishtravel.com/','Totally Jewish Travel','Commercial kosher-travel directory supplied by the owner. Useful for current visitor services and travel discovery; independently verify historical claims.'),
  ('JewishGen','archive','https://www.jewishgen.org/','JewishGen – The Home of Jewish Genealogy','Genealogy and community-history research portal supplied by the owner.'),
  ('ANU – Museum of the Jewish People','institution','https://anumuseum.org.il/','ANU – Museum of the Jewish People','Museum and cultural institution supplied by the owner.'),
  ('Museum of Jewish Heritage – A Living Memorial to the Holocaust','institution','https://mjhnyc.org/','Museum of Jewish Heritage – A Living Memorial to the Holocaust','Museum and collections institution supplied by the owner.'),
  ('Jewish Heritage Lithuania','institution','https://www.jewish-heritage-lithuania.org/','Jewish Heritage Lithuania','Non-profit Lithuanian Jewish heritage and cultural-route resource supplied by the owner.'),
  ('SchUM Cities of Speyer, Worms and Mainz','institution','https://schumstaedte.de/en/','SchUM Cities of Speyer, Worms and Mainz','Official SchUM Cities heritage resource supplied by the owner.'),
  ('Jewish Cultural Heritage in Switzerland','institution','https://swissjews.ch/en/topics/culturalheritage/','Swiss Federation of Jewish Communities – Jewish Cultural Heritage in Switzerland','Cultural-heritage resource of the Swiss Federation of Jewish Communities supplied by the owner.'),
  ('European Routes of Jewish Heritage','institution','https://jewisheritage.org/european-routes/','European Routes of Jewish Heritage','European Jewish heritage cultural-routes network supplied by the owner.'),
  ('Jewish Heritage Europe – Countries Map','web','https://jewish-heritage-europe.eu/europe-map/','Jewish Heritage Europe – Countries Map','Country-by-country Jewish heritage news and resource map supplied by the owner.')
) as source(name,source_type,url,citation_label,verification_notes)
where organization.slug='tudela-global';

create or replace function private.enforce_ai_source_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target_org uuid;
begin
  if auth.role() = 'service_role' then return new; end if;
  if v_actor is null then raise exception 'Sign in before changing AI sources' using errcode='42501'; end if;
  if tg_op='UPDATE' and new.status <> old.status then
    if (to_jsonb(new)-array['status','review_notes','reviewed_by','reviewed_at','updated_by','updated_at']) <>
       (to_jsonb(old)-array['status','review_notes','reviewed_by','reviewed_at','updated_by','updated_at']) then
      raise exception 'Review decisions may not alter source content';
    end if;
    if new.status='pending_review' then
      if not (private.is_super_admin(v_actor) or private.has_org_role(old.organization_id,array['administrator'::public.organization_role,'editor'::public.organization_role],v_actor)) then
        raise exception 'Only Editors, Administrators or the Super Admin may submit AI sources' using errcode='42501';
      end if;
    elsif new.status='disabled' then
      if not (private.is_super_admin(v_actor) or private.has_org_role(old.organization_id,array['administrator'::public.organization_role],v_actor)) then
        raise exception 'Only an Administrator or the Super Admin may disable a source' using errcode='42501';
      end if;
    elsif not (private.is_super_admin(v_actor) or private.has_org_role(old.organization_id,array['administrator'::public.organization_role,'reviewer'::public.organization_role],v_actor)) then
      raise exception 'Only Reviewers, Administrators or the Super Admin may review AI sources' using errcode='42501';
    end if;
    if not ((old.status in ('draft','changes_requested') and new.status='pending_review') or
            (old.status='pending_review' and new.status in ('published','changes_requested')) or
            new.status='disabled') then
      raise exception 'Invalid AI source workflow transition';
    end if;
    return new;
  end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(new.organization_id,array['administrator'::public.organization_role,'editor'::public.organization_role],v_actor)) then
    raise exception 'Only Editors, Administrators or the Super Admin may edit AI sources' using errcode='42501';
  end if;
  if tg_op='INSERT' then
    new.status := 'draft'; new.created_by := v_actor; new.updated_by := v_actor;
    new.reviewed_by := null; new.reviewed_at := null; new.review_notes := null;
  else
    if new.organization_id <> old.organization_id or new.id <> old.id then raise exception 'AI source identity cannot be changed'; end if;
    if old.status not in ('draft','changes_requested') or new.status <> old.status then
      raise exception 'Published or submitted sources cannot be edited; create a revised draft' using errcode='42501';
    end if;
    new.updated_by := v_actor; new.reviewed_by := null; new.reviewed_at := null;
  end if;

  if new.city_id is not null then select organization_id into v_target_org from public.cities where id=new.city_id; end if;
  if new.tour_id is not null then select organization_id into v_target_org from public.tours where id=new.tour_id; end if;
  if new.stop_id is not null then select organization_id into v_target_org from public.stops where id=new.stop_id; end if;
  if new.scope_type <> 'organization' and v_target_org is distinct from new.organization_id then
    raise exception 'The selected scope must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.submit_ai_source(p_source_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_source public.ai_sources; v_actor uuid := auth.uid();
begin
  select * into v_source from public.ai_sources where id=p_source_id for update;
  if not found then raise exception 'AI source not found'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_source.organization_id,array['administrator'::public.organization_role,'editor'::public.organization_role],v_actor)) then
    raise exception 'Only Editors, Administrators or the Super Admin may submit AI sources' using errcode='42501';
  end if;
  if v_source.status not in ('draft','changes_requested') then raise exception 'Only a draft or returned source may be submitted'; end if;
  update public.ai_sources set status='pending_review',review_notes=null,updated_by=v_actor,updated_at=now() where id=p_source_id;
end;
$$;

create or replace function public.review_ai_source(p_source_id uuid,p_decision text,p_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_source public.ai_sources; v_actor uuid := auth.uid(); v_status text;
begin
  select * into v_source from public.ai_sources where id=p_source_id for update;
  if not found then raise exception 'AI source not found'; end if;
  if not (private.is_super_admin(v_actor) or private.has_org_role(v_source.organization_id,array['administrator'::public.organization_role,'reviewer'::public.organization_role],v_actor)) then
    raise exception 'Only Reviewers, Administrators or the Super Admin may review AI sources' using errcode='42501';
  end if;
  if p_decision='published' then
    if v_source.status <> 'pending_review' then raise exception 'Only a submitted source may be published'; end if;
    v_status := 'published';
  elsif p_decision='changes_requested' then
    if v_source.status <> 'pending_review' then raise exception 'Only a submitted source may be returned'; end if;
    if nullif(btrim(p_notes),'') is null then raise exception 'Explain the changes required'; end if;
    v_status := 'changes_requested';
  elsif p_decision='disabled' then
    if not (private.is_super_admin(v_actor) or private.has_org_role(v_source.organization_id,array['administrator'::public.organization_role],v_actor)) then
      raise exception 'Only an Administrator or the Super Admin may disable a source' using errcode='42501';
    end if;
    v_status := 'disabled';
  else raise exception 'Unsupported AI source decision';
  end if;
  update public.ai_sources set status=v_status,review_notes=nullif(btrim(p_notes),''),reviewed_by=v_actor,reviewed_at=now(),updated_by=v_actor,updated_at=now() where id=p_source_id;
end;
$$;

create trigger ai_sources_set_updated_at before update on public.ai_sources for each row execute function private.set_updated_at();
create trigger ai_sources_enforce_write before insert or update on public.ai_sources for each row execute function private.enforce_ai_source_write();
create trigger ai_sources_audit after insert or update on public.ai_sources for each row execute function private.audit_content_change();
create trigger ai_usage_events_append_only before update or delete on public.ai_usage_events for each row execute function private.prevent_append_only_mutation();

alter table public.ai_sources enable row level security;
alter table public.ai_usage_events enable row level security;

create policy ai_sources_select_public_or_staff on public.ai_sources for select to anon,authenticated
using ((status='published' and private.is_public_organization(organization_id)) or private.is_super_admin() or private.is_org_member(organization_id));
create policy ai_sources_insert_writer on public.ai_sources for insert to authenticated
with check (private.is_super_admin() or private.has_org_role(organization_id,array['administrator'::public.organization_role,'editor'::public.organization_role]));
create policy ai_sources_update_writer on public.ai_sources for update to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id,array['administrator'::public.organization_role,'editor'::public.organization_role]))
with check (private.is_super_admin() or private.has_org_role(organization_id,array['administrator'::public.organization_role,'editor'::public.organization_role]));
create policy ai_usage_events_select_admin on public.ai_usage_events for select to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id,array['administrator'::public.organization_role]));

grant select on public.ai_sources to anon;
grant select,insert,update on public.ai_sources to authenticated;
grant select on public.ai_usage_events to authenticated;
grant all on public.ai_sources,public.ai_usage_events to service_role;
grant usage,select on sequence public.ai_usage_events_id_seq to service_role;
grant execute on function public.submit_ai_source(uuid) to authenticated;
grant execute on function public.review_ai_source(uuid,text,text) to authenticated;
revoke all on function private.enforce_ai_source_write() from public,anon,authenticated;

comment on table public.ai_sources is 'Reviewed source catalogue used to ground Ask Herzl answers and citations.';
comment on table public.ai_usage_events is 'Append-only server-written AI usage records for quota and cost controls; prompts and answers are not stored.';
