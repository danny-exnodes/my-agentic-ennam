// Row level security, approval guard and live views.
import fs from 'node:fs';
import { freshDb, check, MIGRATIONS } from './harness.mjs';
const db = await freshDb();
const { ok, done } = check();
const q = (s, p) => db.query(s, p);
const as = async (role, email, fn) => {
  await db.exec(`reset role; select set_config('request.jwt.claims', '${JSON.stringify({ role, email })}', false); set role ${role};`);
  try { return await fn(); } finally { await db.exec('reset role'); }
};
const err = async (p) => { try { await p; return null; } catch (e) { return e.message; } };

// seed as superuser
await db.exec(`
  insert into admins(email) values ('danny.tranhoang@exnodes.vn');
  insert into agents(id,name,kind,status,last_heartbeat) values
    ('sales-lead','Sales Lead','cloud','working', now() - interval '1 minute'),
    ('old-local','Laptop','local','working', now() - interval '2 hours');
  insert into schedules(id,name,cron,next_run_at,last_fired_at) values
    ('trig_a','Daily report','45 17 * * *', now() - interval '1 hour', now() - interval '1 day'),
    ('trig_b','Future','0 9 * * *', now() + interval '3 hours', null);
  insert into approvals(id,title,payload) values ('00000000-0000-0000-0000-000000000001','Send follow-up','{"to":["x@y.z"]}');
`);

ok((await as('authenticated', 'stranger@gmail.com', () => q('select * from agents'))).rows.length === 0, 'non-admin sees no agents');
ok(/permission denied/.test(await err(as('anon', null, () => q('select * from agents')))), 'anon cannot read');
const v = await as('authenticated', 'danny.tranhoang@exnodes.vn', () => q('select id, live_status from v_agents order by id'));
ok(v.rows.length === 2 && v.rows.find(r => r.id === 'old-local').live_status === 'stale' && v.rows.find(r => r.id === 'sales-lead').live_status === 'working', 'admin sees agents, stale detected');
const s = await as('authenticated', 'danny.tranhoang@exnodes.vn', () => q('select id, health from v_schedules order by id'));
ok(s.rows[0].health === 'missed' && s.rows[1].health === 'ok', 'missed schedule detected');
await as('authenticated', 'danny.tranhoang@exnodes.vn', () => q(`update approvals set status='approved' where id='00000000-0000-0000-0000-000000000001'`));
const a = (await q(`select status, decided_by from approvals`)).rows[0];
ok(a.status === 'approved' && a.decided_by === 'danny.tranhoang@exnodes.vn', 'admin approves, decided_by stamped');
ok(/agent/.test(await err(as('authenticated', 'danny.tranhoang@exnodes.vn', () => q(`update approvals set status='executed'`)))), 'person cannot mark executed');
ok(/pending/.test(await err(as('authenticated', 'danny.tranhoang@exnodes.vn', () => q(`update approvals set payload='{"to":["evil@x.y"]}'`)))), 'payload locked after approval');
ok(/agent/.test(await err(as('authenticated', 'danny.tranhoang@exnodes.vn', () => q(`update approvals set result='{"x":1}'`)))), 'person cannot forge result');
ok((await as('authenticated', 'stranger@gmail.com', () => q(`update approvals set status='rejected' returning id`))).rows.length === 0, 'non-admin cannot decide');
await as('service_role', null, () => q(`update approvals set status='executed', executed_at=now(), result='{"message_id":"m1"}'`));
ok((await q(`select status from approvals`)).rows[0].status === 'executed', 'service role marks executed');
await db.exec(`insert into admins(email, role) values ('viewer@exnodes.vn','viewer')`);
ok(/violates|permission/.test(await err(as('authenticated', 'viewer@exnodes.vn', () => q(`insert into agents(id,name) values ('x','x')`)))), 'viewer cannot register agents');
ok((await as('authenticated', 'viewer@exnodes.vn', () => q(`update approvals set status='rejected' returning id`))).rows.length === 0, 'viewer cannot decide approvals');
await as('authenticated', 'danny.tranhoang@exnodes.vn', () => q(`insert into agents(id,name,kind) values ('laptop','Laptop','local')`));
await as('authenticated', 'danny.tranhoang@exnodes.vn', () => q(`insert into agent_tokens(agent_id, token_hash, allow_agents) values ('laptop','abc', '{sales-lead}')`));
ok((await q(`select count(*)::int n from agent_tokens`)).rows[0].n === 1, 'owner registers agent and token');
ok((await as('authenticated', 'stranger@gmail.com', () => q('select * from agent_tokens'))).rows.length === 0, 'tokens hidden from non-owner');

// Fix-up migrations must survive a second run: CI's `supabase db push` replays any that were first applied by hand.
const fixups = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort().slice(1);
ok(await err((async () => { for (const f of fixups) await db.exec(fs.readFileSync(MIGRATIONS + f, 'utf8')); })()) === null, 'fix-up migrations re-apply cleanly');

done();
