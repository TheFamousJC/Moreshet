-- Tudela Global: identity, organizations, staff roles and audit foundation.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create type public.platform_role as enum ('super_admin', 'user');
create type public.profile_status as enum ('active', 'suspended', 'deletion_requested', 'anonymized');
create type public.supported_language as enum ('en', 'he', 'ru', 'fr', 'de', 'es');
create type public.organization_status as enum ('trial', 'active', 'suspended', 'closed');
create type public.organization_role as enum ('administrator', 'editor', 'reviewer');
create type public.membership_status as enum ('invited', 'active', 'suspended', 'removed');
create type public.security_action_type as enum (
  'force_password_reset',
  'temporary_password_issued',
  'sessions_revoked',
  'account_suspended',
  'account_reactivated',
  'mfa_reset'
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  platform_role public.platform_role not null default 'user',
  username text,
  username_normalized text generated always as (lower(btrim(username))) stored,
  display_name text,
  preferred_language public.supported_language not null default 'en',
  email_verified_at timestamptz,
  age_eligibility_confirmed_at timestamptz,
  status public.profile_status not null default 'active',
  password_reset_required boolean not null default false,
  last_active_at timestamptz not null default now(),
  deletion_notice_sent_at timestamptz,
  deletion_scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (username is null or char_length(btrim(username)) between 3 and 50),
  constraint profiles_display_name_length check (display_name is null or char_length(btrim(display_name)) between 1 and 100),
  constraint profiles_deletion_schedule_order check (
    deletion_scheduled_at is null
    or deletion_notice_sent_at is null
    or deletion_scheduled_at >= deletion_notice_sent_at
  )
);

create unique index profiles_username_normalized_key
  on public.profiles (username_normalized)
  where username_normalized is not null;

create index profiles_inactivity_idx
  on public.profiles (last_active_at)
  where status = 'active';

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status public.organization_status not null default 'trial',
  default_language public.supported_language not null default 'en',
  default_currency text not null default 'USD',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(btrim(name)) between 2 and 150),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_currency_format check (default_currency ~ '^[A-Z]{3}$')
);

create unique index organizations_slug_key on public.organizations (lower(slug));

create table public.organization_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  application_name text,
  logo_path text,
  brand_colors jsonb not null default '{}'::jsonb,
  enabled_languages public.supported_language[] not null default array['en'::public.supported_language],
  enabled_commercial_models text[] not null default array['free']::text[],
  feedback_enabled boolean not null default true,
  heritage_stories_enabled boolean not null default true,
  tips_enabled boolean not null default false,
  aggregate_analytics_only boolean not null default true,
  support_email text,
  legal_contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_settings_application_name_length check (
    application_name is null or char_length(btrim(application_name)) between 2 and 100
  ),
  constraint organization_settings_languages_not_empty check (cardinality(enabled_languages) > 0),
  constraint organization_settings_brand_colors_object check (jsonb_typeof(brand_colors) = 'object')
);

create table public.organization_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  hostname text not null,
  hostname_normalized text generated always as (lower(btrim(hostname))) stored,
  is_primary boolean not null default false,
  verification_token_hash bytea,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_domains_hostname_not_empty check (char_length(btrim(hostname)) between 3 and 253)
);

create unique index organization_domains_hostname_key on public.organization_domains (hostname_normalized);
create unique index organization_domains_one_primary_key
  on public.organization_domains (organization_id)
  where is_primary;
create index organization_domains_organization_idx on public.organization_domains (organization_id);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete restrict,
  role public.organization_role not null,
  status public.membership_status not null default 'invited',
  invited_by uuid not null references auth.users (id) on delete restrict,
  accepted_at timestamptz,
  suspended_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_unique_user unique (organization_id, user_id),
  constraint organization_memberships_active_accepted check (status <> 'active' or accepted_at is not null),
  constraint organization_memberships_suspended_time check (status <> 'suspended' or suspended_at is not null),
  constraint organization_memberships_removed_time check (status <> 'removed' or removed_at is not null)
);

create index organization_memberships_user_idx on public.organization_memberships (user_id, status);
create index organization_memberships_org_role_idx on public.organization_memberships (organization_id, role, status);

