-- Fixes for Supabase database advisors after the first deploy.

-- ---------------------------------------------------------------- security
-- Pin search_path on the remaining helper functions.
alter function public.is_admin() set search_path = public;
alter function public.can_approve() set search_path = public;

-- SECURITY DEFINER functions must not be callable through /rest/v1/rpc by anyone who does not need them.
-- admin_role() stays callable by signed-in users: RLS policies and the web app use it, and it only reveals
-- the caller's own role.
revoke execute on function public.admin_role() from public, anon;
grant execute on function public.admin_role() to authenticated;
revoke execute on function public.guard_approval_update() from public, anon, authenticated;
revoke execute on function public.prune_events() from public, anon, authenticated;
grant execute on function public.prune_events() to service_role;

-- Supabase creates rls_auto_enable() (an event trigger helper) in new projects; it is not an API.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------- performance
-- Cover foreign keys.
create index if not exists agent_tokens_agent on public.agent_tokens (agent_id);
create index if not exists approvals_agent on public.approvals (agent_id);
create index if not exists events_agent on public.events (agent_id);
create index if not exists events_run on public.events (run_id);
create index if not exists schedule_runs_run on public.schedule_runs (run_id);
create index if not exists schedules_agent on public.schedules (agent_id);

-- "for all" write policies overlapped the read policies on SELECT; split them into insert/update/delete.
do $$
declare
  spec text[];
  specs text[][] := array[
    array['admins', 'admins_write', 'public.admin_role() = ''owner'''],
    array['agents', 'agents_owner_write', 'public.admin_role() = ''owner'''],
    array['schedules', 'schedules_owner_write', 'public.admin_role() = ''owner'''],
    array['pipeline', 'pipeline_edit', 'public.can_approve()'],
    array['prospects', 'prospects_edit', 'public.can_approve()'],
    array['metrics', 'metrics_edit', 'public.can_approve()']];
begin
  foreach spec slice 1 in array specs loop
    execute format('drop policy if exists %I on public.%I', spec[2], spec[1]);
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)', spec[1] || '_insert', spec[1], spec[3]);
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)', spec[1] || '_update', spec[1], spec[3], spec[3]);
    execute format('create policy %I on public.%I for delete to authenticated using (%s)', spec[1] || '_delete', spec[1], spec[3]);
  end loop;
end $$;
