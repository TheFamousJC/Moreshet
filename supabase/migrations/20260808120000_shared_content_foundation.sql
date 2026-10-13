-- Tudela Global Stage 4A: shared CMS content, publishing workflow and tenant security.

create type public.content_status as enum (
  'draft',
  'pending_review',
  'changes_requested',
  'approved',
  'published',
  'archived'
);

create type public.content_kind as enum ('city', 'tour', 'stop');
create type public.content_source as enum ('human', 'ai_assisted', 'import');
create type public.review_decision_type as enum ('approved', 'changes_requested', 'rejected');
create type public.media_kind as enum ('image', 'audio', 'video', 'document');
create type public.media_validation_status as enum ('pending', 'approved', 'rejected', 'quarantined');
create type public.tour_access_mode as enum ('free', 'paid', 'subscription');
create type public.tour_difficulty as enum ('easy', 'moderate', 'challenging');
create type public.interest_key as enum (
  'synagogue',
  'juderia',
  'holocaust',
  'legends',
  'scholar',
  'personalities',
  'monument',
  'cemetery',
  'mikveh',
  'historic_sites'
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  kind public.media_kind not null,
  storage_bucket text not null default 'tour-media',
  object_path text not null,
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null,
  width_pixels integer,
  height_pixels integer,
  duration_seconds integer,
  checksum_sha256 text,
  alt_text text,
  validation_status public.media_validation_status not null default 'pending',
  validation_notes text,
  uploaded_by uuid not null references auth.users (id) on delete restrict,
  validated_by uuid references auth.users (id) on delete restrict,
  validated_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_org_id_unique unique (organization_id, id),
  constraint media_assets_object_unique unique (storage_bucket, object_path),
  constraint media_assets_object_path_format check (
    object_path = btrim(object_path)
    and object_path <> ''
    and object_path !~ '(^|/)\.\.(/|$)'
  ),
  constraint media_assets_filename_length check (char_length(btrim(original_filename)) between 1 and 255),
  constraint media_assets_mime_type_length check (char_length(btrim(mime_type)) between 3 and 150),
  constraint media_assets_byte_size check (byte_size > 0 and byte_size <= 52428800),
  constraint media_assets_width check (width_pixels is null or width_pixels > 0),
  constraint media_assets_height check (height_pixels is null or height_pixels > 0),
  constraint media_assets_duration check (duration_seconds is null or duration_seconds >= 0),
  constraint media_assets_alt_length check (alt_text is null or char_length(alt_text) <= 500),
  constraint media_assets_validation_pair check (
    (validated_at is null and validated_by is null)
    or (validated_at is not null and validated_by is not null)
  )
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  slug text not null,
  country_name text not null,
  country_code text not null,
  flag_emoji text,
  center_latitude double precision not null,
  center_longitude double precision not null,
  source_language public.supported_language not null default 'en',
  hero_media_id uuid,
  status public.content_status not null default 'draft',
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cities_org_id_unique unique (organization_id, id),
  constraint cities_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint cities_country_name_length check (char_length(btrim(country_name)) between 2 and 100),
  constraint cities_country_code_format check (country_code ~ '^[A-Z]{2}$'),
  constraint cities_latitude check (center_latitude between -90 and 90),
  constraint cities_longitude check (center_longitude between -180 and 180),
  constraint cities_hero_media_fk foreign key (organization_id, hero_media_id)
    references public.media_assets (organization_id, id) on delete restrict
);

create unique index cities_org_slug_key on public.cities (organization_id, lower(slug));

create table public.city_translations (
  organization_id uuid not null,
  city_id uuid not null,
  language public.supported_language not null,
  name text not null,
  subtitle text,
  description text not null,
  status public.content_status not null default 'draft',
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (city_id, language),
  constraint city_translations_org_city_language_unique unique (organization_id, city_id, language),
  constraint city_translations_city_fk foreign key (organization_id, city_id)
    references public.cities (organization_id, id) on delete cascade,
  constraint city_translations_name_length check (char_length(btrim(name)) between 1 and 150),
  constraint city_translations_subtitle_length check (subtitle is null or char_length(subtitle) <= 250),
  constraint city_translations_description_length check (char_length(btrim(description)) between 1 and 20000)
);