create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  proposed_username text,
  role public.organization_role not null,
  token_hash bytea not null,
  invited_by uuid not null references auth.users (id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint staff_invitations_email_normalized check (email = lower(btrim(email))),
  constraint staff_invitations_email_not_empty check (position('@' in email) > 1),
  constraint staff_invitations_username_length check (
    proposed_username is null or char_length(btrim(proposed_username)) between 3 and 50
  ),
  constraint staff_invitations_expiration_order check (expires_at > created_at),
  constraint staff_invitations_acceptance_pair check (
    (accepted_at is null and accepted_by is null)
    or (accepted_at is not null and accepted_by is not null)
  ),
  constraint staff_invitations_accept_or_revoke check (accepted_at is null or revoked_at is null)
);

create unique index staff_invitations_token_hash_key on public.staff_invitations (token_hash);
create unique index staff_invitations_one_active_email_key
  on public.staff_invitations (organization_id, email)
  where accepted_at is null and revoked_at is null;
create index staff_invitations_expiry_idx
  on public.staff_invitations (expires_at)
  where accepted_at is null and revoked_at is null;

create table public.account_security_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete restrict,
  target_user_id uuid not null references auth.users (id) on delete restrict,
  actor_user_id uuid references auth.users (id) on delete restrict,
  action public.security_action_type not null,
  reason text,
  safe_metadata jsonb not null default '{}'::jsonb,
  request_id uuid,
  created_at timestamptz not null default now(),
  constraint account_security_actions_metadata_object check (jsonb_typeof(safe_metadata) = 'object'),
  constraint account_security_actions_reason_length check (reason is null or char_length(reason) <= 1000)
);

create index account_security_actions_target_idx
  on public.account_security_actions (target_user_id, created_at desc);
create index account_security_actions_org_idx
  on public.account_security_actions (organization_id, created_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations (id) on delete restrict,
  actor_user_id uuid references auth.users (id) on delete restrict,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_summary jsonb,
  after_summary jsonb,
  request_id uuid,
  created_at timestamptz not null default now(),
  constraint audit_log_actor_role check (actor_role in ('system', 'super_admin', 'administrator', 'editor', 'reviewer', 'user')),
  constraint audit_log_action_not_empty check (char_length(btrim(action)) > 0),
  constraint audit_log_entity_type_not_empty check (char_length(btrim(entity_type)) > 0),
  constraint audit_log_before_object check (before_summary is null or jsonb_typeof(before_summary) = 'object'),
  constraint audit_log_after_object check (after_summary is null or jsonb_typeof(after_summary) = 'object')
);

create index audit_log_org_created_idx on public.audit_log (organization_id, created_at desc);
create index audit_log_actor_created_idx on public.audit_log (actor_user_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger organization_settings_set_updated_at
before update on public.organization_settings
for each row execute function private.set_updated_at();

create trigger organization_domains_set_updated_at
before update on public.organization_domains
for each row execute function private.set_updated_at();

create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row execute function private.set_updated_at();

create or replace function private.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_language public.supported_language := 'en';
begin
  if coalesce(new.raw_user_meta_data ->> 'preferred_language', '') in ('en', 'he', 'ru', 'fr', 'de', 'es') then
    v_language := (new.raw_user_meta_data ->> 'preferred_language')::public.supported_language;
  end if;

  insert into public.profiles (
    user_id,
    username,
    display_name,
    preferred_language,
    email_verified_at,
    age_eligibility_confirmed_at
  )
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'username'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    v_language,
    new.email_confirmed_at,
    case
      when coalesce((new.raw_user_meta_data ->> 'age_16_confirmed')::boolean, false) then now()
      else null
    end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_auth_user_created();

create or replace function private.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email_verified_at = new.email_confirmed_at
  where user_id = new.id
    and email_verified_at is distinct from new.email_confirmed_at;

  return new;
end;
$$;

create trigger on_auth_user_updated
after update of email_confirmed_at on auth.users
for each row execute function private.handle_auth_user_updated();

create or replace function private.is_super_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
      and p.platform_role = 'super_admin'
      and p.status = 'active'
  );
$$;

create or replace function private.has_org_role(
  p_organization_id uuid,
  p_roles public.organization_role[],
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.user_id = m.user_id
    where m.organization_id = p_organization_id
      and m.user_id = p_user_id
      and m.status = 'active'
      and m.role = any (p_roles)
      and p.status = 'active'
  );
$$;

create or replace function private.is_org_member(
  p_organization_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.user_id = m.user_id
    where m.organization_id = p_organization_id
      and m.user_id = p_user_id
      and m.status = 'active'
      and p.status = 'active'
  );
$$;

create or replace function private.prevent_append_only_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end;
$$;

create trigger account_security_actions_append_only
before update or delete on public.account_security_actions
for each row execute function private.prevent_append_only_mutation();

