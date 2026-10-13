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
  ('00000000-0000-0000-0000-000000000201','authenticated','authenticated','ratings-super@test.local',now(),'{}','{"username":"ratings_super","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000202','authenticated','authenticated','ratings-reviewer@test.local',now(),'{}','{"username":"ratings_reviewer","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000203','authenticated','authenticated','ratings-visitor@test.local',now(),'{}','{"username":"ratings_visitor","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000204','authenticated','authenticated','ratings-other@test.local',now(),'{}','{"username":"ratings_other","age_16_confirmed":true}',now(),now());

update public.profiles set email_verified_at=now(),age_eligibility_confirmed_at=now() where user_id in (
  '00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000204'
);
update public.profiles set platform_role='super_admin' where user_id='00000000-0000-0000-0000-000000000201';

insert into public.organizations (id,name,slug,status,default_language,default_currency,created_by)
values ('10000000-0000-0000-0000-000000000201','Ratings Test Organization','ratings-test','active','en','ILS','00000000-0000-0000-0000-000000000201');
insert into public.organization_memberships (organization_id,user_id,role,status,invited_by,accepted_at)
values ('10000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202','reviewer','active','00000000-0000-0000-0000-000000000201',now());

insert into public.cities (id,organization_id,slug,country_name,country_code,center_latitude,center_longitude,status,created_by,updated_by)
values ('20000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000201','ratings-city','Israel','IL',31.9,35.0,'published','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000201');
insert into public.tours (id,organization_id,city_id,slug,status,created_by,updated_by)
values ('30000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000201','20000000-0000-0000-0000-000000000201','ratings-tour','published','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000201');
insert into public.stops (id,organization_id,city_id,slug,interest,latitude,longitude,status,created_by,updated_by)
values
  ('40000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000201','20000000-0000-0000-0000-000000000201','ratings-stop-one','historic_sites',31.9,35.0,'published','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000201'),
  ('40000000-0000-0000-0000-000000000202','10000000-0000-0000-0000-000000000201','20000000-0000-0000-0000-000000000201','ratings-stop-two','synagogue',31.91,35.01,'published','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000201');
insert into public.tour_stops (organization_id,tour_id,stop_id,position,created_by,updated_by)
values
  ('10000000-0000-0000-0000-000000000201','30000000-0000-0000-0000-000000000201','40000000-0000-0000-0000-000000000201',1,'00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000201'),
  ('10000000-0000-0000-0000-000000000201','30000000-0000-0000-0000-000000000201','40000000-0000-0000-0000-000000000202',2,'00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000201');

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000203","role":"authenticated"}',true);
set local role authenticated;

select pg_temp.assert_raises(
  $$select public.submit_tour_rating('30000000-0000-0000-0000-000000000201',5)$$,
  'a visitor must complete the tour before rating it'
);
select * from public.mark_tour_stop_completed('30000000-0000-0000-0000-000000000201','40000000-0000-0000-0000-000000000201','audio_completed');
select pg_temp.assert_true(
  not (select tour_complete from public.mark_tour_stop_completed('30000000-0000-0000-0000-000000000201','40000000-0000-0000-0000-000000000201','audio_completed')),
  'repeating one stop must remain idempotent and cannot complete the tour'
);
select pg_temp.assert_true(
  (select tour_complete and completed_stops=2 and total_stops=2 from public.mark_tour_stop_completed('30000000-0000-0000-0000-000000000201','40000000-0000-0000-0000-000000000202','audio_completed')),
  'the final published stop must complete the tour'
);
select public.submit_tour_rating('30000000-0000-0000-0000-000000000201',5);
select pg_temp.assert_true(
  (select count(*)=1 and min(status)='pending_review' and min(revision)=1 from public.tour_ratings where tour_id='30000000-0000-0000-0000-000000000201'),
  'the first rating must enter private moderation'
);
select pg_temp.assert_true(
  (select rating_count=0 from public.get_tour_rating_summary('30000000-0000-0000-0000-000000000201')),
  'pending ratings must not affect the public aggregate'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000204","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.tour_ratings), 'another visitor must not see rating identities');
select pg_temp.assert_true((select count(*)=0 from public.tour_stop_completions), 'another visitor must not see movement/completion history');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000202","role":"authenticated"}',true);
set local role authenticated;
select public.moderate_tour_rating((select id from public.tour_ratings where tour_id='30000000-0000-0000-0000-000000000201'),'approved');
select pg_temp.assert_true(
  (select rating_average=5 and rating_count=1 from public.get_tour_rating_summary('30000000-0000-0000-0000-000000000201')),
  'only the approved rating must appear in the public aggregate'
);
select pg_temp.assert_raises(
  $$update public.tour_rating_moderation_events set notes='tampered'$$,
  'moderation evidence must be append-only'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000203","role":"authenticated"}',true);
set local role authenticated;
select public.submit_tour_rating('30000000-0000-0000-0000-000000000201',4);
select pg_temp.assert_true(
  (select status='pending_review' and revision=2 and reviewed_by is null from public.tour_ratings where tour_id='30000000-0000-0000-0000-000000000201'),
  'editing an approved rating must create a new private moderation revision'
);
select pg_temp.assert_true(
  (select rating_count=0 from public.get_tour_rating_summary('30000000-0000-0000-0000-000000000201')),
  'an edited rating must leave the public aggregate until re-approved'
);
select public.withdraw_tour_rating('30000000-0000-0000-0000-000000000201');
select pg_temp.assert_true(
  (select status='withdrawn' from public.tour_ratings where tour_id='30000000-0000-0000-0000-000000000201'),
  'the visitor must be able to withdraw a rating without deleting audit history'
);

rollback;

select 'tour completion and moderated ratings authorization tests passed' as result;
