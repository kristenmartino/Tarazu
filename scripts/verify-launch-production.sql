-- Transactional assertions only: all fixtures and policy edits roll back.
begin;
set local statement_timeout='10s';
set local lock_timeout='3s';
do $$
declare v jsonb; v_before bigint; v_after bigint; r text;
begin
  foreach r in array array['anon','authenticated'] loop
    if has_function_privilege(r,'public.reserve_ai_spend(bigint,text,integer,integer)','execute')
      or has_function_privilege(r,'public.record_usage_count(text,text)','execute')
      or has_function_privilege(r,'public.launch_health()','execute')
      or has_function_privilege(r,'public.prune_launch_records()','execute') then raise exception 'Frontend can execute operations'; end if;
    if has_table_privilege(r,'public.usage_daily_counts','select') or has_table_privilege(r,'public.ai_spend_reservations','select') then raise exception 'Frontend can read operations'; end if;
  end loop;
  if not has_function_privilege('service_role','public.reserve_ai_spend(bigint,text,integer,integer)','execute') then raise exception 'Service permission missing'; end if;
  perform pg_catalog.pg_advisory_xact_lock(13745,2);
  update public.ai_operations_policy set enabled=false where id=true;
  v:=public.reserve_ai_spend(400000,'claude-opus-4-8',1,1);
  if v->>'reason' is distinct from 'ai_paused' then raise exception 'Pause failed'; end if;
  update public.ai_operations_policy set enabled=true,daily_budget_microusd=1 where id=true;
  v:=public.reserve_ai_spend(400000,'claude-opus-4-8',1,1);
  if v->>'reason' is distinct from 'spend_limit' then raise exception 'Budget failed'; end if;
  select coalesce(sum(count),0) into v_before from public.usage_daily_counts;
  perform public.record_usage_count('brief_saved','demo');
  select coalesce(sum(count),0) into v_after from public.usage_daily_counts;
  if v_after is distinct from v_before+1 then raise exception 'Aggregate recording failed'; end if;
  if (public.launch_health()->>'budget')::bigint is distinct from 1 then raise exception 'Health does not reflect policy'; end if;
end; $$;
rollback;
