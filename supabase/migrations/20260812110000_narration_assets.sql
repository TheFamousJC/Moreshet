-- Tudela Global Stage 5 Checkpoint 9: reviewed, reusable AI narration assets.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('narration-audio', 'narration-audio', false, 15728640, array['audio/mpeg'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table public.narration_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stop_id uuid references public.stops(id) on delete cascade,
  language text not null check (language in ('en','he','ru','fr','de','es')),
  provider text not null,
  model text not null,
  voice_name text not null,
  speaking_rate numeric(4,2) not null default 1 check (speaking_rate between 0.85 and 1.15),
  transcript_sha256 text not null check (transcript_sha256 ~ '^[0-9a-f]{64}$'),
  cache_key text not null check (cache_key ~ '^[0-9a-f]{64}$'),
  source_characters integer not null check (source_characters between 1 and 10000),
  storage_bucket text not null default 'narration-audio' check (storage_bucket='narration-audio'),
  object_path text not null,
  mime_type text not null default 'audio/mpeg' check (mime_type='audio/mpeg'),
  byte_size integer not null check (byte_size > 0 and byte_size <= 15728640),
  duration_seconds numeric(8,2) check (duration_seconds is null or duration_seconds > 0),
  status text not null default 'generated' check (status in ('generated','pending_review','changes_requested','approved','published','failed','superseded')),
  review_notes text,
  generated_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete restrict,
  published_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  published_at timestamptz,
  unique (organization_id, cache_key),
  unique (object_path)
);

create index narration_assets_stop_language_idx on public.narration_assets(stop_id,language,status,created_at desc);

create table public.narration_generation_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid references public.narration_assets(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  model text not null,
  characters integer not null check (characters >= 0),
  cache_hit boolean not null default false,
  status text not null check (status in ('succeeded','rejected','failed')),
  error_code text,
  created_at timestamptz not null default now()
);

create index narration_generation_events_org_created_idx on public.narration_generation_events(organization_id,created_at desc);

create trigger narration_assets_set_updated_at before update on public.narration_assets for each row execute function private.set_updated_at();
create trigger narration_assets_audit after insert or update on public.narration_assets for each row execute function private.audit_content_change();
create trigger narration_generation_events_append_only before update or delete on public.narration_generation_events for each row execute function private.prevent_append_only_mutation();

alter table public.narration_assets enable row level security;
alter table public.narration_generation_events enable row level security;

create policy narration_assets_staff_select on public.narration_assets for select to authenticated
using (private.is_super_admin() or private.is_org_member(organization_id));
create policy narration_assets_public_select on public.narration_assets for select to anon
using (status='published' and private.is_public_organization(organization_id));
create policy narration_generation_events_admin_select on public.narration_generation_events for select to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id,array['administrator'::public.organization_role]));

create policy narration_audio_staff_select on storage.objects for select to authenticated
using (bucket_id='narration-audio' and (private.is_super_admin() or private.is_org_member(private.storage_object_organization_id(name))));

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
    update public.narration_assets set status=p_decision,review_notes=nullif(btrim(p_notes),''),reviewed_by=v_actor,reviewed_at=now(),published_by=case when p_decision='published' then v_actor else published_by end,published_at=case when p_decision='published' then now() else published_at end where id=p_asset_id;
  else raise exception 'Unsupported narration decision';
  end if;
end;
$$;

grant select on public.narration_assets to anon,authenticated;
grant select on public.narration_generation_events to authenticated;
grant all on public.narration_assets,public.narration_generation_events to service_role;
grant usage,select on sequence public.narration_generation_events_id_seq to service_role;
grant execute on function public.review_narration_asset(uuid,text,text) to authenticated;

comment on table public.narration_assets is 'Cached AI-generated narration that must be reviewed before public playback.';
comment on table public.narration_generation_events is 'Append-only narration usage ledger for budget and cost monitoring.';
