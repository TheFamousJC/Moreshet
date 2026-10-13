\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

create or replace function pg_temp.assert_raises(statement text, message text)
returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then return;
  end;
  raise exception 'ASSERTION FAILED: expected rejection: %', message;
end;
$$;

insert into auth.users (id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('00000000-0000-0000-0000-000000000301','authenticated','authenticated','comments-super@test.local',now(),'{}','{"username":"comments_super","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000302','authenticated','authenticated','comments-admin@test.local',now(),'{}','{"username":"comments_admin","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000303','authenticated','authenticated','comments-reviewer@test.local',now(),'{}','{"username":"comments_reviewer","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000304','authenticated','authenticated','comments-editor@test.local',now(),'{}','{"username":"comments_editor","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000305','authenticated','authenticated','comments-visitor@test.local',now(),'{}','{"username":"comments_visitor","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000306','authenticated','authenticated','comments-other@test.local',now(),'{}','{"username":"comments_other","age_16_confirmed":true}',now(),now());

update public.profiles set email_verified_at=now(),age_eligibility_confirmed_at=now() where user_id in (
  '00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000303',
  '00000000-0000-0000-0000-000000000304','00000000-0000-0000-0000-000000000305','00000000-0000-0000-0000-000000000306'
);
update public.profiles set platform_role='super_admin' where user_id='00000000-0000-0000-0000-000000000301';

insert into public.organizations (id,name,slug,status,default_language,default_currency,created_by)
values ('10000000-0000-0000-0000-000000000301','Comments Test Organization','comments-test','active','en','ILS','00000000-0000-0000-0000-000000000301');
insert into public.organization_memberships (organization_id,user_id,role,status,invited_by,accepted_at)
values
  ('10000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000302','administrator','active','00000000-0000-0000-0000-000000000301',now()),
  ('10000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000303','reviewer','active','00000000-0000-0000-0000-000000000301',now()),
  ('10000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000304','editor','active','00000000-0000-0000-0000-000000000301',now());

insert into public.cities (id,organization_id,slug,country_name,country_code,center_latitude,center_longitude,status,created_by,updated_by)
values ('20000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000301','comments-city','Israel','IL',31.9,35.0,'published','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000301');
insert into public.tours (id,organization_id,city_id,slug,status,created_by,updated_by)
values ('30000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000301','20000000-0000-0000-0000-000000000301','comments-tour','published','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000301');

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000305","role":"authenticated"}',true);
set local role authenticated;
select public.submit_tour_comment('30000000-0000-0000-0000-000000000301','A thoughtful and useful heritage tour.');
select pg_temp.assert_true(
  (select count(*)=1 and min(status)='pending_review' and min(revision)=1 from public.tour_comments where tour_id='30000000-0000-0000-0000-000000000301'),
  'a visitor comment must enter private moderation'
);
select pg_temp.assert_true(
  (select count(*)=0 from public.get_public_tour_comments('30000000-0000-0000-0000-000000000301')),
  'pending comments must not be public'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000306","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.tour_comments), 'another visitor must not see private comments or identities');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000304","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_raises(
  $$select public.moderate_tour_comment((select id from public.tour_comments where tour_id='30000000-0000-0000-0000-000000000301'),'approved')$$,
  'an Editor must not moderate comments'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000303","role":"authenticated"}',true);
set local role authenticated;
select public.moderate_tour_comment((select id from public.tour_comments where tour_id='30000000-0000-0000-0000-000000000301'),'approved');
select pg_temp.assert_true(
  (select count(*)=1 and min(comment_text)='A thoughtful and useful heritage tour.' from public.get_public_tour_comments('30000000-0000-0000-0000-000000000301')),
  'approved comment text must be public without an identity field'
);
select pg_temp.assert_raises(
  $$select public.ban_community_user('10000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000305','Reviewer cannot issue this ban',30)$$,
  'a Reviewer must not ban an account'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000305","role":"authenticated"}',true);
set local role authenticated;
select public.submit_tour_comment('30000000-0000-0000-0000-000000000301','An updated comment requiring a fresh review.');
select pg_temp.assert_true(
  (select status='pending_review' and revision=2 from public.tour_comments where tour_id='30000000-0000-0000-0000-000000000301'),
  'editing an approved comment must create a new private revision'
);
select pg_temp.assert_true(
  (select count(*)=0 from public.get_public_tour_comments('30000000-0000-0000-0000-000000000301')),
  'edited comments must leave public delivery until re-approved'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000302","role":"authenticated"}',true);
set local role authenticated;
select public.ban_community_user('10000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000305','Repeated abusive community submissions',30);
select pg_temp.assert_true(
  (select status='rejected' from public.tour_comments where tour_id='30000000-0000-0000-0000-000000000301'),
  'a ban must hide pending or approved comments without deleting them'
);
select pg_temp.assert_true(
  (select count(*)=1 from public.community_user_bans where user_id='00000000-0000-0000-0000-000000000305' and lifted_at is null),
  'Administrator ban must be recorded with recoverable evidence'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000305","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_raises(
  $$select public.submit_tour_comment('30000000-0000-0000-0000-000000000301','This submission must be blocked.')$$,
  'a banned visitor must not submit comments'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000302","role":"authenticated"}',true);
set local role authenticated;
select public.lift_community_user_ban((select id from public.community_user_bans where user_id='00000000-0000-0000-0000-000000000305'),'Appeal reviewed and restriction lifted');
select pg_temp.assert_true(
  (select lifted_at is not null and lifted_by='00000000-0000-0000-0000-000000000302' from public.community_user_bans where user_id='00000000-0000-0000-0000-000000000305'),
  'an Administrator must be able to lift a ban with a reason'
);
select pg_temp.assert_raises(
  $$update public.tour_comment_moderation_events set notes='tampered'$$,
  'comment moderation evidence must be append-only'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000305","role":"authenticated"}',true);
set local role authenticated;
select public.submit_tour_comment('30000000-0000-0000-0000-000000000301','A permitted comment after the ban was lifted.');
select pg_temp.assert_true(
  (select status='pending_review' and revision=3 from public.tour_comments where tour_id='30000000-0000-0000-0000-000000000301'),
  'lifting the ban must permit a fresh moderated revision'
);
select public.withdraw_tour_comment('30000000-0000-0000-0000-000000000301');
select pg_temp.assert_true(
  (select status='withdrawn' from public.tour_comments where tour_id='30000000-0000-0000-0000-000000000301'),
  'the visitor must be able to withdraw the comment without deleting history'
);

rollback;

select 'moderated tour comments and community bans authorization tests passed' as result;