create table public.tours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  city_id uuid not null,
  slug text not null,
  source_language public.supported_language not null default 'en',
  estimated_duration_minutes integer,
  distance_metres integer,
  difficulty public.tour_difficulty not null default 'easy',
  wheelchair_accessible boolean not null default false,
  access_mode public.tour_access_mode not null default 'free',
  hero_media_id uuid,
  status public.content_status not null default 'draft',
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tours_org_id_unique unique (organization_id, id),
  constraint tours_city_fk foreign key (organization_id, city_id)
    references public.cities (organization_id, id) on delete restrict,
  constraint tours_hero_media_fk foreign key (organization_id, hero_media_id)
    references public.media_assets (organization_id, id) on delete restrict,
  constraint tours_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint tours_duration check (estimated_duration_minutes is null or estimated_duration_minutes between 1 and 1440),
  constraint tours_distance check (distance_metres is null or distance_metres >= 0)
);

create unique index tours_org_slug_key on public.tours (organization_id, lower(slug));
create index tours_city_status_idx on public.tours (city_id, status);

create table public.tour_translations (
  organization_id uuid not null,
  tour_id uuid not null,
  language public.supported_language not null,
  title text not null,
  subtitle text,
  overview text not null,
  completion_message text,
  status public.content_status not null default 'draft',
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tour_id, language),
  constraint tour_translations_org_tour_language_unique unique (organization_id, tour_id, language),
  constraint tour_translations_tour_fk foreign key (organization_id, tour_id)
    references public.tours (organization_id, id) on delete cascade,
  constraint tour_translations_title_length check (char_length(btrim(title)) between 1 and 180),
  constraint tour_translations_subtitle_length check (subtitle is null or char_length(subtitle) <= 250),
  constraint tour_translations_overview_length check (char_length(btrim(overview)) between 1 and 30000),
  constraint tour_translations_completion_length check (completion_message is null or char_length(completion_message) <= 2000)
);

create table public.stops (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  city_id uuid not null,
  slug text not null,
  interest public.interest_key not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  geocoding_provider text,
  geocoding_confidence numeric(5,4),
  geocoding_display_name text,
  source_language public.supported_language not null default 'en',
  hero_media_id uuid,
  arrival_radius_metres integer not null default 40,
  estimated_visit_minutes integer,
  audio_duration_seconds integer,
  historical_period text,
  wheelchair_accessible boolean not null default false,
  status public.content_status not null default 'draft',
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stops_org_id_unique unique (organization_id, id),
  constraint stops_city_fk foreign key (organization_id, city_id)
    references public.cities (organization_id, id) on delete restrict,
  constraint stops_hero_media_fk foreign key (organization_id, hero_media_id)
    references public.media_assets (organization_id, id) on delete restrict,
  constraint stops_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint stops_latitude check (latitude between -90 and 90),
  constraint stops_longitude check (longitude between -180 and 180),
  constraint stops_geocoding_confidence check (geocoding_confidence is null or geocoding_confidence between 0 and 1),
  constraint stops_arrival_radius check (arrival_radius_metres between 5 and 1000),
  constraint stops_visit_duration check (estimated_visit_minutes is null or estimated_visit_minutes between 1 and 1440),
  constraint stops_audio_duration check (audio_duration_seconds is null or audio_duration_seconds >= 0)
);

create unique index stops_org_slug_key on public.stops (organization_id, lower(slug));
create index stops_city_interest_status_idx on public.stops (city_id, interest, status);

create table public.stop_translations (
  organization_id uuid not null,
  stop_id uuid not null,
  language public.supported_language not null,
  title text not null,
  native_name text,
  short_description text not null,
  narrative text not null,
  audio_transcript text,
  status public.content_status not null default 'draft',
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (stop_id, language),
  constraint stop_translations_org_stop_language_unique unique (organization_id, stop_id, language),
  constraint stop_translations_stop_fk foreign key (organization_id, stop_id)
    references public.stops (organization_id, id) on delete cascade,
  constraint stop_translations_title_length check (char_length(btrim(title)) between 1 and 180),
  constraint stop_translations_native_name_length check (native_name is null or char_length(native_name) <= 180),
  constraint stop_translations_short_length check (char_length(btrim(short_description)) between 1 and 1000),
  constraint stop_translations_narrative_length check (char_length(btrim(narrative)) between 1 and 50000),
  constraint stop_translations_transcript_length check (audio_transcript is null or char_length(audio_transcript) <= 60000)
);

