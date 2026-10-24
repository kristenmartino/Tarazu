-- Reserve before work, under one transaction lock across both AI routes.
-- Old successful-call history still contributes to the rolling budget.
create table if not exists public.ai_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  route text not null check (route in ('analyze', 'suggest-scores')),
  state text not null default 'reserved' check (state in ('reserved', 'completed', 'failed', 'rejected')),
  created_at timestamptz not null default clock_timestamp(),
  lease_expires_at timestamptz not null,
  finished_at timestamptz,
  response_status integer
);
create index if not exists idx_ai_reservations_created on public.ai_usage_reservations(created_at);
create index if not exists idx_ai_reservations_user_created on public.ai_usage_reservations(user_id, created_at);
create index if not exists idx_ai_reservations_active on public.ai_usage_reservations(lease_expires_at) where state = 'reserved';
create index if not exists idx_ai_call_log_created on public.ai_call_log(created_at);
alter table public.ai_usage_reservations enable row level security;
revoke all on public.ai_usage_reservations from anon, authenticated;
grant select, insert, update on public.ai_usage_reservations to service_role;

create or replace function public.reserve_ai_request(
  p_user_id text, p_route text, p_user_limit integer default 50,
  p_global_limit integer default 100, p_global_concurrency integer default 3,
  p_lease_seconds integer default 240, p_cooldown_seconds integer default 5
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz;
  v_user_count bigint;
  v_global_count bigint;
  v_active bigint;
  v_user_active bigint;
  v_last timestamptz;
  v_first timestamptz;
  v_first_global timestamptz;
  v_next_lease timestamptz;
  v_id uuid;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 or length(p_user_id) > 255
    or p_route is null or p_route not in ('analyze', 'suggest-scores')
    or p_user_limit is null or p_user_limit not between 1 and 1000
    or p_global_limit is null or p_global_limit not between 1 and 100000
    or p_global_concurrency is null or p_global_concurrency not between 1 and 32
    or p_lease_seconds is null or p_lease_seconds not between 180 and 600
    or p_cooldown_seconds is null or p_cooldown_seconds not between 0 and 60 then
    raise exception 'Invalid AI usage configuration' using errcode = '22023';
  end if;

  -- Transaction-scoped: automatically released on success or rollback. No
  -- network/provider work is performed while this lock is held.
  perform pg_catalog.pg_advisory_xact_lock(13745, 1);
  v_now := clock_timestamp();
  select count(*), count(*) filter (where user_id = p_user_id),
    min(created_at), min(created_at) filter (where user_id = p_user_id),
    max(created_at) filter (where user_id = p_user_id)
  into v_global_count, v_user_count, v_first_global, v_first, v_last
  from (
    select user_id, created_at from public.ai_usage_reservations
      where created_at > v_now - interval '24 hours' and state <> 'rejected'
    union all
    select user_id, created_at from public.ai_call_log where created_at > v_now - interval '24 hours'
  ) usage;

  if v_user_count >= p_user_limit then
    return jsonb_build_object('allowed', false, 'reason', 'quota_exceeded', 'retry_after', greatest(1, ceil(extract(epoch from v_first + interval '24 hours' - v_now)))::integer);
  end if;
  if v_global_count >= p_global_limit then
    return jsonb_build_object('allowed', false, 'reason', 'global_quota_exceeded', 'retry_after', greatest(1, ceil(extract(epoch from v_first_global + interval '24 hours' - v_now)))::integer);
  end if;

  select count(*), count(*) filter (where user_id = p_user_id), min(lease_expires_at)
  into v_active, v_user_active, v_next_lease
  from public.ai_usage_reservations where state = 'reserved' and lease_expires_at > v_now;
  if v_user_active > 0 then
    return jsonb_build_object('allowed', false, 'reason', 'request_in_progress', 'retry_after', 5);
  end if;
  if v_active >= p_global_concurrency then
    return jsonb_build_object('allowed', false, 'reason', 'ai_busy', 'retry_after', greatest(1, least(30, ceil(extract(epoch from v_next_lease - v_now))))::integer);
  end if;
  if v_last is not null and v_last + make_interval(secs => p_cooldown_seconds) > v_now then
    return jsonb_build_object('allowed', false, 'reason', 'request_too_soon', 'retry_after', greatest(1, ceil(extract(epoch from v_last + make_interval(secs => p_cooldown_seconds) - v_now)))::integer);
  end if;

  insert into public.ai_usage_reservations(user_id, route, created_at, lease_expires_at)
  values(p_user_id, p_route, v_now, v_now + make_interval(secs => p_lease_seconds)) returning id into v_id;
  return jsonb_build_object('allowed', true, 'reservation_id', v_id,
    'user_used', v_user_count + 1, 'global_used', v_global_count + 1);
end;
$$;

create or replace function public.finish_ai_request(p_reservation_id uuid, p_status integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status is null or p_status not between 100 and 599 then
    raise exception 'Invalid AI response status' using errcode = '22023';
  end if;
  -- Only validation failures before provider work release the daily budget.
  -- Timeouts, malformed provider responses and upstream errors still count.
  update public.ai_usage_reservations
    set state = case when p_status in (400, 413, 422) then 'rejected'
      when p_status < 400 then 'completed' else 'failed' end,
      response_status = p_status, finished_at = clock_timestamp()
    where id = p_reservation_id and state = 'reserved';
end;
$$;

revoke all on function public.reserve_ai_request(text, text, integer, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.finish_ai_request(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_request(text, text, integer, integer, integer, integer, integer) to service_role;
grant execute on function public.finish_ai_request(uuid, integer) to service_role;

notify pgrst, 'reload schema';
