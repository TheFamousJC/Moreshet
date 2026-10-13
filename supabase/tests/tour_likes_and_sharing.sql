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
  ('00000000-0000-0000-0000-000000000401','authenticated','authenticated','likes-super@test.local',now(),'{}','{"username":"likes_super","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000402','authenticated','authenticated','likes-admin@test.local',now(),'{}','{"username":"likes_admin","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000403','authenticated','authenticated','likes-visitor@test.local',now(),'{}','{"username":"likes_visitor","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000404','authenticated','authenticated','likes-other@test.local',now(),'{}','{"username":"likes_other","age_16_confirmed":true}',now(),now());

update public.profiles set email_verified_at=now(),age_eligibility_confirmed_at=now() where user_id in (
  '00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000402',
  '00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000404'
);
update public.profiles set platform_role='super_admin' where user_id='00000000-0000-0000-0000-000000000401';

insert into public.organizations (id,name,slug,status,default_language,default_currency,created_by)
values ('10000000-0000-0000-0000-000000000401','Likes Test Organization','likes-test','active','en','ILS','00000000-0000-0000-0000-000000000401');
insert into public.organization_memberships (organization_id,user_id,role,status,invited_by,accepted_at)
values ('10000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000402','administrator','active','00000000-0000-0000-0000-000000000401',now());
insert into public.cities (id,organization_id,slug,country_name,country_code,center_latitude,center_longitude,status,created_by,updated_by)
values ('20000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000401','likes-city','Israel','IL',31.9,35.0,'published','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000401');
insert into public.tours (id,organization_id,city_id,slug,status,created_by,updated_by)
values ('30000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000401','20000000-0000-0000-0000-000000000401','likes-tour','published','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000401');

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000403","role":"authenticated"}',true);
set local role authenticated;
select * from public.set_tour_like('30000000-0000-0000-0000-000000000401',true);
select pg_temp.assert_true(
  (select viewer_liked and like_count=1 from public.get_tour_like_summary('30000000-0000-0000-0000-000000000401')),
  'a verified visitor must see its own like and the aggregate count'
);
select * from public.set_tour_like('30000000-0000-0000-0000-000000000401',true);
select pg_temp.assert_true((select count(*)=1 from public.tour_likes), 'repeated like calls must not create duplicates');
select pg_temp.assert_true((select count(*)=1 from public.tour_like_events), 'no-op calls must not inflate audit events');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000404","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.tour_likes), 'another visitor must not see liker identities');
select pg_temp.assert_true((select like_count=1 and not viewer_liked from public.get_tour_like_summary('30000000-0000-0000-0000-000000000401')), 'another visitor sees count but not another user state');

reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.assert_true((select like_count=1 and not viewer_liked from public.get_tour_like_summary('30000000-0000-0000-0000-000000000401')), 'anonymous consumers receive only the count');
select pg_temp.assert_raises($$select public.set_tour_like('30000000-0000-0000-0000-000000000401',true)$$, 'anonymous users must not like');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000403","role":"authenticated"}',true);
set local role authenticated;
select * from public.set_tour_like('30000000-0000-0000-0000-000000000401',false);
select pg_temp.assert_true((select like_count=0 and not viewer_liked from public.get_tour_like_summary('30000000-0000-0000-0000-000000000401')), 'a visitor must be able to remove its like');

reset role;
insert into public.community_user_bans (organization_id,user_id,reason,banned_by)
values ('10000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000403','Automated voting abuse test restriction','00000000-0000-0000-0000-000000000402');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000403","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_raises($$select public.set_tour_like('30000000-0000-0000-0000-000000000401',true)$$, 'an actively banned account must not add likes');

reset role;
update public.community_user_bans set lifted_at=now(),lifted_by='00000000-0000-0000-0000-000000000402',lift_reason='Continue throttle test';
insert into public.tour_like_events (organization_id,tour_id,user_id,action)
select '10000000-0000-0000-0000-000000000401','30000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000403',case when n%2=0 then 'liked' else 'unliked' end
from generate_series(1,10) n;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000403","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_raises($$select public.set_tour_like('30000000-0000-0000-0000-000000000401',true)$$, 'rapid toggling must be rate-limited');

reset role;
select pg_temp.assert_raises($$update public.tour_like_events set action='liked'$$, 'like audit events must be append-only');

rollback;

select 'tour likes, privacy and abuse-control authorization tests passed' as result;
