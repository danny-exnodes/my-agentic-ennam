// Supabase Edge Function entry point for the Agent Ops API (deployed with verify_jwt = false;
// callers authenticate with their own agent token, checked in core.ts).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { handle, HttpError, type Json, type Store } from "./core.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new HttpError(500, res.error.message);
  return res.data;
}

const store: Store = {
  async findToken(hash) {
    const rows = check(await db.from("agent_tokens").select("id, agent_id, allow_agents, revoked_at").eq("token_hash", hash).limit(1));
    return rows?.[0] ?? null;
  },
  async touchToken(id) {
    await db.from("agent_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", id);
  },
  async upsert(table, rows, onConflict, ignoreDuplicates = false) {
    check(await db.from(table).upsert(rows, { onConflict, ignoreDuplicates }));
  },
  async insert(table, row) {
    const rows = check(await db.from(table).insert(row).select("id"));
    return (rows?.[0] ?? {}) as Json;
  },
  async update(table, key, value, patch) {
    const rows = check(await db.from(table).update(patch).eq(key, value).select(key));
    return (rows ?? []).length;
  },
  async bumpRun(runId, patch) {
    check(await db.rpc("agent_bump_run", { p_id: runId, p_patch: patch }));
  },
  async listApprovals(status, kind, limit) {
    let q = db.from("approvals").select("*").eq("status", status).order("created_at").limit(limit);
    if (kind) q = q.eq("kind", kind);
    return (check(await q) ?? []) as Json[];
  },
  async finishApproval(id, status, result) {
    const rows = check(await db.from("approvals")
      .update({ status, result, executed_at: new Date().toISOString() })
      .eq("id", id).eq("status", "approved").select("id"));
    return (rows ?? []).length === 1;
  },
};

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(request.url);
  try {
    const body = request.method === "POST" ? ((await request.json().catch(() => ({}))) as Json) : {};
    const out = await handle(store, request.method, url.pathname, url.searchParams, request.headers.get("authorization"), body);
    return Response.json(out, { headers: CORS });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status, headers: CORS });
  }
});
