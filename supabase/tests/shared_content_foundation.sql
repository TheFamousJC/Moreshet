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
  ('00000000-0000-0000-0000-000000000101','authenticated','authenticated','content-super@test.local',now(),'{}','{"username":"content_super","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000102','authenticated','authenticated','content-admin@test.local',now(),'{}','{"username":"content_admin","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000103','authenticated','authenticated','content-editor@test.local',now(),'{}','{"username":"content_editor","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000104','authenticated','authenticated','content-reviewer@test.local',now(),'{}','{"username":"content_reviewer","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000105','authenticated','authenticated','content-user@test.local',now(),'{}','{"username":"content_user","age_16_confirmed":true}',now(),now()),
  ('00000000-0000-0000-0000-000000000106','authenticated','authenticated','second-editor@test.local',now(),'{}','{"username":"second_editor","age_16_confirmed":true}',now(),now());

update public.profiles set platform_role='super_admin' where user_id='00000000-0000-0000-0000-000000000101';

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',true);
set local role authenticated;

insert into public.organizations (id,name,slug,status,default_language,default_currency,created_by)
values
  ('10000000-0000-0000-0000-000000000101','Content Test Organization','content-test-organization','active','en','ILS','00000000-0000-0000-0000-000000000101'),
  ('10000000-0000-0000-0000-000000000102','Second Content Organization','second-content-organization','active','en','USD','00000000-0000-0000-0000-000000000101');

insert into public.organization_memberships (organization_id,user_id,role,status,invited_by,accepted_at)
values
  ('10000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000102','administrator','active','00000000-0000-0000-0000-000000000101',now()),
  ('10000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000103','editor','active','00000000-0000-0000-0000-000000000101',now()),
  ('10000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000104','reviewer','active','00000000-0000-0000-0000-000000000101',now()),
  ('10000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000106','editor','active','00000000-0000-0000-0000-000000000101',now());

select pg_temp.assert_true(
  enum_range(null::public.interest_key)::text = '{synagogue,juderia,holocaust,legends,scholar,personalities,monument,cemetery,mikveh,historic_sites}',
  'Database Interests must exactly match the shared Discovery/CMS vocabulary and order'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}',true);
set local role authenticated;

insert into public.cities (id,organization_id,slug,country_name,country_code,flag_emoji,center_latitude,center_longitude,created_by,updated_by)
values ('20000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000101','modiin-test','Israel','IL','🇮🇱',31.8969,35.0104,'00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');

insert into public.city_translations (organization_id,city_id,language,name,subtitle,description,created_by,updated_by)
values ('10000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101','en','Modi''in Test','Heritage in the hills','Test content for the shared database.','00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');

insert into public.tours (id,organization_id,city_id,slug,estimated_duration_minutes,distance_metres,created_by,updated_by)
values ('30000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101','modiin-test-tour',90,2500,'00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');

insert into public.tour_translations (organization_id,tour_id,language,title,subtitle,overview,completion_message,created_by,updated_by)
values ('10000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000101','en','Modi''in Test Tour','A pilot route','A test overview for the permanent content database.','Tour complete.','00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');

insert into public.stops (id,organization_id,city_id,slug,interest,address,latitude,longitude,geocoding_provider,geocoding_confidence,geocoding_display_name,created_by,updated_by)
values ('40000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101','modiin-test-stop','historic_sites','Modi''in, Israel',31.8970,35.0105,'test',0.9900,'Modi''in, Israel','00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');

insert into public.stop_translations (organization_id,stop_id,language,title,short_description,narrative,created_by,updated_by)
values ('10000000-0000-0000-0000-000000000101','40000000-0000-0000-0000-000000000101','en','Test Heritage Stop','Short test description.','Full test narrative.','00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');

insert into public.stops (id,organization_id,city_id,slug,interest,address,latitude,longitude,created_by,updated_by)
values ('40000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101','modiin-test-stop-two','synagogue','Modi''in, Israel',31.8971,35.0106,'00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');

insert into public.stop_translations (organization_id,stop_id,language,title,short_description,narrative,created_by,updated_by)
values ('10000000-0000-0000-0000-000000000101','40000000-0000-0000-0000-000000000102','en','Second Test Stop','Second short description.','Second test narrative.','00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');

