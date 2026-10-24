create table if not exists public.ai_operations_policy (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  daily_budget_microusd bigint not null default 10000000 check (daily_budget_microusd between 1 and 10000000)
);
insert into public.ai_operations_policy(id) values(true) on conflict do nothing;
create table if not exists public.ai_spend_reservations (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default clock_timestamp(),
  amount_microusd bigint not null check(amount_microusd between 1 and 10000000),
  model text not null check(model in ('claude-opus-4-8','claude-sonnet-4-6')),
  input_bytes integer not null check(input_bytes between 1 and 150000),
  output_tokens integer not null check(output_tokens between 1 and 16000)
);
create index if not exists idx_ai_spend_created on public.ai_spend_reservations(created_at);
create table if not exists public.usage_daily_counts (
  day date not null default (now() at time zone 'UTC')::date,
  event text not null check(event in ('demo_opened','walkthrough_started','personal_started','brief_saved','brief_reopened','ai_completed','ai_refused','feedback_opened')),
  mode text not null check(mode in ('demo','personal','public')),
  count bigint not null default 1 check(count between 1 and 1000000), primary key(day,event,mode)
);
alter table public.ai_operations_policy enable row level security;
alter table public.ai_spend_reservations enable row level security;
alter table public.usage_daily_counts enable row level security;
revoke all on public.ai_operations_policy,public.ai_spend_reservations,public.usage_daily_counts from public,anon,authenticated;
grant select on public.ai_operations_policy,public.ai_spend_reservations,public.usage_daily_counts to service_role;

create or replace function public.reserve_ai_spend(p_amount bigint,p_model text,p_input_bytes integer,p_output_tokens integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_used bigint; v_budget bigint; v_enabled boolean; v_min bigint;
begin
  if p_model not in ('claude-opus-4-8','claude-sonnet-4-6') or p_model is null
    or p_amount is null or p_amount not between 1 and 10000000
    or p_input_bytes is null or p_input_bytes not between 1 and 150000
    or p_output_tokens is null or p_output_tokens not between 1 and 16000 then raise exception 'Invalid spending envelope'; end if;
  v_min := (p_input_bytes+4096)*case when p_model='claude-opus-4-8' then 10 else 6 end + p_output_tokens*case when p_model='claude-opus-4-8' then 50 else 30 end;
  if p_amount < v_min then raise exception 'Spending envelope too small'; end if;
  perform pg_catalog.pg_advisory_xact_lock(13745,2);
  select enabled,daily_budget_microusd into v_enabled,v_budget from public.ai_operations_policy where id=true;
  if v_enabled is distinct from true then return jsonb_build_object('allowed',false,'reason','ai_paused'); end if;
  select coalesce(sum(amount_microusd),0) into v_used from public.ai_spend_reservations where created_at > clock_timestamp()-interval '24 hours';
  if v_budget is null or v_used+p_amount > least(v_budget,10000000) then return jsonb_build_object('allowed',false,'reason','spend_limit'); end if;
  insert into public.ai_spend_reservations(amount_microusd,model,input_bytes,output_tokens) values(p_amount,p_model,p_input_bytes,p_output_tokens);
  return jsonb_build_object('allowed',true,'reserved',v_used+p_amount);
end; $$;

create or replace function public.record_usage_count(p_event text,p_mode text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_event is null or p_event not in ('demo_opened','walkthrough_started','personal_started','brief_saved','brief_reopened','ai_completed','ai_refused','feedback_opened') or p_mode is null or p_mode not in ('demo','personal','public') then raise exception 'Invalid usage event'; end if;
  insert into public.usage_daily_counts(event,mode) values(p_event,p_mode)
    on conflict(day,event,mode) do update set count=least(1000000,public.usage_daily_counts.count+1);
end; $$;

create or replace function public.launch_health() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('enabled',p.enabled,'budget',p.daily_budget_microusd,
    'reserved',coalesce((select sum(amount_microusd) from public.ai_spend_reservations where created_at>now()-interval '24 hours'),0),
    'requests', (select count(*) from public.ai_usage_reservations where created_at>now()-interval '24 hours' and state<>'rejected')+(select count(*) from public.ai_call_log where created_at>now()-interval '24 hours'),
    'recent_requests',(select count(*) from public.ai_usage_reservations where created_at>now()-interval '15 minutes'),
    'recent_failures',(select count(*) from public.ai_usage_reservations where created_at>now()-interval '15 minutes' and state='failed'))
  from public.ai_operations_policy p where id=true;
$$;
revoke all on function public.reserve_ai_spend(bigint,text,integer,integer),public.record_usage_count(text,text),public.launch_health() from public,anon,authenticated;
grant execute on function public.reserve_ai_spend(bigint,text,integer,integer),public.record_usage_count(text,text),public.launch_health() to service_role;
create or replace function public.prune_launch_records() returns void
language plpgsql security definer set search_path='' as $$
begin
  delete from public.usage_daily_counts where day < (now() at time zone 'UTC')::date-30;
  delete from public.ai_spend_reservations where created_at < now()-interval '30 days';
  delete from public.ai_usage_reservations where created_at < now()-interval '30 days';
  delete from public.ai_call_log where created_at < now()-interval '30 days';
end; $$;
revoke all on function public.prune_launch_records() from public,anon,authenticated;
grant execute on function public.prune_launch_records() to service_role;
notify pgrst,'reload schema';
