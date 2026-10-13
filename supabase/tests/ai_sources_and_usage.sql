\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition,false) then raise exception 'ASSERTION FAILED: %',message; end if;
end;
$$;

create or replace function pg_temp.assert_raises(statement text, message text)
returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then return;
  end;
  raise exception 'ASSERTION FAILED: expected rejection: %',message;
end;
$$;

insert into auth.users (id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('00000000-0000-0000-0000-000000000201','authenticated','authenticated','ai-owner@test.local',now(),'{}','{"username":"ai_owner","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000202','authenticated','authenticated','ai-editor@test.local',now(),'{}','{"username":"ai_editor","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000203','authenticated','authenticated','ai-reviewer@test.local',now(),'{}','{"username":"ai_reviewer","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000204','authenticated','authenticated','ai-outsider@test.local',now(),'{}','{"username":"ai_outsider","age_16_confirmed":true}',now(),now());

update public.profiles set platform_role='super_admin' where user_id='00000000-0000-0000-0000-000000000201';

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000201","role":"authenticated"}',true);
set local role authenticated;
insert into public.organizations (id,name,slug,status,default_language,default_currency,created_by)
values ('10000000-0000-0000-0000-000000000201','AI Source Test Organization','ai-source-test','active','en','ILS','00000000-0000-0000-0000-000000000201');
insert into public.organization_memberships (organization_id,user_id,role,status,invited_by,accepted_at)
values
 ('10000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202','editor','active','00000000-0000-0000-0000-000000000201',now()),
 ('10000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000203','reviewer','active','00000000-0000-0000-0000-000000000201',now());

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000202","role":"authenticated"}',true);
set local role authenticated;
insert into public.ai_sources (id,organization_id,name,source_type,url,citation_label,rights_status,evidence_text,scope_type,status,created_by,updated_by)
values ('50000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000201','Test archive','archive','https://example.test/archive','Test Archive Collection','permission_granted','Verified test evidence.','organization','published','00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000202');
select pg_temp.assert_true((select status='draft' and created_by='00000000-0000-0000-0000-000000000202' from public.ai_sources where id='50000000-0000-0000-0000-000000000201'),'Editor insert must be forced to a draft owned by the actor');
select public.submit_ai_source('50000000-0000-0000-0000-000000000201');
select pg_temp.assert_true((select status='pending_review' from public.ai_sources where id='50000000-0000-0000-0000-000000000201'),'Editor must be able to submit a draft');
select pg_temp.assert_raises($q$update public.ai_sources set status='published' where id='50000000-0000-0000-0000-000000000201'$q$,'Editor must not publish an AI source');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000203","role":"authenticated"}',true);
set local role authenticated;
update public.ai_sources set evidence_text='Reviewer tampering' where id='50000000-0000-0000-0000-000000000201';
select pg_temp.assert_true((select evidence_text='Verified test evidence.' from public.ai_sources where id='50000000-0000-0000-0000-000000000201'),'Reviewer evidence edit must affect zero rows and leave evidence unchanged');
select public.review_ai_source('50000000-0000-0000-0000-000000000201','published','Approved test evidence');
select pg_temp.assert_true((select status='published' and reviewed_by='00000000-0000-0000-0000-000000000203' from public.ai_sources where id='50000000-0000-0000-0000-000000000201'),'Reviewer approval must publish and record the actor');
select pg_temp.assert_raises($q$select public.review_ai_source('50000000-0000-0000-0000-000000000201','disabled',null)$q$,'Reviewer must not archive a published AI source');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000201","role":"authenticated"}',true);
set local role authenticated;
select public.review_ai_source('50000000-0000-0000-0000-000000000201','disabled','Retained lifecycle test');
select pg_temp.assert_true((select status='disabled' from public.ai_sources where id='50000000-0000-0000-0000-000000000201'),'Super Admin must be able to archive an AI source');
select public.review_ai_source('50000000-0000-0000-0000-000000000201','draft',null);
select pg_temp.assert_true((select status='draft' and reviewed_by is null from public.ai_sources where id='50000000-0000-0000-0000-000000000201'),'Super Admin must be able to restore an archived AI source as a draft');

-- Republish only for the anonymous visibility assertion below.
select public.submit_ai_source('50000000-0000-0000-0000-000000000201');
select public.review_ai_source('50000000-0000-0000-0000-000000000201','published','Republished after restore');

reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.assert_true((select count(*)=1 from public.ai_sources where id='50000000-0000-0000-0000-000000000201'),'Anonymous visitor may see a published source for an active organization');

reset role;
insert into public.ai_usage_events (organization_id,user_id,provider,model,mode,status,request_characters)
values ('10000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202','openai','test-model','live','succeeded',100);
select pg_temp.assert_raises($q$update public.ai_usage_events set request_characters=0 where organization_id='10000000-0000-0000-0000-000000000201'$q$,'AI usage events must be append-only');
select pg_temp.assert_true((select count(*)=9 from public.ai_sources s join public.organizations o on o.id=s.organization_id where o.slug='tudela-global' and s.status='published' and s.rights_status='link_only'),'Owner-approved starter catalogue must contain nine published link-only sources');

rollback;

select 'AI source workflow, public visibility and append-only usage tests passed' as result;