create table public.tour_stops (
  organization_id uuid not null,
  tour_id uuid not null,
  stop_id uuid not null,
  position integer not null,
  arrival_radius_metres integer,
  walking_instructions text,
  is_required boolean not null default true,
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tour_id, stop_id),
  constraint tour_stops_org_tour_stop_unique unique (organization_id, tour_id, stop_id),
  constraint tour_stops_tour_position_unique unique (tour_id, position),
  constraint tour_stops_tour_fk foreign key (organization_id, tour_id)
    references public.tours (organization_id, id) on delete cascade,
  constraint tour_stops_stop_fk foreign key (organization_id, stop_id)
    references public.stops (organization_id, id) on delete restrict,
  constraint tour_stops_position check (position between 1 and 1000),
  constraint tour_stops_arrival_radius check (arrival_radius_metres is null or arrival_radius_metres between 5 and 1000),
  constraint tour_stops_instructions_length check (walking_instructions is null or char_length(walking_instructions) <= 3000)
);

create table public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  content_kind public.content_kind not null,
  content_id uuid not null,
  revision_number integer not null,
  snapshot jsonb not null,
  status public.content_status not null default 'draft',
  source public.content_source not null default 'human',
  author_user_id uuid not null references auth.users (id) on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_revisions_number_unique unique (organization_id, content_kind, content_id, revision_number),
  constraint content_revisions_org_id_unique unique (organization_id, id),
  constraint content_revisions_number check (revision_number > 0),
  constraint content_revisions_snapshot_object check (jsonb_typeof(snapshot) = 'object')
);

create index content_revisions_entity_idx
  on public.content_revisions (organization_id, content_kind, content_id, revision_number desc);
create index content_revisions_review_queue_idx
  on public.content_revisions (organization_id, status, submitted_at)
  where status in ('pending_review', 'approved');

create table public.review_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  revision_id uuid not null,
  decision public.review_decision_type not null,
  notes text,
  reviewer_user_id uuid not null references auth.users (id) on delete restrict,
  decided_at timestamptz not null default now(),
  constraint review_decisions_revision_unique unique (revision_id),
  constraint review_decisions_revision_fk foreign key (organization_id, revision_id)
    references public.content_revisions (organization_id, id) on delete restrict,
  constraint review_decisions_notes_length check (notes is null or char_length(notes) <= 5000)
);

create index media_assets_org_status_idx on public.media_assets (organization_id, validation_status, created_at desc);
create index cities_org_status_idx on public.cities (organization_id, status, updated_at desc);
create index tours_org_status_idx on public.tours (organization_id, status, updated_at desc);
create index stops_org_status_idx on public.stops (organization_id, status, updated_at desc);
create index review_decisions_org_date_idx on public.review_decisions (organization_id, decided_at desc);

