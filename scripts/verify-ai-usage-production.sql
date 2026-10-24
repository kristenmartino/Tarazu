-- Non-persistent smoke check after the additive migration. No provider calls,
-- real customer records or committed quota consumption. Any error rolls back.
begin;
set local statement_timeout = '10s';
set local lock_timeout = '3s';
do $$
declare
  v_user text := 'tarazu-usage-verification-' || gen_random_uuid()::text;
  v_first jsonb;
  v_next jsonb;
  v_check jsonb;
  v_role text;
begin
  if to_regprocedure('public.reserve_ai_request(text,text,integer,integer,integer,integer,integer)') is null
    or to_regprocedure('public.finish_ai_request(uuid,integer)') is null then
    raise exception 'AI usage functions are missing';
  end if;
  foreach v_role in array array['anon','authenticated'] loop
    if has_function_privilege(v_role, 'public.reserve_ai_request(text,text,integer,integer,integer,integer,integer)', 'execute')
      or has_function_privilege(v_role, 'public.finish_ai_request(uuid,integer)', 'execute') then
      raise exception 'AI usage functions must not be executable by frontend roles';
    end if;
  end loop;
  if not has_function_privilege('service_role', 'public.reserve_ai_request(text,text,integer,integer,integer,integer,integer)', 'execute')
    or not has_function_privilege('service_role', 'public.finish_ai_request(uuid,integer)', 'execute')
    or not (select relrowsecurity from pg_class where oid = 'public.ai_usage_reservations'::regclass) then
    raise exception 'AI usage backend permissions or RLS are missing';
  end if;

  -- High test-only shared ceilings avoid consuming a real user's budget or
  -- making this smoke check depend on the current day's customer volume.
  -- The transaction lock is held briefly and all fixture rows are rolled back.
  v_first := public.reserve_ai_request(v_user, 'analyze', 2, 100000, 32, 240, 0);
  if v_first->>'allowed' is distinct from 'true' then raise exception 'AI reservation was not admitted'; end if;
  v_check := public.reserve_ai_request(v_user, 'suggest-scores', 2, 100000, 32, 240, 0);
  if v_check->>'reason' is distinct from 'request_in_progress' then raise exception 'Per-user concurrency is not enforced'; end if;
  perform public.finish_ai_request((v_first->>'reservation_id')::uuid, 502);
  v_next := public.reserve_ai_request(v_user, 'suggest-scores', 2, 100000, 32, 240, 0);
  if v_next->>'allowed' is distinct from 'true' then raise exception 'Completed lease was not released'; end if;
  perform public.finish_ai_request((v_next->>'reservation_id')::uuid, 504);
  v_check := public.reserve_ai_request(v_user, 'analyze', 2, 100000, 32, 240, 0);
  if v_check->>'reason' is distinct from 'quota_exceeded' then raise exception 'Failed work did not retain quota'; end if;

  v_first := public.reserve_ai_request(v_user || '-validation', 'analyze', 1, 100000, 32, 240, 0);
  if v_first->>'allowed' is distinct from 'true' then raise exception 'Validation fixture was not admitted'; end if;
  perform public.finish_ai_request((v_first->>'reservation_id')::uuid, 400);
  v_next := public.reserve_ai_request(v_user || '-validation', 'analyze', 1, 100000, 32, 240, 0);
  if v_next->>'allowed' is distinct from 'true' then raise exception 'Invalid-input quota was not returned'; end if;
end;
$$;
rollback;