create trigger audit_log_append_only
before update or delete on public.audit_log
for each row execute function private.prevent_append_only_mutation();

create or replace function private.audit_identity_change()
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
  if tg_op <> 'DELETE' then
    v_new := to_jsonb(new) - array['token_hash', 'verification_token_hash', 'email', 'proposed_username'];
  end if;

  if tg_op <> 'INSERT' then
    v_old := to_jsonb(old) - array['token_hash', 'verification_token_hash', 'email', 'proposed_username'];
  end if;

  v_organization_id := coalesce(
    nullif(v_new ->> 'organization_id', '')::uuid,
    nullif(v_old ->> 'organization_id', '')::uuid,
    case when tg_table_name = 'organizations' then coalesce(nullif(v_new ->> 'id', '')::uuid, nullif(v_old ->> 'id', '')::uuid) end
  );

  v_entity_id := coalesce(
    nullif(v_new ->> 'id', '')::uuid,
    nullif(v_old ->> 'id', '')::uuid,
    v_organization_id
  );

  if v_actor is not null then
    if exists (
      select 1 from public.profiles p
      where p.user_id = v_actor and p.platform_role = 'super_admin' and p.status = 'active'
    ) then
      v_actor_role := 'super_admin';
    else
      select m.role::text
      into v_actor_role
      from public.organization_memberships m
      where m.organization_id = v_organization_id
        and m.user_id = v_actor
        and m.status = 'active'
      limit 1;

      v_actor_role := coalesce(v_actor_role, 'user');
    end if;
  end if;

  insert into public.audit_log (
    organization_id,
    actor_user_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    before_summary,
    after_summary
  )
  values (
    v_organization_id,
    v_actor,
    v_actor_role,
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    v_old,
    v_new
  );

  return coalesce(new, old);
end;
$$;

create trigger organizations_audit
after insert or update or delete on public.organizations
for each row execute function private.audit_identity_change();

create trigger organization_settings_audit
after insert or update or delete on public.organization_settings
for each row execute function private.audit_identity_change();

create trigger organization_domains_audit
after insert or update or delete on public.organization_domains
for each row execute function private.audit_identity_change();

create trigger organization_memberships_audit
after insert or update or delete on public.organization_memberships
for each row execute function private.audit_identity_change();

create trigger staff_invitations_audit
after insert or update or delete on public.staff_invitations
for each row execute function private.audit_identity_change();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.organization_domains enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.staff_invitations enable row level security;
alter table public.account_security_actions enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_select_own_or_super_admin
on public.profiles for select
to authenticated
using ((select auth.uid()) = user_id or (select private.is_super_admin()));

create policy profiles_update_own
on public.profiles for update
to authenticated
using ((select auth.uid()) = user_id and status = 'active')
with check ((select auth.uid()) = user_id and status = 'active');

create policy organizations_select_member_or_super_admin
on public.organizations for select
to authenticated
using ((select private.is_super_admin()) or (select private.is_org_member(id)));

create policy organizations_insert_super_admin
on public.organizations for insert
to authenticated
with check ((select private.is_super_admin()) and created_by = (select auth.uid()));

create policy organizations_update_administrator_or_super_admin
on public.organizations for update
to authenticated
using (
  (select private.is_super_admin())
  or (select private.has_org_role(id, array['administrator'::public.organization_role]))
)
with check (
  (select private.is_super_admin())
  or (select private.has_org_role(id, array['administrator'::public.organization_role]))
);

create policy organization_settings_select_member_or_super_admin
on public.organization_settings for select
to authenticated
using (
  (select private.is_super_admin())
  or (select private.is_org_member(organization_id))
);