create or replace function private.content_material(p_row jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select p_row - array[
    'status', 'updated_by', 'updated_at', 'submitted_at', 'reviewed_by',
    'reviewed_at', 'published_by', 'published_at', 'archived_at'
  ];
$$;

create or replace function private.content_organization_id(
  p_kind public.content_kind,
  p_content_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  case p_kind
    when 'city' then select organization_id into v_organization_id from public.cities where id = p_content_id;
    when 'tour' then select organization_id into v_organization_id from public.tours where id = p_content_id;
    when 'stop' then select organization_id into v_organization_id from public.stops where id = p_content_id;
  end case;
  return v_organization_id;
end;
$$;

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
    when 'city' then update public.cities set status = p_status where id = p_content_id;
    when 'tour' then update public.tours set status = p_status where id = p_content_id;
    when 'stop' then update public.stops set status = p_status where id = p_content_id;
  end case;
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
  if v_actor is null then
    return new;
  end if;

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

  if v_is_super or v_is_admin then
    return new;
  end if;

  if v_is_editor then
    if old.status not in ('draft', 'changes_requested')
       or new.status not in ('draft', 'pending_review') then
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
    if not (
      (old.status = 'pending_review' and new.status in ('changes_requested', 'approved'))
      or (old.status = 'approved' and new.status = 'published')
    ) then
      raise exception 'Invalid Reviewer content transition from % to %', old.status, new.status using errcode = '42501';
    end if;
    if new.status in ('changes_requested', 'approved') then
      new.reviewed_by := v_actor;
      new.reviewed_at := now();
    elsif new.status = 'published' then
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
    if new.uploaded_by <> v_actor then
      raise exception 'Media uploader must match the signed-in user' using errcode = '42501';
    end if;
    if not (v_is_super or v_is_admin or v_is_editor) then
      raise exception 'Not authorized to create media metadata' using errcode = '42501';
    end if;
    if v_is_editor and new.validation_status <> 'pending' then
      raise exception 'Editors may upload pending media only' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.uploaded_by is distinct from old.uploaded_by then
    raise exception 'Media uploader is immutable' using errcode = '55000';
  end if;

  if v_is_super or v_is_admin or v_is_editor then
    if v_is_editor and new.validation_status is distinct from old.validation_status then
      raise exception 'Editors may not approve or reject media' using errcode = '42501';
    end if;
    return new;
  end if;

  if v_is_reviewer then
    if (to_jsonb(new) - array['validation_status','validation_notes','validated_by','validated_at','updated_at'])
       is distinct from
       (to_jsonb(old) - array['validation_status','validation_notes','validated_by','validated_at','updated_at']) then
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
    if new.created_by <> v_actor then
      raise exception 'Tour-stop creator must match the signed-in user' using errcode = '42501';
    end if;
    new.updated_by := v_actor;
    select status into v_tour_status from public.tours where id = new.tour_id;
  else
    if tg_op = 'UPDATE' then
      if new.created_by is distinct from old.created_by then
        raise exception 'Tour-stop creator is immutable' using errcode = '55000';
      end if;
      new.updated_by := v_actor;
    end if;
    select status into v_tour_status from public.tours where id = old.tour_id;
  end if;
  if v_tour_status = 'published' then
    raise exception 'Published tour ordering is immutable; create a new tour revision' using errcode = '55000';
  end if;
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
  if v_entity_organization_id is null then
    raise exception 'Content target does not exist' using errcode = '23503';
  end if;
  if v_entity_organization_id <> new.organization_id then
    raise exception 'Content revision organization does not match its target' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (
    new.organization_id is distinct from old.organization_id
    or new.content_kind is distinct from old.content_kind
    or new.content_id is distinct from old.content_id
    or new.revision_number is distinct from old.revision_number
    or new.snapshot is distinct from old.snapshot
    or new.source is distinct from old.source
    or new.author_user_id is distinct from old.author_user_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Revision identity and snapshot are immutable' using errcode = '55000';
  end if;
  return new;
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
  if not found or v_revision.organization_id <> new.organization_id then
    raise exception 'Revision does not belong to this organization' using errcode = '23503';
  end if;
  if new.reviewer_user_id <> auth.uid() then
    raise exception 'Reviewer identity must match the signed-in user' using errcode = '42501';
  end if;
  if not (
    private.is_super_admin()
    or private.has_org_role(new.organization_id, array['administrator'::public.organization_role, 'reviewer'::public.organization_role])
  ) then
    raise exception 'Only Reviewers, Administrators or the Super Admin may record review decisions' using errcode = '42501';
  end if;
  if v_revision.status <> 'pending_review' then
    raise exception 'Only pending revisions may be reviewed' using errcode = '55000';
  end if;

  v_target_status := case when new.decision = 'approved' then 'approved'::public.content_status else 'changes_requested'::public.content_status end;
  update public.content_revisions
  set status = v_target_status, reviewed_by = new.reviewer_user_id, reviewed_at = new.decided_at
  where id = new.revision_id;
  perform private.set_content_status(v_revision.content_kind, v_revision.content_id, v_target_status);
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
  v_actor uuid := auth.uid();
  v_organization_id uuid;
  v_revision_id uuid;
  v_revision_number integer;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_snapshot) <> 'object' then raise exception 'Revision snapshot must be a JSON object' using errcode = '22023'; end if;
  v_organization_id := private.content_organization_id(p_content_kind, p_content_id);
  if v_organization_id is null then raise exception 'Content target does not exist' using errcode = '23503'; end if;
  if not (
    private.is_super_admin(v_actor)
    or private.has_org_role(v_organization_id, array['administrator'::public.organization_role, 'editor'::public.organization_role], v_actor)
  ) then
    raise exception 'Only Editors, Administrators or the Super Admin may submit content' using errcode = '42501';
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_revision_number
  from public.content_revisions
  where organization_id = v_organization_id and content_kind = p_content_kind and content_id = p_content_id;

  insert into public.content_revisions (
    organization_id, content_kind, content_id, revision_number, snapshot, status, source, author_user_id
  ) values (
    v_organization_id, p_content_kind, p_content_id, v_revision_number, p_snapshot, 'draft', p_source, v_actor
  ) returning id into v_revision_id;

  update public.content_revisions set status = 'pending_review', submitted_at = now() where id = v_revision_id;
  perform private.set_content_status(p_content_kind, p_content_id, 'pending_review');
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
  v_actor uuid := auth.uid();
  v_revision public.content_revisions%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_revision from public.content_revisions where id = p_revision_id;
  if not found then raise exception 'Revision does not exist' using errcode = '23503'; end if;
  if not (
    private.is_super_admin(v_actor)
    or private.has_org_role(v_revision.organization_id, array['administrator'::public.organization_role, 'reviewer'::public.organization_role], v_actor)
  ) then
    raise exception 'Only Reviewers, Administrators or the Super Admin may publish content' using errcode = '42501';
  end if;
  if v_revision.status <> 'approved' then
    raise exception 'Only an approved revision may be published' using errcode = '55000';
  end if;

  update public.content_revisions
  set status = 'published', published_by = v_actor, published_at = now()
  where id = p_revision_id;
  perform private.set_content_status(v_revision.content_kind, v_revision.content_id, 'published');
end;
$$;

create or replace function private.audit_content_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_organization_id uuid;
  v_entity_id uuid;
  v_actor uuid := auth.uid();
  v_actor_role text := 'system';
begin
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;
  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  v_organization_id := coalesce(nullif(v_new ->> 'organization_id','')::uuid, nullif(v_old ->> 'organization_id','')::uuid);
  v_entity_id := coalesce(nullif(v_new ->> 'id','')::uuid, nullif(v_old ->> 'id','')::uuid, nullif(v_new ->> 'city_id','')::uuid, nullif(v_old ->> 'city_id','')::uuid, nullif(v_new ->> 'tour_id','')::uuid, nullif(v_old ->> 'tour_id','')::uuid, nullif(v_new ->> 'stop_id','')::uuid, nullif(v_old ->> 'stop_id','')::uuid);

  if v_actor is not null then
    if private.is_super_admin(v_actor) then v_actor_role := 'super_admin';
    else
      select role::text into v_actor_role from public.organization_memberships
      where organization_id = v_organization_id and user_id = v_actor and status = 'active' limit 1;
      v_actor_role := coalesce(v_actor_role, 'user');
    end if;
  end if;

  insert into public.audit_log (
    organization_id, actor_user_id, actor_role, action, entity_type, entity_id, before_summary, after_summary
  ) values (
    v_organization_id, v_actor, v_actor_role, lower(tg_op), tg_table_name, v_entity_id,
    case when v_old is null then null else jsonb_strip_nulls(jsonb_build_object('status',v_old->'status','slug',v_old->'slug','language',v_old->'language','position',v_old->'position','interest',v_old->'interest')) end,
    case when v_new is null then null else jsonb_strip_nulls(jsonb_build_object('status',v_new->'status','slug',v_new->'slug','language',v_new->'language','position',v_new->'position','interest',v_new->'interest')) end
  );
  return coalesce(new, old);
end;
$$;

-- Updated-at and workflow triggers.
create trigger media_assets_set_updated_at before update on public.media_assets for each row execute function private.set_updated_at();
create trigger cities_set_updated_at before update on public.cities for each row execute function private.set_updated_at();
create trigger city_translations_set_updated_at before update on public.city_translations for each row execute function private.set_updated_at();
create trigger tours_set_updated_at before update on public.tours for each row execute function private.set_updated_at();
create trigger tour_translations_set_updated_at before update on public.tour_translations for each row execute function private.set_updated_at();
create trigger stops_set_updated_at before update on public.stops for each row execute function private.set_updated_at();
create trigger stop_translations_set_updated_at before update on public.stop_translations for each row execute function private.set_updated_at();
create trigger tour_stops_set_updated_at before update on public.tour_stops for each row execute function private.set_updated_at();
create trigger content_revisions_set_updated_at before update on public.content_revisions for each row execute function private.set_updated_at();

create trigger media_assets_enforce_write before insert or update on public.media_assets for each row execute function private.enforce_media_write();
create trigger cities_enforce_write before insert or update on public.cities for each row execute function private.enforce_content_write();
create trigger city_translations_enforce_write before insert or update on public.city_translations for each row execute function private.enforce_content_write();
create trigger tours_enforce_write before insert or update on public.tours for each row execute function private.enforce_content_write();
create trigger tour_translations_enforce_write before insert or update on public.tour_translations for each row execute function private.enforce_content_write();
create trigger stops_enforce_write before insert or update on public.stops for each row execute function private.enforce_content_write();
create trigger stop_translations_enforce_write before insert or update on public.stop_translations for each row execute function private.enforce_content_write();
create trigger content_revisions_validate before insert or update on public.content_revisions for each row execute function private.validate_content_revision();
create trigger content_revisions_enforce_write before insert or update on public.content_revisions for each row execute function private.enforce_content_write();
create trigger tour_stops_enforce_write before insert or update or delete on public.tour_stops for each row execute function private.enforce_tour_stop_write();
create trigger review_decisions_apply before insert on public.review_decisions for each row execute function private.apply_review_decision();
create trigger review_decisions_append_only before update or delete on public.review_decisions for each row execute function private.prevent_append_only_mutation();

create trigger media_assets_audit after insert or update or delete on public.media_assets for each row execute function private.audit_content_change();
create trigger cities_audit after insert or update or delete on public.cities for each row execute function private.audit_content_change();
create trigger city_translations_audit after insert or update or delete on public.city_translations for each row execute function private.audit_content_change();
create trigger tours_audit after insert or update or delete on public.tours for each row execute function private.audit_content_change();
create trigger tour_translations_audit after insert or update or delete on public.tour_translations for each row execute function private.audit_content_change();
create trigger stops_audit after insert or update or delete on public.stops for each row execute function private.audit_content_change();
create trigger stop_translations_audit after insert or update or delete on public.stop_translations for each row execute function private.audit_content_change();
create trigger tour_stops_audit after insert or update or delete on public.tour_stops for each row execute function private.audit_content_change();
create trigger content_revisions_audit after insert or update on public.content_revisions for each row execute function private.audit_content_change();
create trigger review_decisions_audit after insert on public.review_decisions for each row execute function private.audit_content_change();

-- Row-level security.
alter table public.media_assets enable row level security;
alter table public.cities enable row level security;
alter table public.city_translations enable row level security;
alter table public.tours enable row level security;
alter table public.tour_translations enable row level security;
alter table public.stops enable row level security;
alter table public.stop_translations enable row level security;
alter table public.tour_stops enable row level security;
alter table public.content_revisions enable row level security;
alter table public.review_decisions enable row level security;

create policy media_select_public_approved_or_staff on public.media_assets for select to anon, authenticated
using ((validation_status = 'approved' and deleted_at is null) or private.is_super_admin() or private.is_org_member(organization_id));
create policy media_insert_writer on public.media_assets for insert to authenticated
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role]));
create policy media_update_staff on public.media_assets for update to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]))
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]));