insert into public.tour_stops (organization_id,tour_id,stop_id,position,created_by,updated_by)
values ('10000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000101','40000000-0000-0000-0000-000000000101',1,'00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');

insert into public.tour_stops (organization_id,tour_id,stop_id,position,created_by,updated_by)
values ('10000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000101','40000000-0000-0000-0000-000000000102',2,'00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');

select public.reorder_tour_stops('30000000-0000-0000-0000-000000000101',array['40000000-0000-0000-0000-000000000102','40000000-0000-0000-0000-000000000101']::uuid[]);
select pg_temp.assert_true(
  (select stop_id='40000000-0000-0000-0000-000000000102' from public.tour_stops where tour_id='30000000-0000-0000-0000-000000000101' and position=1),
  'Editors must be able to atomically reorder every stop in a draft tour'
);
select pg_temp.assert_raises(
  'select public.reorder_tour_stops(''30000000-0000-0000-0000-000000000101'',array[''40000000-0000-0000-0000-000000000101'']::uuid[])',
  'A replacement order must contain every assigned stop exactly once'
);

insert into public.tours (id,organization_id,city_id,slug,created_by,updated_by)
values ('30000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101','shared-stop-test-tour','00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');
insert into public.tour_translations (organization_id,tour_id,language,title,overview,created_by,updated_by)
values ('10000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000102','en','Shared Stop Test Tour','Tests reusable stop assignments.','00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');
select public.replace_tour_stops('30000000-0000-0000-0000-000000000102',array['40000000-0000-0000-0000-000000000101']::uuid[]);
select pg_temp.assert_true(
  (select count(*)=2 from public.tour_stops where stop_id='40000000-0000-0000-0000-000000000101'),
  'One active stop must be reusable in more than one tour'
);
select public.replace_tour_stops('30000000-0000-0000-0000-000000000102',array['40000000-0000-0000-0000-000000000102','40000000-0000-0000-0000-000000000101']::uuid[]);
select pg_temp.assert_true(
  (select count(*)=2 and min(position)=1 and max(position)=2 from public.tour_stops where tour_id='30000000-0000-0000-0000-000000000102'),
  'Replacing a draft tour assignment list must add, retain and order reusable stops atomically'
);

select pg_temp.assert_raises(
  'update public.cities set status=''approved'' where id=''20000000-0000-0000-0000-000000000101''',
  'Editor must not approve content'
);
select pg_temp.assert_raises(
  'insert into public.cities (organization_id,slug,country_name,country_code,center_latitude,center_longitude,created_by,updated_by) values (''10000000-0000-0000-0000-000000000101'',''spoofed-author'',''Israel'',''IL'',31,35,''00000000-0000-0000-0000-000000000102'',''00000000-0000-0000-0000-000000000102'')',
  'Editor must not spoof a content author'
);

select public.submit_content_for_review(
  'city','20000000-0000-0000-0000-000000000101',
  '{"slug":"modiin-test","country_code":"IL","coordinates":{"latitude":31.8969,"longitude":35.0104}}'::jsonb,
  'human'
) as revision_id \gset