create policy organization_settings_insert_administrator_or_super_admin
on public.organization_settings for insert
to authenticated
with check (
  (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
);

create policy organization_settings_update_administrator_or_super_admin
on public.organization_settings for update
to authenticated
using (
  (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
)
with check (
  (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
);

create policy organization_domains_select_member_or_super_admin
on public.organization_domains for select
to authenticated
using (
  (select private.is_super_admin())
  or (select private.is_org_member(organization_id))
);

create policy organization_domains_insert_administrator_or_super_admin
on public.organization_domains for insert
to authenticated
with check (
  (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
);

create policy organization_domains_update_administrator_or_super_admin
on public.organization_domains for update
to authenticated
using (
  (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
)
with check (
  (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
);

create policy organization_domains_delete_administrator_or_super_admin
on public.organization_domains for delete
to authenticated
using (
  (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
);

create policy memberships_select_self_administrator_or_super_admin
on public.organization_memberships for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
);

create policy memberships_insert_administrator_or_super_admin
on public.organization_memberships for insert
to authenticated
with check (
  invited_by = (select auth.uid())
  and (
    (select private.is_super_admin())
    or (
      role in ('editor', 'reviewer')
      and (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
    )
  )
);

create policy memberships_update_administrator_or_super_admin
on public.organization_memberships for update
to authenticated
using (
  (select private.is_super_admin())
  or (
    role in ('editor', 'reviewer')
    and (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
  )
)
with check (
  (select private.is_super_admin())
  or (
    role in ('editor', 'reviewer')
    and (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
  )
);

create policy invitations_select_administrator_or_super_admin
on public.staff_invitations for select
to authenticated
using (
  (select private.is_super_admin())
  or (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
);

create policy invitations_insert_administrator_or_super_admin
on public.staff_invitations for insert
to authenticated
with check (
  invited_by = (select auth.uid())
  and (
    (select private.is_super_admin())
    or (
      role in ('editor', 'reviewer')
      and (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
    )
  )
);

create policy invitations_update_administrator_or_super_admin
on public.staff_invitations for update
to authenticated
using (
  (select private.is_super_admin())
  or (
    role in ('editor', 'reviewer')
    and (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
  )
)
with check (
  (select private.is_super_admin())
  or (
    role in ('editor', 'reviewer')
    and (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
  )
);

create policy security_actions_select_administrator_or_super_admin
on public.account_security_actions for select
to authenticated
using (
  (select private.is_super_admin())
  or (
    organization_id is not null
    and (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
  )
);

create policy audit_log_select_administrator_or_super_admin
on public.audit_log for select
to authenticated
using (
  (select private.is_super_admin())
  or (
    organization_id is not null
    and (select private.has_org_role(organization_id, array['administrator'::public.organization_role]))
  )
);

grant usage on schema private to authenticated, service_role;
grant execute on function private.is_super_admin(uuid) to authenticated, service_role;
grant execute on function private.has_org_role(uuid, public.organization_role[], uuid) to authenticated, service_role;
grant execute on function private.is_org_member(uuid, uuid) to authenticated, service_role;

revoke all on function private.handle_auth_user_created() from public, anon, authenticated;
revoke all on function private.handle_auth_user_updated() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.prevent_append_only_mutation() from public, anon, authenticated;
revoke all on function private.audit_identity_change() from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant update (username, display_name, preferred_language, age_eligibility_confirmed_at) on public.profiles to authenticated;

grant select, insert on public.organizations to authenticated;
grant update (name, slug, default_language, default_currency) on public.organizations to authenticated;

grant select, insert on public.organization_settings to authenticated;
grant update (
  application_name,
  logo_path,
  brand_colors,
  enabled_languages,
  enabled_commercial_models,
  feedback_enabled,
  heritage_stories_enabled,
  tips_enabled,
  aggregate_analytics_only,
  support_email,
  legal_contact_email
) on public.organization_settings to authenticated;

grant select, insert, delete on public.organization_domains to authenticated;
grant update (hostname, is_primary, verification_token_hash, verified_at) on public.organization_domains to authenticated;

grant select, insert on public.organization_memberships to authenticated;
grant update (role, status, accepted_at, suspended_at, removed_at) on public.organization_memberships to authenticated;

grant select, insert on public.staff_invitations to authenticated;
grant update (accepted_at, accepted_by, revoked_at) on public.staff_invitations to authenticated;

grant select on public.account_security_actions to authenticated;
grant select on public.audit_log to authenticated;

grant all on public.profiles to service_role;
grant all on public.organizations to service_role;
grant all on public.organization_settings to service_role;
grant all on public.organization_domains to service_role;
grant all on public.organization_memberships to service_role;
grant all on public.staff_invitations to service_role;
grant select, insert on public.account_security_actions to service_role;
grant select, insert on public.audit_log to service_role;
grant usage, select on sequence public.audit_log_id_seq to service_role;

comment on table public.profiles is 'Private application profile paired one-to-one with auth.users.';
comment on column public.profiles.password_reset_required is 'Forces password replacement after a Super Admin temporary-password or reset operation.';
comment on table public.organization_memberships is 'A user may have one independent role in each organization.';
comment on table public.staff_invitations is 'Stores only a hash of each single-use staff invitation token.';
comment on table public.account_security_actions is 'Append-only security-operation record; passwords and temporary secrets are prohibited.';
comment on table public.audit_log is 'Append-only safe summaries of privileged administrative changes.';
