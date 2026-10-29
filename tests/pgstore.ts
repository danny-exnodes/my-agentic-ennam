// PGlite implementation of the agent-api Store, used by tests.
import type { Store } from '../supabase/functions/agent-api/core.ts';
export function makeStore(db: any): Store {
const ident = (s: string) => '"' + s.replace(/"/g, '') + '"';
return {
  async findToken(h) { return ((await db.query('select id, agent_id, allow_agents, revoked_at from agent_tokens where token_hash=$1', [h])).rows[0] as any) ?? null; },
  async touchToken(id) { await db.query('update agent_tokens set last_used_at=now() where id=$1', [id]); },
  async upsert(table, rows, key, ignore = false) {
    for (const r of rows) {
      const cols = Object.keys(r), vals = cols.map(c => (r[c] !== null && typeof r[c] === 'object' && !Array.isArray(r[c])) ? JSON.stringify(r[c]) : r[c]);
      const set = cols.filter(c => c !== key).map(c => `${ident(c)}=excluded.${ident(c)}`).join(',');
      await db.query(`insert into ${ident(table)} (${cols.map(ident).join(',')}) values (${cols.map((_, i) => '$' + (i + 1)).join(',')}) on conflict (${ident(key)}) do ${set && !ignore ? 'update set ' + set : 'nothing'}`, vals);
    }
  },
  async insert(table, r) {
    const cols = Object.keys(r), vals = cols.map(c => (r[c] !== null && typeof r[c] === 'object') ? JSON.stringify(r[c]) : r[c]);
    return (await db.query(`insert into ${ident(table)} (${cols.map(ident).join(',')}) values (${cols.map((_, i) => '$' + (i + 1)).join(',')}) returning id`, vals)).rows[0] as any;
  },
  async update(table, key, value, patch) {
    const cols = Object.keys(patch);
    return (await db.query(`update ${ident(table)} set ${cols.map((c, i) => ident(c) + '=$' + (i + 2)).join(',')} where ${ident(key)}=$1 returning 1`, [value, ...cols.map(c => patch[c])])).rows.length;
  },
  async bumpRun(id, patch) { await db.query('select agent_bump_run($1, $2::jsonb)', [id, JSON.stringify(patch)]); },
  async listApprovals(status, kind, limit) { return (await db.query(`select * from approvals where status=$1 and ($2::text is null or kind=$2) order by created_at limit $3`, [status, kind, limit])).rows as any; },
  async finishApproval(id, status, result) { return (await db.query(`update approvals set status=$2, result=$3::jsonb, executed_at=now() where id=$1 and status='approved' returning id`, [id, status, JSON.stringify(result)])).rows.length === 1; },
};
}
