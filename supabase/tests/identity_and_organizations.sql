\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'ASSERTION FAILED: %', message;
  end if;
end;
$$;

create or replace function pg_temp.assert_raises(statement text, message text)
returns void
language plpgsql
as $$
begin
  begin
    execute statement;
  exception
    when others then
      return;
  end;

  raise exception 'ASSERTION FAILED: expected rejection: %', message;
end;
$$;

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'super@test.local', now(), '{}'::jsonb, '{"username":"test_super","age_16_confirmed":true}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin@test.local', now(), '{}'::jsonb, '{"username":"test_admin","age_16_confirmed":true}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'editor@test.local', now(), '{}'::jsonb, '{"username":"test_editor","age_16_confirmed":true}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'reviewer@test.local', now(), '{}'::jsonb, '{"username":"test_reviewer","age_16_confirmed":true}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'user@test.local', now(), '{}'::jsonb, '{"username":"test_user","age_16_confirmed":true}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'outsider@test.local', now(), '{}'::jsonb, '{"username":"test_outsider","age_16_confirmed":true}'::jsonb, now(), now());

select pg_temp.assert_true(
  (select count(*) = 6 from public.profiles where user_id::text like '00000000-0000-0000-0000-00000000000%'),
  'auth.users inserts must automatically create profiles'
);

update public.profiles
set platform_role = 'super_admin'
where user_id = '00000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

insert into public.organizations (
  id,
  name,
  slug,
  status,
  default_language,
  default_currency,
  created_by
)
values (
  '10000000-0000-0000-0000-000000000001',
  'Test Heritage Organization',
  'test-heritage-organization',
  'active',
  'en',
  'ILS',
  '00000000-0000-0000-0000-000000000001'
);

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  invited_by,
  accepted_at
)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'administrator',
  'active',
  '00000000-0000-0000-0000-000000000001',
  now()
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.organizations where id = '10000000-0000-0000-0000-000000000001'),
  'Super Admin must see the organization'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  invited_by,
  accepted_at
)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'editor', 'active', '00000000-0000-0000-0000-000000000002', now()),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'reviewer', 'active', '00000000-0000-0000-0000-000000000002', now());

insert into public.organization_settings (
  organization_id,
  application_name,
  enabled_languages,
  enabled_commercial_models,
  tips_enabled
)
values (
  '10000000-0000-0000-0000-000000000001',
  'Test Heritage App',
  array['en'::public.supported_language, 'he'::public.supported_language],
  array['free', 'tips'],
  true
);

select pg_temp.assert_true(
  (select count(*) = 3 from public.organization_memberships where organization_id = '10000000-0000-0000-0000-000000000001'),
  'Administrator must see organization staff memberships'
);

select pg_temp.assert_raises(
  $statement$
    insert into public.organization_memberships (
      organization_id, user_id, role, status, invited_by, accepted_at
    ) values (
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000005',
      'administrator',
      'active',
      '00000000-0000-0000-0000-000000000002',
      now()
    )
  $statement$,
  'Organization Administrator must not create another Administrator'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select pg_temp.assert_true(
  (select count(*) = 1 from public.organization_memberships where organization_id = '10000000-0000-0000-0000-000000000001'),
  'Editor must see only their own membership'
);

update public.organization_settings
set application_name = 'Editor must not change this'
where organization_id = '10000000-0000-0000-0000-000000000001';

select pg_temp.assert_true(
  (
    select application_name = 'Test Heritage App'
    from public.organization_settings
    where organization_id = '10000000-0000-0000-0000-000000000001'
  ),
  'Editor must not update organization settings'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
set local role authenticated;

select pg_temp.assert_true(
  (select count(*) = 1 from public.organization_memberships where organization_id = '10000000-0000-0000-0000-000000000001'),
  'Reviewer must see only their own membership'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
set local role authenticated;

select pg_temp.assert_true(
  (select count(*) = 0 from public.organizations where id = '10000000-0000-0000-0000-000000000001'),
  'Unassigned user must not see another organization'
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.profiles where user_id = '00000000-0000-0000-0000-000000000006'),
  'User must see their own profile'
);

select pg_temp.assert_true(
  (select count(*) = 0 from public.profiles where user_id = '00000000-0000-0000-0000-000000000002'),
  'User must not see another user private profile'
);

update public.profiles
set display_name = 'Test Outsider'
where user_id = '00000000-0000-0000-0000-000000000006';

select pg_temp.assert_raises(
  $statement$
    update public.profiles
    set platform_role = 'super_admin'
    where user_id = '00000000-0000-0000-0000-000000000006'
  $statement$,
  'User must not elevate their platform role'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select pg_temp.assert_true(
  (select count(*) >= 4 from public.audit_log where organization_id = '10000000-0000-0000-0000-000000000001'),
  'Organization administration changes must create audit entries'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.audit_log
    where organization_id = '10000000-0000-0000-0000-000000000001'
      and (
        coalesce(before_summary, '{}'::jsonb) ?| array['token_hash', 'verification_token_hash']
        or coalesce(after_summary, '{}'::jsonb) ?| array['token_hash', 'verification_token_hash']
      )
  ),
  'Audit summaries must not contain token hashes'
);

reset role;

select pg_temp.assert_raises(
  'update public.audit_log set action = ''tampered'' where organization_id = ''10000000-0000-0000-0000-000000000001''',
  'Audit log must be append-only'
);

rollback;

select 'identity_and_organizations authorization tests passed' as result;
