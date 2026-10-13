\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin if not coalesce(condition,false) then raise exception 'ASSERTION FAILED: %',message; end if; end;
$$;

create or replace function pg_temp.assert_raises(statement text, message text)
returns void language plpgsql as $$
begin begin execute statement; exception when others then return; end; raise exception 'ASSERTION FAILED: expected rejection: %',message; end;
$$;

insert into auth.users (id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('00000000-0000-0000-0000-000000000301','authenticated','authenticated','narration-owner@test.local',now(),'{}','{"username":"narration_owner","age_16_confirmed":true}',now(),now()),
 ('00000000-0000-0000-0000-000000000302','authenticated','authenticated','narration-editor@test.local',now(),'{}','{"username":"narration_editor","age_16_confirmed":true}',now(),now()),
 ('00000000-0000-0000-0000-000000000303','authenticated','authenticated','narration-reviewer@test.local',now(),'{}','{"username":"narration_reviewer","age_16_confirmed":true}',now(),now());

update public.profiles set platform_role='super_admin' where user_id='00000000-0000-0000-0000-000000000301';
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000301","role":"authenticated"}',true);
set local role authenticated;
insert into public.organizations (id,name,slug,status,default_language,default_currency,created_by)
values ('10000000-0000-0000-0000-000000000301','Narration Test Organization','narration-test','active','en','ILS','00000000-0000-0000-0000-000000000301');
insert into public.organization_memberships (organization_id,user_id,role,status,invited_by,accepted_at)
values
 ('10000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000302','editor','active','00000000-0000-0000-0000-000000000301',now()),
 ('10000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000303','reviewer','active','00000000-0000-0000-0000-000000000301',now());

reset role;
insert into public.narration_assets (id,organization_id,language,provider,model,voice_name,speaking_rate,transcript_sha256,cache_key,source_characters,object_path,byte_size,status,generated_by)
values ('50000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000301','en','google','Chirp3-HD','en-GB-Chirp3-HD-Aoede',1,repeat('a',64),repeat('b',64),120,'10000000-0000-0000-0000-000000000301/preview/en/test.mp3',1024,'generated','00000000-0000-0000-0000-000000000302');
select pg_temp.assert_true((select source_type='provider_generated' from public.narration_assets where id='50000000-0000-0000-0000-000000000301'),'Provider narration must retain generated provenance by default');
update public.narration_assets set pronunciation_guide='[{"phrase":"Umm el-Umdan","encoding":"ipa","pronunciation":"um el oom-dan","reviewerNote":"Native review required"}]'::jsonb where id='50000000-0000-0000-0000-000000000301';
select pg_temp.assert_true((select jsonb_array_length(pronunciation_guide)=1 from public.narration_assets where id='50000000-0000-0000-0000-000000000301'),'Narration versions must retain their exact pronunciation guidance');
select pg_temp.assert_raises($q$update public.narration_assets set pronunciation_guide='[{"phrase":"","encoding":"unknown","pronunciation":""}]'::jsonb where id='50000000-0000-0000-0000-000000000301'$q$,'Malformed pronunciation guidance must be rejected');
select pg_temp.assert_true((select not public and file_size_limit=31457280 and allowed_mime_types @> array['audio/mpeg','audio/wav'] from storage.buckets where id='narration-audio'),'Private narration storage must accept validated MP3 and WAV with the 30 MB WAV ceiling');

insert into public.narration_assets (id,organization_id,language,provider,model,voice_name,speaking_rate,transcript_sha256,cache_key,source_characters,object_path,byte_size,status,generated_by,source_type,original_filename,file_sha256)
values ('50000000-0000-0000-0000-000000000302','10000000-0000-0000-0000-000000000301','en','kokoro','Kokoro-82M','bf_emma',1,repeat('c',64),repeat('d',64),120,'10000000-0000-0000-0000-000000000301/preview/en/kokoro.mp3',2048,'generated','00000000-0000-0000-0000-000000000302','kokoro_tts','kokoro-stop.mp3',repeat('e',64));
select pg_temp.assert_true((select source_type='kokoro_tts' and original_filename='kokoro-stop.mp3' from public.narration_assets where id='50000000-0000-0000-0000-000000000302'),'Manual Kokoro narration must retain source and filename provenance');
update public.narration_assets set mime_type='audio/wav',byte_size=20000000,original_filename='kokoro-stop.wav' where id='50000000-0000-0000-0000-000000000302';
select pg_temp.assert_true((select mime_type='audio/wav' and byte_size=20000000 from public.narration_assets where id='50000000-0000-0000-0000-000000000302'),'Validated WAV narration metadata must be accepted');
select pg_temp.assert_raises($q$update public.narration_assets set mime_type='audio/ogg' where id='50000000-0000-0000-0000-000000000302'$q$,'Unsupported narration formats must be rejected');
select pg_temp.assert_raises($q$update public.narration_assets set source_type='unverified' where id='50000000-0000-0000-0000-000000000302'$q$,'Unknown narration provenance must be rejected');

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000302","role":"authenticated"}',true);
set local role authenticated;
select public.review_narration_asset('50000000-0000-0000-0000-000000000301','pending_review',null);
select pg_temp.assert_true((select status='pending_review' from public.narration_assets where id='50000000-0000-0000-0000-000000000301'),'Editor must be able to submit generated narration');
select pg_temp.assert_raises($q$select public.review_narration_asset('50000000-0000-0000-0000-000000000301','approved',null)$q$,'Editor must not approve narration');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000303","role":"authenticated"}',true);
set local role authenticated;
select public.review_narration_asset('50000000-0000-0000-0000-000000000301','approved','Voice and pronunciation checked');
select public.review_narration_asset('50000000-0000-0000-0000-000000000301','published','Ready for visitors');
select pg_temp.assert_true((select status='published' and reviewed_by='00000000-0000-0000-0000-000000000303' and published_by='00000000-0000-0000-0000-000000000303' from public.narration_assets where id='50000000-0000-0000-0000-000000000301'),'Reviewer must be able to approve and publish narration');
select pg_temp.assert_raises($q$select public.review_narration_asset('50000000-0000-0000-0000-000000000301','superseded',null)$q$,'Reviewer must not archive narration');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000302","role":"authenticated"}',true);
set local role authenticated;
select public.review_narration_asset('50000000-0000-0000-0000-000000000302','pending_review',null);
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000303","role":"authenticated"}',true);
set local role authenticated;
select public.review_narration_asset('50000000-0000-0000-0000-000000000302','approved','Replacement checked');
select public.review_narration_asset('50000000-0000-0000-0000-000000000302','published','Replacement ready');
select pg_temp.assert_true((select status='superseded' from public.narration_assets where id='50000000-0000-0000-0000-000000000301'),'Publishing a replacement must archive the previous public narration');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000301","role":"authenticated"}',true);
set local role authenticated;
select public.review_narration_asset('50000000-0000-0000-0000-000000000301','generated',null);
select pg_temp.assert_true((select status='generated' and reviewed_by is null and published_by is null from public.narration_assets where id='50000000-0000-0000-0000-000000000301'),'Super Admin must be able to restore archived narration as an unpublished draft');

reset role;
insert into public.narration_generation_events (organization_id,asset_id,user_id,provider,model,characters,cache_hit,status)
values ('10000000-0000-0000-0000-000000000301','50000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000302','google','Chirp3-HD',120,false,'succeeded');
select pg_temp.assert_raises($q$delete from public.narration_generation_events where organization_id='10000000-0000-0000-0000-000000000301'$q$,'Narration usage events must be append-only');

rollback;
select 'Narration review workflow and append-only usage tests passed' as result;