create policy cities_select_public_or_staff on public.cities for select to anon, authenticated
using (status = 'published' or private.is_super_admin() or private.is_org_member(organization_id));
create policy cities_insert_writer on public.cities for insert to authenticated
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role]));
create policy cities_update_staff on public.cities for update to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]))
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]));

create policy city_translations_select_public_or_staff on public.city_translations for select to anon, authenticated
using ((status = 'published' and exists (select 1 from public.cities c where c.id = city_id and c.status = 'published')) or private.is_super_admin() or private.is_org_member(organization_id));
create policy city_translations_insert_writer on public.city_translations for insert to authenticated
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role]));
create policy city_translations_update_staff on public.city_translations for update to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]))
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]));

create policy tours_select_public_or_staff on public.tours for select to anon, authenticated
using (status = 'published' or private.is_super_admin() or private.is_org_member(organization_id));
create policy tours_insert_writer on public.tours for insert to authenticated
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role]));
create policy tours_update_staff on public.tours for update to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]))
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]));

create policy tour_translations_select_public_or_staff on public.tour_translations for select to anon, authenticated
using ((status = 'published' and exists (select 1 from public.tours t where t.id = tour_id and t.status = 'published')) or private.is_super_admin() or private.is_org_member(organization_id));
create policy tour_translations_insert_writer on public.tour_translations for insert to authenticated
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role]));
create policy tour_translations_update_staff on public.tour_translations for update to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]))
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]));