select pg_temp.assert_true(
  (select status='pending_review' from public.content_revisions where id=:'revision_id'),
  'Editor submission must create a pending immutable revision'
);
select pg_temp.assert_true(
  (select status='pending_review' from public.cities where id='20000000-0000-0000-0000-000000000101'),
  'Submitting a revision must move the content into the review queue'
);
select pg_temp.assert_raises(
  format('select public.publish_content_revision(%L)', :'revision_id'),
  'Editor must not publish an unapproved revision'
);
select pg_temp.assert_raises(
  'select public.archive_content(''city'',''20000000-0000-0000-0000-000000000101'')',
  'Editor must not archive content'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000105","role":"authenticated"}',true);
set local role authenticated;

select pg_temp.assert_true(
  (select count(*)=0 from public.cities where id='20000000-0000-0000-0000-000000000101'),
  'Ordinary user must not see pending content'
);
select pg_temp.assert_true((select count(*)=0 from public.content_revisions),'Ordinary user must not see staff revisions');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000106","role":"authenticated"}',true);
set local role authenticated;

select pg_temp.assert_true(
  (select count(*)=0 from public.content_revisions where organization_id='10000000-0000-0000-0000-000000000101'),
  'Staff from another organization must not see the review queue'
);
select pg_temp.assert_raises(
  'insert into public.cities (organization_id,slug,country_name,country_code,center_latitude,center_longitude,created_by,updated_by) values (''10000000-0000-0000-0000-000000000101'',''cross-tenant'',''Israel'',''IL'',31,35,''00000000-0000-0000-0000-000000000106'',''00000000-0000-0000-0000-000000000106'')',
  'Editor must not create content in another organization'
);

insert into public.cities (id,organization_id,slug,country_name,country_code,center_latitude,center_longitude,created_by,updated_by)
values ('20000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000102','second-city','Spain','ES',40.4168,-3.7038,'00000000-0000-0000-0000-000000000106','00000000-0000-0000-0000-000000000106');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated"}',true);
set local role authenticated;

select pg_temp.assert_raises(
  'update public.cities set country_name=''Reviewer edit forbidden'' where id=''20000000-0000-0000-0000-000000000101''',
  'Reviewer must not edit content fields'
);

insert into public.review_decisions (organization_id,revision_id,decision,notes,reviewer_user_id)
values ('10000000-0000-0000-0000-000000000101',:'revision_id','approved','Verified for Stage 4A.','00000000-0000-0000-0000-000000000104');

select pg_temp.assert_true(
  (select status='approved' and reviewed_by='00000000-0000-0000-0000-000000000104' from public.content_revisions where id=:'revision_id'),
  'Reviewer decision must approve the revision and record reviewer identity'
);
select public.publish_content_revision(:'revision_id');
select pg_temp.assert_true(
  (select status='published' and published_by='00000000-0000-0000-0000-000000000104' from public.cities where id='20000000-0000-0000-0000-000000000101'),
  'Reviewer must be able to publish approved content'
);
select pg_temp.assert_true(
  (select status='published' from public.city_translations where city_id='20000000-0000-0000-0000-000000000101' and language='en'),
  'Publishing core content must publish its translation atomically'
);
select pg_temp.assert_raises(
  format('update public.review_decisions set notes=''tampered'' where revision_id=%L', :'revision_id'),
  'Review decisions must be append-only'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}',true);
set local role authenticated;

select public.submit_content_for_review(
  'city',
  '20000000-0000-0000-0000-000000000101',
  '{"name":"Safely Revised City","country":"Spain","flagEmoji":"🇪🇸","centerLat":40.4168,"centerLng":-3.7038,"subtitle":"Replacement subtitle","description":"Replacement description"}'::jsonb,
  'human'
) as live_revision_id \gset

select pg_temp.assert_true(
  (select revises_published_content and status='pending_review' from public.content_revisions where id=:'live_revision_id')
  and (select status='published' from public.cities where id='20000000-0000-0000-0000-000000000101')
  and (select name='Modi''in Test' from public.city_translations where city_id='20000000-0000-0000-0000-000000000101' and language='en'),
  'A proposed live edit must enter review without changing or taking down the published version'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated"}',true);
set local role authenticated;

insert into public.review_decisions (organization_id,revision_id,decision,notes,reviewer_user_id)
values ('10000000-0000-0000-0000-000000000101',:'live_revision_id','approved','Safe replacement verified.','00000000-0000-0000-0000-000000000104');

select pg_temp.assert_true(
  (select status='published' from public.cities where id='20000000-0000-0000-0000-000000000101')
  and (select name='Modi''in Test' from public.city_translations where city_id='20000000-0000-0000-0000-000000000101' and language='en'),
  'Approval alone must leave the current live version unchanged'
);

select public.publish_content_revision(:'live_revision_id');
select pg_temp.assert_true(
  (select status='published' from public.content_revisions where id=:'live_revision_id')
  and (select status='published' and country_name='Spain' from public.cities where id='20000000-0000-0000-0000-000000000101')
  and (select status='published' and name='Safely Revised City' and subtitle='Replacement subtitle' from public.city_translations where city_id='20000000-0000-0000-0000-000000000101' and language='en'),
  'Publishing an approved live revision must atomically replace the public snapshot'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}',true);
set local role authenticated;
select public.submit_content_for_review(
  'city',
  '20000000-0000-0000-0000-000000000101',
  '{"name":"Safely Revised City","country":"Spain","flagEmoji":"🇪🇸","centerLat":40.4168,"centerLng":-3.7038,"subtitle":"Inline original","description":"Original pending wording."}'::jsonb,
  'human'
) as inline_original_revision_id \gset

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_raises(
  format('select public.amend_pending_content_revision(%L,''{"name":"Safely Revised City","country":"Portugal","flagEmoji":"🇪🇸","centerLat":40.4168,"centerLng":-3.7038,"subtitle":"Changed","description":"Invalid non-text workflow change."}''::jsonb)', :'inline_original_revision_id'),
  'Inline review editing must reject country, GPS and other protected-field changes'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_raises(
  format('select public.amend_pending_content_revision(%L,''{"name":"Safely Revised City","country":"Spain","flagEmoji":"🇪🇸","centerLat":40.4168,"centerLng":-3.7038,"subtitle":"Reviewer rewrite","description":"A Reviewer must not rewrite submitted text."}''::jsonb)', :'inline_original_revision_id'),
  'A Reviewer may approve or request changes but must not rewrite submitted content'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}',true);
set local role authenticated;
select public.amend_pending_content_revision(
  :'inline_original_revision_id',
  '{"name":"Safely Revised City","country":"Spain","flagEmoji":"🇪🇸","centerLat":40.4168,"centerLng":-3.7038,"subtitle":"Inline reviewed subtitle","description":"Text corrected inside Review and Publish."}'::jsonb
) as inline_replacement_revision_id \gset

select pg_temp.assert_true(
  (select status='changes_requested' from public.content_revisions where id=:'inline_original_revision_id')
  and (select count(*)=1 from public.review_decisions where revision_id=:'inline_original_revision_id' and decision='changes_requested')
  and (select status='pending_review' and snapshot->>'description'='Text corrected inside Review and Publish.' from public.content_revisions where id=:'inline_replacement_revision_id')
  and (select status='published' from public.cities where id='20000000-0000-0000-0000-000000000101'),
  'Inline review editing must retain the original decision, create a new pending revision and leave live content unchanged'
);

insert into public.review_decisions (organization_id,revision_id,decision,notes,reviewer_user_id)
values ('10000000-0000-0000-0000-000000000101',:'inline_replacement_revision_id','approved','Inline wording reviewed.','00000000-0000-0000-0000-000000000102');
select pg_temp.assert_true(
  (select status='approved' from public.content_revisions where id=:'inline_replacement_revision_id')
  and (select subtitle='Replacement subtitle' from public.city_translations where city_id='20000000-0000-0000-0000-000000000101' and language='en'),
  'Approval must not publish the edited replacement'
);

select public.amend_pending_content_revision(
  :'inline_replacement_revision_id',
  '{"name":"Safely Revised City","country":"Spain","flagEmoji":"🇪🇸","centerLat":40.4168,"centerLng":-3.7038,"subtitle":"Final corrected subtitle","description":"Last-minute text corrected before publication."}'::jsonb
) as inline_final_revision_id \gset
select pg_temp.assert_true(
  (select status='changes_requested' from public.content_revisions where id=:'inline_replacement_revision_id')
  and (select count(*)=1 from public.review_decisions where revision_id=:'inline_replacement_revision_id' and decision='approved')
  and (select count(*)=1 from public.audit_log where entity_id=:'inline_replacement_revision_id' and action='withdraw_approval_for_amendment')
  and (select status='pending_review' and snapshot->>'subtitle'='Final corrected subtitle' from public.content_revisions where id=:'inline_final_revision_id')
  and (select subtitle='Replacement subtitle' from public.city_translations where city_id='20000000-0000-0000-0000-000000000101' and language='en'),
  'Last-minute editing must withdraw approval, retain the original decision, add audit evidence and create a new pending revision without changing live content'
);

insert into public.review_decisions (organization_id,revision_id,decision,notes,reviewer_user_id)
values ('10000000-0000-0000-0000-000000000101',:'inline_final_revision_id','approved','Final wording reviewed.','00000000-0000-0000-0000-000000000102');
select public.publish_content_revision(:'inline_final_revision_id');
select pg_temp.assert_true(
  (select status='published' from public.content_revisions where id=:'inline_final_revision_id')
  and (select subtitle='Final corrected subtitle' and description='Last-minute text corrected before publication.' from public.city_translations where city_id='20000000-0000-0000-0000-000000000101' and language='en'),
  'The last-minute replacement must still require explicit approval and publication before becoming public'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}',true);
set local role authenticated;
select public.submit_content_for_review(
  'tour','30000000-0000-0000-0000-000000000101',
  '{"title":"Modi''in Test Tour","cityId":"20000000-0000-0000-0000-000000000101","overview":"A test overview for the permanent content database."}'::jsonb,
  'human'
) as tour_revision_id \gset

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated"}',true);
set local role authenticated;
insert into public.review_decisions (organization_id,revision_id,decision,reviewer_user_id)
values ('10000000-0000-0000-0000-000000000101',:'tour_revision_id','approved','00000000-0000-0000-0000-000000000104');
select public.publish_content_revision(:'tour_revision_id');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}',true);
set local role authenticated;
select public.submit_content_for_review(
  'tour','30000000-0000-0000-0000-000000000101',
  '{"title":"Modi''in Test Tour","cityId":"20000000-0000-0000-0000-000000000101","overview":"A test overview for the permanent content database.","stopOrder":["40000000-0000-0000-0000-000000000101","40000000-0000-0000-0000-000000000102"]}'::jsonb,
  'human'
) as order_revision_id \gset

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated"}',true);
set local role authenticated;
insert into public.review_decisions (organization_id,revision_id,decision,reviewer_user_id)
values ('10000000-0000-0000-0000-000000000101',:'order_revision_id','approved','00000000-0000-0000-0000-000000000104');
select pg_temp.assert_true(
  (select stop_id='40000000-0000-0000-0000-000000000102' from public.tour_stops where tour_id='30000000-0000-0000-0000-000000000101' and position=1),
  'Approving a published-tour reorder must leave the current visitor route unchanged'
);
select public.publish_content_revision(:'order_revision_id');
select pg_temp.assert_true(
  (select stop_id='40000000-0000-0000-0000-000000000101' from public.tour_stops where tour_id='30000000-0000-0000-0000-000000000101' and position=1)
  and (select stop_id='40000000-0000-0000-0000-000000000102' from public.tour_stops where tour_id='30000000-0000-0000-0000-000000000101' and position=2),
  'Publishing the approved reorder must atomically replace the complete stop sequence'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}',true);
set local role authenticated;
insert into public.stop_translations (organization_id,stop_id,language,title,short_description,narrative,audio_transcript,created_by,updated_by)
values ('10000000-0000-0000-0000-000000000101','40000000-0000-0000-0000-000000000101','he','Hebrew draft title','Hebrew draft short description.','Hebrew draft historical narrative.','Hebrew draft transcript.','00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103');
select public.submit_content_for_review(
  'stop','40000000-0000-0000-0000-000000000101',
  '{"name":"Test Heritage Stop","shortDescription":"Short test description.","fullDescription":"Full test narrative.","transcript":"English narration."}'::jsonb,
  'human'
) as multilingual_stop_revision_id \gset

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated"}',true);
set local role authenticated;
insert into public.review_decisions (organization_id,revision_id,decision,notes,reviewer_user_id)
values ('10000000-0000-0000-0000-000000000101',:'multilingual_stop_revision_id','approved','Both language versions reviewed.','00000000-0000-0000-0000-000000000104');
select public.publish_content_revision(:'multilingual_stop_revision_id');
select pg_temp.assert_true(
  (select count(*)=2 and count(*) filter (where language='he' and audio_transcript='Hebrew draft transcript.' and status='published')=1 from public.stop_translations where stop_id='40000000-0000-0000-0000-000000000101'),
  'First publication must publish every saved stop translation atomically'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}',true);
set local role authenticated;
select public.submit_content_for_review(
  'stop','40000000-0000-0000-0000-000000000101',
  '{"name":"Test Heritage Stop","shortDescription":"Short test description.","fullDescription":"Full test narrative.","transcript":"Revised English narration.","translations":{"en":{"title":"Test Heritage Stop","nativeName":"","shortDescription":"Short test description.","fullDescription":"Full test narrative.","transcript":"Revised English narration.","pronunciations":[{"phrase":"English","encoding":"ipa","pronunciation":"ing-glish","reviewerNote":"Reviewed"}]},"he":{"title":"Approved Hebrew title","nativeName":"","shortDescription":"Approved Hebrew short description.","fullDescription":"Approved Hebrew historical narrative.","transcript":"Approved Hebrew transcript.","pronunciations":[{"phrase":"Hebrew","encoding":"spoken_hint","pronunciation":"hee-broo","reviewerNote":"Native review required"}]}}}'::jsonb,
  'human'
) as multilingual_live_revision_id \gset

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_raises(
  format('select public.amend_pending_content_revision(%L, (select jsonb_set(snapshot,''{translations,en,pronunciations,0,pronunciation}'',''"tampered"''::jsonb) from public.content_revisions where id=%L))', :'multilingual_live_revision_id', :'multilingual_live_revision_id'),
  'Inline text editing must not bypass the dedicated pronunciation review controls'
);

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_raises(
  format('insert into public.review_decisions (organization_id,revision_id,decision,notes,reviewer_user_id) values (''10000000-0000-0000-0000-000000000101'',%L,''approved'',''Skipped listening.'',''00000000-0000-0000-0000-000000000104'')', :'multilingual_live_revision_id'),
  'Pronunciation revisions must be rejected when the reviewer has not completed every submitted sample'
);
select pg_temp.assert_raises(
  'select * from public.pronunciation_review_events',
  'Authenticated clients must not read or forge private pronunciation review evidence directly'
);

reset role;
insert into public.pronunciation_review_events (organization_id,revision_id,reviewer_user_id,language,phrase,guide_entry,cache_key,started_at,completed_at)
values
  ('10000000-0000-0000-0000-000000000101',:'multilingual_live_revision_id','00000000-0000-0000-0000-000000000104','en','English','{"phrase":"English","encoding":"ipa","pronunciation":"ing-glish","reviewerNote":"Reviewed"}'::jsonb,repeat('a',64),now()-interval '2 seconds',now()),
  ('10000000-0000-0000-0000-000000000101',:'multilingual_live_revision_id','00000000-0000-0000-0000-000000000104','he','Hebrew','{"phrase":"Hebrew","encoding":"spoken_hint","pronunciation":"hee-broo","reviewerNote":"Native review required"}'::jsonb,repeat('b',64),now()-interval '2 seconds',now());
select pg_temp.assert_raises(
  format('update public.pronunciation_review_events set phrase=''tampered'' where revision_id=%L', :'multilingual_live_revision_id'),
  'Completed pronunciation review evidence must be append-only'
);

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated"}',true);
set local role authenticated;
insert into public.review_decisions (organization_id,revision_id,decision,notes,reviewer_user_id)
values ('10000000-0000-0000-0000-000000000101',:'multilingual_live_revision_id','approved','Revised language versions reviewed.','00000000-0000-0000-0000-000000000104');
select public.publish_content_revision(:'multilingual_live_revision_id');
select pg_temp.assert_true(
  (select count(*)=2 and count(*) filter (where language='he' and audio_transcript='Approved Hebrew transcript.' and pronunciation_guide->0->>'encoding'='spoken_hint' and status='published')=1 and count(*) filter (where language='en' and audio_transcript='Revised English narration.' and pronunciation_guide->0->>'phrase'='English' and status='published')=1 from public.stop_translations where stop_id='40000000-0000-0000-0000-000000000101'),
  'Publishing an approved stop revision must atomically apply each reviewed language, transcript and pronunciation guide'
);

reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;

select pg_temp.assert_true(
  (select count(*)=1 from public.cities where id in ('20000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000102')),
  'Public visitors must see the published city but not the second organization draft'
);
select pg_temp.assert_true((select count(*)=1 from public.tours),'Public visitors must see the published tour but not draft tours');
select pg_temp.assert_true((select count(*)=1 from public.city_translations),'Public visitors must see the translation of published content');

reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}',true);
set local role authenticated;

select pg_temp.assert_raises(
  'update public.cities set country_name=''Silent published edit'' where id=''20000000-0000-0000-0000-000000000101''',
  'Published content must not be silently overwritten, even by an Administrator'
);
select pg_temp.assert_raises(
  'insert into public.tours (organization_id,city_id,slug,created_by,updated_by) values (''10000000-0000-0000-0000-000000000101'',''20000000-0000-0000-0000-000000000102'',''cross-tenant-city'',''00000000-0000-0000-0000-000000000102'',''00000000-0000-0000-0000-000000000102'')',
  'Composite foreign keys must prevent cross-organization content relationships'
);

-- Capacity acceptance fixture: 50 draft tours, 250 draft stops and exactly five assignments per tour.
insert into public.tours (id,organization_id,city_id,slug,created_by,updated_by)
select ('30000000-0000-0000-0001-'||lpad(g::text,12,'0'))::uuid,'10000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101','capacity-tour-'||g,'00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000102'
from generate_series(1,50) g;

insert into public.stops (id,organization_id,city_id,slug,interest,latitude,longitude,created_by,updated_by)
select ('40000000-0000-0000-0001-'||lpad(g::text,12,'0'))::uuid,'10000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101','capacity-stop-'||g,
  (array['synagogue','juderia','holocaust','legends','scholar','personalities','monument','cemetery','mikveh','historic_sites']::public.interest_key[])[1+((g-1)%10)],
  31.80+(g::double precision/100000),35.00+(g::double precision/100000),'00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000102'
from generate_series(1,250) g;

insert into public.tour_stops (organization_id,tour_id,stop_id,position,created_by,updated_by)
select '10000000-0000-0000-0000-000000000101',
  ('30000000-0000-0000-0001-'||lpad(ceil(g/5.0)::integer::text,12,'0'))::uuid,
  ('40000000-0000-0000-0001-'||lpad(g::text,12,'0'))::uuid,
  1+((g-1)%5),'00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000102'
from generate_series(1,250) g;

select pg_temp.assert_true((select count(*)=50 from public.tours where slug like 'capacity-tour-%'),'Schema must hold the 50-tour pilot acceptance fixture');
select pg_temp.assert_true((select count(*)=250 from public.stops where slug like 'capacity-stop-%'),'Schema must hold the 250-stop pilot acceptance fixture');
select pg_temp.assert_true(
  (select count(*)=50 and min(stop_count)=5 and max(stop_count)=5 from (select tour_id,count(*) stop_count from public.tour_stops where tour_id::text like '30000000-0000-0000-0001-%' group by tour_id) x),
  'Every capacity tour must contain exactly five ordered stops'
);
select pg_temp.assert_true(
  not exists (select 1 from public.audit_log where entity_type='content_revisions' and (coalesce(before_summary,'{}') ? 'snapshot' or coalesce(after_summary,'{}') ? 'snapshot')),
  'Audit history must not copy full revision snapshots'
);

select pg_temp.assert_true(
  (select count(*)=10 from pg_tables where schemaname='public' and tablename in ('media_assets','cities','city_translations','tours','tour_translations','stops','stop_translations','tour_stops','content_revisions','review_decisions') and rowsecurity),
  'Every Stage 4A content table must have row-level security enabled'
);

reset role;
select pg_temp.assert_true(
  (select not public and file_size_limit=8388608 and allowed_mime_types @> array['image/jpeg','image/png','image/webp','image/gif'] from storage.buckets where id='tour-media'),
  'Tour media bucket must be private and limited to approved image formats and 8 MB'
);
select pg_temp.assert_true(
  (select count(*)=2 from pg_policies where schemaname='storage' and tablename='objects' and policyname in ('tour_media_staff_select','tour_media_administrator_delete')),
  'Private tour media must allow authenticated reads and administrator deletes but require server-gateway writes'
);

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}',true);
set local role authenticated;
select public.archive_content('tour','30000000-0000-0000-0000-000000000102');
select pg_temp.assert_true(
  (select status='archived' and archived_at is not null from public.tours where id='30000000-0000-0000-0000-000000000102'),
  'Administrator archive must record recoverable archive state and time'
);
select public.restore_content('tour','30000000-0000-0000-0000-000000000102');
select pg_temp.assert_true(
  (select status='draft' and archived_at is null from public.tours where id='30000000-0000-0000-0000-000000000102')
  and (select status='draft' from public.tour_translations where tour_id='30000000-0000-0000-0000-000000000102' and language='en'),
  'Administrator restore must return core content and translations to draft'
);
select public.archive_content('city','20000000-0000-0000-0000-000000000101');
select pg_temp.assert_true(
  (select status='archived' from public.cities where id='20000000-0000-0000-0000-000000000101'),
  'Administrator archive must be recoverable workflow state, not destructive deletion'
);

rollback;

select 'shared content foundation authorization and capacity tests passed' as result;
