-- Persist the Ask Benjamin daily request ceiling across Railway restarts and instances.
-- Reservation and outcome events share one request_id, so quota accounting counts
-- distinct requests rather than audit rows.

create or replace function public.reserve_ai_daily_request(
  p_organization_id uuid,
  p_user_id uuid,
  p_provider text,
  p_model text,
  p_daily_limit integer,
  p_request_characters integer default 0
)
returns table(allowed boolean, request_id uuid, used integer, remaining integer)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_day_start timestamptz := (date_trunc('day', now() at time zone 'utc') at time zone 'utc');
  v_used integer := 0;
  v_request_id uuid;
begin
  if p_daily_limit < 1 or p_daily_limit > 10000 then
    raise exception 'Daily AI request limit is outside the supported range';
  end if;
  if p_request_characters < 0 then
    raise exception 'Request character count cannot be negative';
  end if;
  if not exists (
    select 1 from public.organizations organization
    where organization.id=p_organization_id and organization.status in ('trial','active')
  ) then
    raise exception 'Active organization not found';
  end if;

  -- Serialize reservations for this organization and UTC day so two application
  -- instances cannot both accept the final available request.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_organization_id::text || ':' || v_day_start::text, 0)
  );

  select count(distinct event.request_id)::integer
  into v_used
  from public.ai_usage_events event
  where event.organization_id=p_organization_id
    and event.mode='live'
    and event.created_at >= v_day_start
    and event.error_code is distinct from 'daily_limit';

  if v_used >= p_daily_limit then
    return query select false, null::uuid, v_used, 0;
    return;
  end if;

  v_request_id := extensions.gen_random_uuid();
  insert into public.ai_usage_events (
    organization_id,user_id,request_id,provider,model,mode,status,
    request_characters,error_code
  ) values (
    p_organization_id,p_user_id,v_request_id,p_provider,p_model,'live','rejected',
    p_request_characters,'quota_reserved'
  );

  return query select true, v_request_id, v_used + 1, p_daily_limit - v_used - 1;
end;
$$;

revoke all on function public.reserve_ai_daily_request(uuid,uuid,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_ai_daily_request(uuid,uuid,text,text,integer,integer) to service_role;

comment on function public.reserve_ai_daily_request(uuid,uuid,text,text,integer,integer) is
  'Atomically reserves one privacy-safe Ask Benjamin request against an organization UTC-day ceiling. Service role only.';