create policy stops_select_public_or_staff on public.stops for select to anon, authenticated
using (status = 'published' or private.is_super_admin() or private.is_org_member(organization_id));
create policy stops_insert_writer on public.stops for insert to authenticated
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role]));
create policy stops_update_staff on public.stops for update to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]))
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]));

create policy stop_translations_select_public_or_staff on public.stop_translations for select to anon, authenticated
using ((status = 'published' and exists (select 1 from public.stops s where s.id = stop_id and s.status = 'published')) or private.is_super_admin() or private.is_org_member(organization_id));
create policy stop_translations_insert_writer on public.stop_translations for insert to authenticated
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role]));
create policy stop_translations_update_staff on public.stop_translations for update to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]))
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]));

create policy tour_stops_select_public_or_staff on public.tour_stops for select to anon, authenticated
using ((exists (select 1 from public.tours t where t.id = tour_id and t.status = 'published') and exists (select 1 from public.stops s where s.id = stop_id and s.status = 'published')) or private.is_super_admin() or private.is_org_member(organization_id));
create policy tour_stops_insert_writer on public.tour_stops for insert to authenticated
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role]));
create policy tour_stops_update_writer on public.tour_stops for update to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role]))
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role]));
create policy tour_stops_delete_writer on public.tour_stops for delete to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role]));

