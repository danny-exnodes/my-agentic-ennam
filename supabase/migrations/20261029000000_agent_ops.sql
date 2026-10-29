-- Agent Ops: tracking for sales agents (cloud + local), routines/schedules, approvals and sales data.
-- Access model:
--   * People sign in with Supabase Auth; only emails listed in public.admins can read or change anything.
--   * Agents never use a Supabase login: they call the agent-api Edge Function with a per-agent token,
--     and the function writes with the service role.


-- ---------------------------------------------------------------- access
create table if not exists public.admins (
  email      text primary key check (email = lower(email)),
  role       text not null default 'owner' check (role in ('owner', 'approver', 'viewer')),
  created_at timestamptz not null default now()
);

create or replace function public.admin_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.admins where email = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.admin_role() is not null $$;

create or replace function public.can_approve() returns boolean
language sql stable as $$ select public.admin_role() in ('owner', 'approver') $$;

-- ---------------------------------------------------------------- agents and runs
create table if not exists public.agents (
  id             text primary key,                         -- e.g. sales-lead, daily-report, danny-macbook
  name           text not null,
  kind           text not null default 'cloud' check (kind in ('cloud', 'local', 'routine', 'human')),
  role           text,
  host           text,                                     -- machine name / environment
  status         text not null default 'idle'
                   check (status in ('working', 'waiting', 'blocked', 'error', 'idle', 'done')),
  task           text,
  next           text,
  last_heartbeat timestamptz,
  meta           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.agent_tokens (
  id          uuid primary key default gen_random_uuid(),
  agent_id    text not null references public.agents(id) on delete cascade,
  token_hash  text not null unique,                        -- sha256 hex of the bearer token
  label       text,
  allow_agents text[] not null default '{}',               -- extra agent ids this token may report for (one laptop, many agents)
  created_at  timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at  timestamptz
);

create table if not exists public.runs (
  id             text primary key,                         -- Claude session id, or a generated id
  agent_id       text not null references public.agents(id) on delete cascade,
  kind           text not null default 'cloud' check (kind in ('cloud', 'local', 'routine')),
  schedule_id    text,                                     -- set when a routine started the run
  host           text,
  cwd            text,
  status         text not null default 'running' check (status in ('running', 'done', 'failed')),
  started_at     timestamptz not null default now(),
  last_heartbeat timestamptz not null default now(),
  ended_at       timestamptz,
  tool_calls     integer not null default 0,
  last_tool      text,
  summary        text
);
create index if not exists runs_agent_started on public.runs (agent_id, started_at desc);

create table if not exists public.events (
  id       bigint generated always as identity primary key,
  ts       timestamptz not null default now(),
  agent_id text references public.agents(id) on delete set null,
  run_id   text references public.runs(id) on delete set null,
  kind     text not null default 'note'
             check (kind in ('email', 'reply', 'task', 'report', 'research', 'blocked', 'error', 'note', 'approval')),
  title    text not null,
  detail   text,
  data     jsonb not null default '{}'::jsonb
);
create index if not exists events_ts on public.events (ts desc);

-- ---------------------------------------------------------------- schedules (routines)
create table if not exists public.schedules (
  id              text primary key,                        -- trig_... for Claude routines, or a local name
  name            text not null,
  source          text not null default 'claude' check (source in ('claude', 'local', 'github')),
  agent_id        text references public.agents(id) on delete set null,
  cron            text,
  enabled         boolean not null default true,
  next_run_at     timestamptz,
  last_fired_at   timestamptz,
  last_run_status text,
  last_failure    text,
  grace_minutes   integer not null default 20,             -- how late a run may start before it counts as missed
  synced_at       timestamptz,
  updated_at      timestamptz not null default now()
);

create table if not exists public.schedule_runs (
  id          bigint generated always as identity primary key,
  schedule_id text not null references public.schedules(id) on delete cascade,
  run_id      text references public.runs(id) on delete set null,
  fired_at    timestamptz not null default now(),
  status      text not null default 'started' check (status in ('started', 'succeeded', 'failed')),
  note        text
);
create index if not exists schedule_runs_fired on public.schedule_runs (schedule_id, fired_at desc);

-- ---------------------------------------------------------------- approvals
create table if not exists public.approvals (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  agent_id      text references public.agents(id) on delete set null,
  kind          text not null default 'send_email' check (kind in ('send_email', 'follow_up', 'task', 'other')),
  title         text not null,
  summary       text,
  payload       jsonb not null default '{}'::jsonb,        -- send_email: {to, cc, subject, html, reply_thread_id}
  priority      smallint not null default 2 check (priority between 1 and 3),
  due           date,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected', 'executed', 'failed', 'cancelled')),
  decided_by    text,
  decided_at    timestamptz,
  decision_note text,
  executed_at   timestamptz,
  result        jsonb
);
create index if not exists approvals_status on public.approvals (status, created_at);

-- People may only move an approval between pending / approved / rejected / cancelled.
-- Executed / failed are reserved for agents (service role), which bypass RLS and this check.
create or replace function public.guard_approval_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.status not in ('pending', 'approved', 'rejected', 'cancelled') then
    raise exception 'status % can only be set by an agent', new.status;
  end if;
  if old.status not in ('pending', 'approved') then
    raise exception 'approval already %', old.status;
  end if;
  if new.payload is distinct from old.payload and old.status <> 'pending' then
    raise exception 'payload can only be edited while pending';
  end if;
  if new.executed_at is distinct from old.executed_at or new.result is distinct from old.result then
    raise exception 'execution fields can only be set by an agent';
  end if;
  if new.status is distinct from old.status then
    new.decided_by := lower(auth.jwt() ->> 'email');
    new.decided_at := now();
  end if;
  return new;
end $$;
drop trigger if exists approvals_guard on public.approvals;
create trigger approvals_guard before update on public.approvals
  for each row execute function public.guard_approval_update();

-- ---------------------------------------------------------------- sales data
create table if not exists public.pipeline (
  id         text primary key,
  company    text not null,
  market     text,
  segment    text,
  stage      text not null default 'researched'
               check (stage in ('researched', 'contacted', 'replied', 'meeting', 'proposal', 'won', 'lost', 'hold')),
  next       text,
  owner      text,
  last_touch timestamptz,
  value_note text,
  notes      text,
  updated_at timestamptz not null default now()
);

create table if not exists public.prospects (
  id           text primary key,
  company      text not null,
  website      text,
  email_public text,                                       -- business address published on the company site only
  contact_form text,
  country      text,
  city         text,
  segment      text,
  evidence     text,
  angle        text,
  status       text not null default 'queued' check (status in ('queued', 'contacted', 'hold', 'skip')),
  hold_reason  text,
  source       text,
  contacted_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.metrics (
  date        date primary key,
  emails_sent integer not null default 0,
  replies     integer not null default 0,
  new_leads   integer not null default 0,
  proposals   integer not null default 0,
  meetings    integer not null default 0,
  note        text,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- live views (no cron needed)
create or replace view public.v_agents with (security_invoker = on) as
select a.*,
       case
         when a.kind = 'human' then a.status
         when a.status in ('working', 'waiting', 'blocked')
              and (a.last_heartbeat is null or a.last_heartbeat < now() - interval '15 minutes') then 'stale'
         else a.status
       end as live_status,
       (select count(*) from public.runs r where r.agent_id = a.id and r.status = 'running'
          and r.last_heartbeat > now() - interval '15 minutes') as active_runs
from public.agents a;

create or replace view public.v_runs with (security_invoker = on) as
select r.*,
       case when r.status = 'running' and r.last_heartbeat < now() - interval '15 minutes' then 'stale'
            else r.status end as live_status
from public.runs r;

create or replace view public.v_schedules with (security_invoker = on) as
select s.*,
       (select max(sr.fired_at) from public.schedule_runs sr where sr.schedule_id = s.id) as last_reported_at,
       case
         when not s.enabled then 'disabled'
         when s.last_run_status ilike '%fail%' then 'failed'
         when s.next_run_at is not null and s.next_run_at < now() - make_interval(mins => s.grace_minutes)
              and coalesce(greatest(s.last_fired_at,
                     (select max(sr.fired_at) from public.schedule_runs sr where sr.schedule_id = s.id)),
                   'epoch'::timestamptz) < s.next_run_at then 'missed'
         else 'ok'
       end as health
from public.schedules s;

-- ---------------------------------------------------------------- row level security
do $$
declare t text;
begin
  foreach t in array array['admins','agents','agent_tokens','runs','events','schedules','schedule_runs',
                           'approvals','pipeline','prospects','metrics'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- read: any listed admin
do $$
declare t text;
begin
  foreach t in array array['agents','runs','events','schedules','schedule_runs','approvals','pipeline','prospects','metrics'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_admin())', t || '_read', t);
  end loop;
end $$;

drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select to authenticated using (public.is_admin());
drop policy if exists admins_write on public.admins;
create policy admins_write on public.admins for all to authenticated
  using (public.admin_role() = 'owner') with check (public.admin_role() = 'owner');

-- tokens: owner may list and revoke; hashes are never selectable by anyone but the owner
drop policy if exists agent_tokens_owner on public.agent_tokens;
create policy agent_tokens_owner on public.agent_tokens for all to authenticated
  using (public.admin_role() = 'owner') with check (public.admin_role() = 'owner');

-- owner registers agents (and mints their tokens from the web app)
drop policy if exists agents_owner_write on public.agents;
create policy agents_owner_write on public.agents for all to authenticated
  using (public.admin_role() = 'owner') with check (public.admin_role() = 'owner');
drop policy if exists schedules_owner_write on public.schedules;
create policy schedules_owner_write on public.schedules for all to authenticated
  using (public.admin_role() = 'owner') with check (public.admin_role() = 'owner');

-- approvals: approvers decide; agents create them through the API
drop policy if exists approvals_decide on public.approvals;
create policy approvals_decide on public.approvals for update to authenticated
  using (public.can_approve()) with check (public.can_approve());

-- people may correct sales data by hand
do $$
declare t text;
begin
  foreach t in array array['pipeline','prospects','metrics'] loop
    execute format('drop policy if exists %I on public.%I', t || '_edit', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.can_approve()) with check (public.can_approve())', t || '_edit', t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.approvals, public.pipeline, public.prospects, public.metrics,
  public.admins, public.agent_tokens, public.agents, public.schedules to authenticated;
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------- realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.agents, public.runs, public.events, public.schedules, public.schedule_runs,
      public.approvals, public.pipeline, public.metrics;
  end if;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------- housekeeping
-- Keep the events table small enough for the free tier: drop events older than 90 days.
create or replace function public.prune_events() returns void
language sql security definer set search_path = public as $$
  delete from public.events where ts < now() - interval '90 days';
$$;

-- ---------------------------------------------------------------- API helpers (service role only)
-- Heartbeats update a run in place; a run whose "start" was missed is created on first contact.
create or replace function public.agent_bump_run(p_id text, p_patch jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.runs set
    last_heartbeat = coalesce((p_patch ->> 'last_heartbeat')::timestamptz, now()),
    status         = coalesce(p_patch ->> 'status', status),
    ended_at       = coalesce((p_patch ->> 'ended_at')::timestamptz, ended_at),
    summary        = coalesce(p_patch ->> 'summary', summary),
    last_tool      = coalesce(p_patch ->> 'last_tool', last_tool),
    tool_calls     = tool_calls + coalesce((p_patch ->> 'add_tool_calls')::integer, 0)
  where id = p_id;
end $$;
revoke all on function public.agent_bump_run(text, jsonb) from public, anon, authenticated;
grant execute on function public.agent_bump_run(text, jsonb) to service_role;
