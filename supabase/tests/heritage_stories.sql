\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$ begin if not coalesce(condition,false) then raise exception 'ASSERTION FAILED: %',message; end if; end; $$;
create or replace function pg_temp.assert_raises(statement text, message text)
returns void language plpgsql as $$ begin begin execute statement; exception when others then return; end; raise exception 'ASSERTION FAILED: expected rejection: %',message; end; $$;

insert into auth.users (id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('00000000-0000-0000-0000-000000000501','authenticated','authenticated','stories-super@test.local',now(),'{}','{"username":"stories_super","age_16_confirmed":true}',now(),now()),
 ('00000000-0000-0000-0000-000000000502','authenticated','authenticated','stories-reviewer@test.local',now(),'{}','{"username":"stories_reviewer","age_16_confirmed":true}',now(),now()),
 ('00000000-0000-0000-0000-000000000503','authenticated','authenticated','stories-editor@test.local',now(),'{}','{"username":"stories_editor","age_16_confirmed":true}',now(),now()),
 ('00000000-0000-0000-0000-000000000504','authenticated','authenticated','stories-visitor@test.local',now(),'{}','{"username":"stories_visitor","display_name":"Story Author","age_16_confirmed":true}',now(),now()),
 ('00000000-0000-0000-0000-000000000505','authenticated','authenticated','stories-other@test.local',now(),'{}','{"username":"stories_other","age_16_confirmed":true}',now(),now());
update public.profiles set email_verified_at=now(),age_eligibility_confirmed_at=now() where user_id::text like '00000000-0000-0000-0000-00000000050%';
update public.profiles set platform_role='super_admin' where user_id='00000000-0000-0000-0000-000000000501';

insert into public.organizations (id,name,slug,status,default_language,default_currency,created_by)
values ('10000000-0000-0000-0000-000000000501','Stories Test Organization','stories-test','active','en','ILS','00000000-0000-0000-0000-000000000501');
insert into public.organization_memberships (organization_id,user_id,role,status,invited_by,accepted_at)
values
 ('10000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000502','reviewer','active','00000000-0000-0000-0000-000000000501',now()),
 ('10000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000503','editor','active','00000000-0000-0000-0000-000000000501',now());
insert into public.cities (id,organization_id,slug,country_name,country_code,center_latitude,center_longitude,status,created_by,updated_by)
values ('20000000-0000-0000-0000-000000000501','10000000-0000-0000-0000-000000000501','stories-city','Israel','IL',31.9,35.0,'published','00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000501');
insert into public.tours (id,organization_id,city_id,slug,status,created_by,updated_by)
values ('30000000-0000-0000-0000-000000000501','10000000-0000-0000-0000-000000000501','20000000-0000-0000-0000-000000000501','stories-tour','published','00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000501');

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000504","role":"authenticated"}',true);
set local role authenticated;
select public.save_heritage_story_draft('30000000-0000-0000-0000-000000000501','My family memory','My grandparents shared this important memory with our family.','en','display_name');
insert into storage.objects (bucket_id,name,owner_id,metadata)
select 'heritage-story-media','10000000-0000-0000-0000-000000000501/00000000-0000-0000-0000-000000000504/'||id::text||'/family-photo.jpg','00000000-0000-0000-0000-000000000504','{"mimetype":"image/jpeg","size":1024}'::jsonb
from public.heritage_stories;
select pg_temp.assert_raises($$select public.submit_heritage_story((select id from public.heritage_stories),array[]::text[],false)$$,'explicit publication consent is mandatory');
select public.submit_heritage_story((select id from public.heritage_stories),array[(select name from storage.objects where bucket_id='heritage-story-media')]::text[],true);
select pg_temp.assert_true((select count(*)=1 and min(status)='pending_review' and min(revision)=1 from public.heritage_stories),'a story must enter private review');
select pg_temp.assert_true((select count(*)=1 from public.heritage_story_revisions),'submitted story content must be immutable revision evidence');
select pg_temp.assert_true((select count(*)=0 from public.get_public_heritage_stories('30000000-0000-0000-0000-000000000501')),'pending stories must not be public');

reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.assert_true((select count(*)=0 from storage.objects where bucket_id='heritage-story-media'),'pending story photographs must remain private');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000505","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.heritage_stories),'another visitor must not see private stories or identity');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000503","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_raises($$select public.moderate_heritage_story((select id from public.heritage_stories),'approved')$$,'an Editor must not review stories');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000502","role":"authenticated"}',true);
set local role authenticated;
select public.moderate_heritage_story((select id from public.heritage_stories),'approved');
select pg_temp.assert_true((select count(*)=1 and min(title)='My family memory' and min(attribution)='Story Author' from public.get_public_heritage_stories('30000000-0000-0000-0000-000000000501')),'a reviewer may publish safe attribution without account identity');

reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select pg_temp.assert_true((select count(*)=1 from storage.objects where bucket_id='heritage-story-media'),'only approved-revision photographs may become anonymously readable');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000504","role":"authenticated"}',true);
set local role authenticated;
select public.save_heritage_story_draft('30000000-0000-0000-0000-000000000501','My revised family memory','This revised private version must not replace the approved public story yet.','en','anonymous',(select id from public.heritage_stories));
select public.submit_heritage_story((select id from public.heritage_stories),array[]::text[],true);
select pg_temp.assert_true((select status='pending_review' and revision=2 and published_revision=1 from public.heritage_stories),'editing must create a fresh pending revision while retaining the approved revision');
select pg_temp.assert_true((select min(title)='My family memory' from public.get_public_heritage_stories('30000000-0000-0000-0000-000000000501')),'the previous approved revision must remain public during review');
select pg_temp.assert_raises($$select public.submit_heritage_story((select id from public.heritage_stories),array['a','b','c','d']::text[],true)$$,'more than three photographs must be rejected');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000502","role":"authenticated"}',true);
set local role authenticated;
select public.moderate_heritage_story((select id from public.heritage_stories),'approved');
select pg_temp.assert_true((select min(title)='My revised family memory' and min(attribution)='Anonymous contributor' from public.get_public_heritage_stories('30000000-0000-0000-0000-000000000501')),'approval must publish the new anonymous revision');

reset role;
insert into public.community_user_bans (organization_id,user_id,reason,banned_by)
values ('10000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000504','Story abuse restriction test evidence','00000000-0000-0000-0000-000000000501');
select pg_temp.assert_true((select count(*)=0 from public.get_public_heritage_stories('30000000-0000-0000-0000-000000000501')),'an active community ban must hide approved stories without deleting evidence');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000504","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_raises($$select public.save_heritage_story_draft('30000000-0000-0000-0000-000000000501','Blocked story','This must not be accepted while a community restriction is active.','en','anonymous')$$,'a banned user must not save a new story draft');

reset role;
update public.community_user_bans set lifted_at=now(),lifted_by='00000000-0000-0000-0000-000000000501',lift_reason='Story test completed';
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000504","role":"authenticated"}',true);
set local role authenticated;
select public.withdraw_heritage_story((select id from public.heritage_stories));
select pg_temp.assert_true((select count(*)=0 from public.get_public_heritage_stories('30000000-0000-0000-0000-000000000501')),'withdrawal must remove public visibility immediately');
select public.set_heritage_story_owner_archived((select id from public.heritage_stories),true);
select pg_temp.assert_true((select owner_archived_at is not null from public.heritage_stories),'a withdrawn story can be hidden from the contributor list without deleting it');
select public.set_heritage_story_owner_archived((select id from public.heritage_stories),false);
select pg_temp.assert_true((select owner_archived_at is null from public.heritage_stories),'an owner-archived story can be restored');

reset role;
select pg_temp.assert_raises($$update public.heritage_story_revisions set title='tampered'$$,'story revisions must be append-only');
select pg_temp.assert_raises($$delete from public.heritage_story_moderation_events$$,'moderation events must be append-only');
select pg_temp.assert_true((select not public and file_size_limit=8388608 and allowed_mime_types @> array['image/jpeg','image/png','image/webp'] from storage.buckets where id='heritage-story-media'),'story photo storage must be private, image-only and size limited');

rollback;

select 'heritage stories, consent, revision, moderation and privacy tests passed' as result;