create policy revisions_select_staff on public.content_revisions for select to authenticated
using (private.is_super_admin() or private.is_org_member(organization_id));
create policy revisions_insert_writer on public.content_revisions for insert to authenticated
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role]));
create policy revisions_update_staff on public.content_revisions for update to authenticated
using (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]))
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'editor'::public.organization_role,'reviewer'::public.organization_role]));

create policy decisions_select_staff on public.review_decisions for select to authenticated
using (private.is_super_admin() or private.is_org_member(organization_id));
create policy decisions_insert_reviewer on public.review_decisions for insert to authenticated
with check (private.is_super_admin() or private.has_org_role(organization_id, array['administrator'::public.organization_role,'reviewer'::public.organization_role]));

grant select on public.media_assets, public.cities, public.city_translations, public.tours, public.tour_translations, public.stops, public.stop_translations, public.tour_stops to anon;
grant select, insert, update on public.media_assets, public.cities, public.city_translations, public.tours, public.tour_translations, public.stops, public.stop_translations, public.content_revisions to authenticated;
grant select, insert, update, delete on public.tour_stops to authenticated;
grant select, insert on public.review_decisions to authenticated;
grant execute on function public.submit_content_for_review(public.content_kind, uuid, jsonb, public.content_source) to authenticated;
grant execute on function public.publish_content_revision(uuid) to authenticated;

grant all on public.media_assets, public.cities, public.city_translations, public.tours, public.tour_translations, public.stops, public.stop_translations, public.tour_stops, public.content_revisions, public.review_decisions to service_role;

grant execute on function private.content_material(jsonb) to authenticated, service_role;
grant execute on function private.content_organization_id(public.content_kind, uuid) to authenticated, service_role;
revoke all on function private.set_content_status(public.content_kind, uuid, public.content_status) from public, anon, authenticated;
revoke all on function private.enforce_content_write() from public, anon, authenticated;
revoke all on function private.enforce_media_write() from public, anon, authenticated;
revoke all on function private.enforce_tour_stop_write() from public, anon, authenticated;
revoke all on function private.validate_content_revision() from public, anon, authenticated;
revoke all on function private.apply_review_decision() from public, anon, authenticated;
revoke all on function private.audit_content_change() from public, anon, authenticated;

comment on table public.cities is 'Tenant-owned city destinations. Public users see published rows only.';
comment on table public.tours is 'Tenant-owned tours linked to a city and controlled by the review workflow.';
comment on table public.stops is 'Reusable GPS tour stops using the same Interest vocabulary as Discovery.';
comment on table public.tour_stops is 'Ordered reusable stop assignments; one stop may belong to several tours.';
comment on table public.content_revisions is 'Immutable content snapshots submitted for human review and publication.';
comment on table public.review_decisions is 'Append-only Reviewer, Administrator or Super Admin decisions.';
