begin;

do $$
declare
  v_organization_id uuid;
  v_user_id uuid;
  v_baseline integer;
  v_first record;
  v_second record;
  v_blocked record;
begin
  select organization.id, organization.created_by
  into v_organization_id, v_user_id
  from public.organizations organization
  where organization.status in ('trial','active')
  order by organization.created_at
  limit 1;

  if v_organization_id is null then
    raise exception 'Test requires an active organization';
  end if;

  select count(distinct event.request_id)::integer
  into v_baseline
  from public.ai_usage_events event
  where event.organization_id=v_organization_id
    and event.mode='live'
    and event.created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc')
    and event.error_code is distinct from 'daily_limit';

  select * into v_first from public.reserve_ai_daily_request(
    v_organization_id,v_user_id,'openai','quota-test',v_baseline+2,12
  );
  if not v_first.allowed or v_first.used <> v_baseline+1 or v_first.remaining <> 1 then
    raise exception 'First persistent quota reservation failed: %', row_to_json(v_first);
  end if;

  -- The outcome shares the reservation request_id and must not count twice.
  insert into public.ai_usage_events (
    organization_id,user_id,request_id,provider,model,mode,status,request_characters
  ) values (
    v_organization_id,v_user_id,v_first.request_id,'openai','quota-test','live','succeeded',12
  );

  select * into v_second from public.reserve_ai_daily_request(
    v_organization_id,v_user_id,'openai','quota-test',v_baseline+2,12
  );
  if not v_second.allowed or v_second.used <> v_baseline+2 or v_second.remaining <> 0 then
    raise exception 'Second persistent quota reservation failed: %', row_to_json(v_second);
  end if;

  select * into v_blocked from public.reserve_ai_daily_request(
    v_organization_id,v_user_id,'openai','quota-test',v_baseline+2,12
  );
  if v_blocked.allowed or v_blocked.request_id is not null or v_blocked.remaining <> 0 then
    raise exception 'Persistent quota did not block the over-limit request: %', row_to_json(v_blocked);
  end if;
end;
$$;

do $$
begin
  if has_function_privilege('anon','public.reserve_ai_daily_request(uuid,uuid,text,text,integer,integer)','execute') then
    raise exception 'Anonymous role must not reserve AI quota';
  end if;
  if has_function_privilege('authenticated','public.reserve_ai_daily_request(uuid,uuid,text,text,integer,integer)','execute') then
    raise exception 'Authenticated browser role must not reserve AI quota directly';
  end if;
  if not has_function_privilege('service_role','public.reserve_ai_daily_request(uuid,uuid,text,text,integer,integer)','execute') then
    raise exception 'Service role must be able to reserve AI quota';
  end if;
end;
$$;

rollback;

select 'persistent AI daily budget tests passed' as result;
