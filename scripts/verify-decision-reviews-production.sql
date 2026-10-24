-- Validate storage and privilege boundaries; all fixtures roll back.
begin;
set local statement_timeout='10s';
set local lock_timeout='3s';
do $$
declare ws uuid; d uuid; r uuid; role_name text;
begin
  foreach role_name in array array['anon','authenticated'] loop
    if has_table_privilege(role_name,'public.decision_reviews','select') or has_table_privilege(role_name,'public.decision_reviews','insert') then raise exception 'Frontend can access decision reviews'; end if;
  end loop;
  if not has_table_privilege('service_role','public.decision_reviews','insert') or not has_table_privilege('service_role','public.decision_reviews','select') then raise exception 'Service review access missing'; end if;
  if has_table_privilege('service_role','public.decision_reviews','update') or has_table_privilege('service_role','public.decision_reviews','delete') then raise exception 'Service can rewrite review history'; end if;
  if not (select relrowsecurity from pg_class where oid='public.decision_reviews'::regclass) then raise exception 'Review RLS disabled'; end if;
  insert into public.workspaces(user_id,name) values ('transactional-review-check','Review verification') returning id into ws;
  insert into public.decisions(workspace_id,title,final_rationale,recommendation_snapshot) values (ws,'Original','Preserve this','{"frozen":true}') returning id into d;
  insert into public.decision_reviews(workspace_id,decision_id,action,outcome,next_action,decision_snapshot,evidence_snapshots)
  values (ws,d,'revise','Unknown; no result measured','Run a smaller test','{"title":"Original"}','[{"body":"Synthetic verification source"}]') returning id into r;
  if not exists (select 1 from public.decisions where id=d and final_rationale='Preserve this' and recommendation_snapshot='{"frozen":true}'::jsonb) then raise exception 'Original decision changed'; end if;
  if not exists (select 1 from public.decision_reviews where id=r and evidence_snapshots->0->>'body'='Synthetic verification source') then raise exception 'Review snapshot missing'; end if;
end; $$;
rollback;
