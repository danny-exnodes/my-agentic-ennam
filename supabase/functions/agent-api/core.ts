// Agent Ops API core: request routing and validation, independent of the storage backend.
// Agents call it with `Authorization: Bearer <agent token>`; only a sha256 hash of each token is stored.

export type Json = Record<string, unknown>;

export interface TokenRow {
  id: string;
  agent_id: string;
  allow_agents: string[];
  revoked_at: string | null;
}

export interface Store {
  findToken(hash: string): Promise<TokenRow | null>;
  touchToken(id: string): Promise<void>;
  upsert(table: string, rows: Json[], onConflict: string, ignoreDuplicates?: boolean): Promise<void>;
  insert(table: string, row: Json): Promise<Json>;
  update(table: string, key: string, value: string, patch: Json): Promise<number>;
  bumpRun(runId: string, patch: Json): Promise<void>;
  listApprovals(status: string, kind: string | null, limit: number): Promise<Json[]>;
  finishApproval(id: string, status: string, result: Json): Promise<boolean>;
}

const AGENT_KINDS = ["cloud", "local", "routine"];
const AGENT_STATUS = ["working", "waiting", "blocked", "error", "idle", "done"];
const EVENT_KINDS = ["email", "reply", "task", "report", "research", "blocked", "error", "note", "approval"];
const APPROVAL_KINDS = ["send_email", "follow_up", "task", "other"];
const STAGES = ["researched", "contacted", "replied", "meeting", "proposal", "won", "lost", "hold"];
const PROSPECT_STATUS = ["queued", "contacted", "hold", "skip"];

// Columns an agent may write per sales table (anything else is dropped).
const UPSERT_TABLES: Record<string, { key: string; cols: string[]; required?: string[] }> = {
  pipeline: { key: "id", required: ["company"], cols: ["id", "company", "market", "segment", "stage", "next", "owner", "last_touch", "value_note", "notes"] },
  prospects: {
    key: "id",
    required: ["company"],
    cols: ["id", "company", "website", "email_public", "contact_form", "country", "city", "segment", "evidence", "angle",
      "status", "hold_reason", "source", "contacted_at"],
  },
  metrics: { key: "date", cols: ["date", "emails_sent", "replies", "new_leads", "proposals", "meetings", "note"] },
};

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function str(v: unknown, max = 2000): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw new HttpError(400, "expected a string");
  return v.slice(0, max);
}
function req(v: unknown, name: string, max = 2000): string {
  const s = str(v, max);
  if (!s) throw new HttpError(400, `${name} is required`);
  return s;
}
function oneOf(v: unknown, allowed: string[], name: string, fallback?: string): string {
  const s = (v ?? fallback) as string;
  if (!allowed.includes(s)) throw new HttpError(400, `${name} must be one of ${allowed.join(", ")}`);
  return s;
}
function isoOrNull(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) throw new HttpError(400, `invalid timestamp ${v}`);
  return d.toISOString();
}
function pick(row: Json, cols: string[]): Json {
  const out: Json = {};
  for (const c of cols) if (c in row) out[c] = row[c];
  return out;
}

export async function handle(
  store: Store,
  method: string,
  path: string,
  query: URLSearchParams,
  authHeader: string | null,
  body: Json,
  now = new Date(),
): Promise<Json> {
  const token = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  if (token.length < 24) throw new HttpError(401, "missing agent token");
  const row = await store.findToken(await sha256Hex(token));
  if (!row || row.revoked_at) throw new HttpError(401, "invalid or revoked agent token");
  await store.touchToken(row.id);

  const ts = now.toISOString();
  const allowed = new Set([row.agent_id, ...(row.allow_agents ?? [])]);
  const agentOf = (v: unknown) => {
    const id = str(v, 80) ?? row.agent_id;
    if (!allowed.has(id)) throw new HttpError(403, `token may not report for agent ${id}`);
    return id;
  };
  const seg = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  // Supabase passes the function name as the first segment.
  if (seg[0] === "agent-api") seg.shift();
  const route = `${method} /${seg.join("/")}`;

  if (route === "POST /heartbeat") {
    const agent = (body.agent ?? {}) as Json;
    const agentId = agentOf(agent.id);
    const agentPatch: Json = { id: agentId, last_heartbeat: ts, updated_at: ts };
    if (agent.name) agentPatch.name = req(agent.name, "agent.name", 120);
    if (agent.kind) agentPatch.kind = oneOf(agent.kind, AGENT_KINDS, "agent.kind");
    if (agent.role !== undefined) agentPatch.role = str(agent.role, 200);
    if (agent.host !== undefined) agentPatch.host = str(agent.host, 200);
    if (body.status) agentPatch.status = oneOf(body.status, AGENT_STATUS, "status");
    if (body.task !== undefined) agentPatch.task = str(body.task, 500);
    if (body.next !== undefined) agentPatch.next = str(body.next, 500);
    if (!agentPatch.name) agentPatch.name = agentId;
    await store.upsert("agents", [agentPatch], "id");

    const run = (body.run ?? null) as Json | null;
    if (run && run.id) {
      const runId = req(run.id, "run.id", 120);
      const phase = oneOf(body.phase, ["start", "tool", "stop", "beat"], "phase", "beat");
      if (phase === "start") {
        await store.upsert("runs", [{
          id: runId, agent_id: agentId, kind: oneOf(run.kind, AGENT_KINDS, "run.kind", "cloud"),
          schedule_id: str(run.schedule_id, 120), host: str(run.host, 200), cwd: str(run.cwd, 500),
          status: "running", started_at: ts, last_heartbeat: ts, ended_at: null,
        }], "id");
        if (run.schedule_id) {
          // The routine may report before its schedule was synced: create a placeholder, never overwrite.
          await store.upsert("schedules", [{ id: str(run.schedule_id, 120), name: str(run.schedule_id, 120), updated_at: ts }], "id", true);
          await store.insert("schedule_runs", { schedule_id: str(run.schedule_id, 120), run_id: runId, fired_at: ts, status: "started" });
        }
      } else if (phase === "stop") {
        await store.bumpRun(runId, { status: oneOf(run.status, ["done", "failed"], "run.status", "done"), ended_at: ts, last_heartbeat: ts, summary: str(run.summary, 1000) });
      } else {
        const tools = phase === "tool" ? Math.min(10_000, Math.max(1, Number(body.tools ?? 1) || 1)) : 0;
        await store.bumpRun(runId, { last_heartbeat: ts, last_tool: str(body.tool, 120), add_tool_calls: tools });
      }
    }
    return { ok: true, agent: agentId, at: ts };
  }

  if (route === "POST /event") {
    const ev = await store.insert("events", {
      ts: isoOrNull(body.ts) ?? ts, agent_id: agentOf(body.agent), run_id: str(body.run_id, 120),
      kind: oneOf(body.kind, EVENT_KINDS, "kind", "note"), title: req(body.title, "title", 300),
      detail: str(body.detail, 2000), data: (body.data && typeof body.data === "object") ? body.data : {},
    });
    return { ok: true, id: ev.id };
  }

  if (route === "POST /approvals") {
    const kind = oneOf(body.kind, APPROVAL_KINDS, "kind", "send_email");
    const payload = (body.payload ?? {}) as Json;
    if (kind === "send_email") {
      const to = payload.to;
      if (!Array.isArray(to) || to.length === 0) throw new HttpError(400, "payload.to must be a non-empty array");
      req(payload.subject, "payload.subject", 300);
      req(payload.html, "payload.html", 100_000);
    }
    const ap = await store.insert("approvals", {
      agent_id: agentOf(body.agent), kind, title: req(body.title, "title", 300), summary: str(body.summary, 2000),
      payload, priority: Math.min(3, Math.max(1, Number(body.priority ?? 2) || 2)), due: str(body.due, 10), status: "pending",
    });
    await store.insert("events", { ts, agent_id: agentOf(body.agent), kind: "approval", title: `Chờ duyệt: ${req(body.title, "title", 300)}`, data: { approval_id: ap.id } });
    return { ok: true, id: ap.id };
  }

  if (route === "GET /approvals") {
    const status = oneOf(query.get("status") ?? "approved", ["pending", "approved", "rejected", "executed", "failed"], "status");
    const kind = query.get("kind");
    if (kind) oneOf(kind, APPROVAL_KINDS, "kind");
    return { ok: true, approvals: await store.listApprovals(status, kind, Math.min(100, Number(query.get("limit") ?? 50) || 50)) };
  }

  if (method === "POST" && seg[0] === "approvals" && seg.length === 3 && seg[2] === "result") {
    const status = oneOf(body.status, ["executed", "failed"], "status");
    const done = await store.finishApproval(seg[1], status, (body.result ?? {}) as Json);
    if (!done) throw new HttpError(409, "approval is not in approved state");
    await store.insert("events", { ts, agent_id: agentOf(body.agent), kind: status === "executed" ? "email" : "error", title: `${status === "executed" ? "Đã thực hiện" : "Thất bại"}: ${str(body.title, 300) ?? seg[1]}`, data: { approval_id: seg[1] } });
    return { ok: true };
  }

  if (route === "POST /schedules/sync") {
    const list = body.schedules;
    if (!Array.isArray(list)) throw new HttpError(400, "schedules must be an array");
    const rows = list.slice(0, 200).map((s: Json) => ({
      id: req(s.id, "schedule.id", 120), name: req(s.name ?? s.id, "schedule.name", 200),
      source: oneOf(s.source, ["claude", "local", "github"], "source", "claude"), cron: str(s.cron ?? s.cron_expression, 120),
      enabled: s.enabled !== false, next_run_at: isoOrNull(s.next_run_at), last_fired_at: isoOrNull(s.last_fired_at ?? (s.last_run as Json)?.fired_at),
      last_run_status: str(s.last_run_status ?? (s.last_run as Json)?.status, 80), last_failure: str(s.last_failure ?? (s.last_run as Json)?.failure_reason, 200),
      agent_id: s.agent_id ? agentOf(s.agent_id) : null, synced_at: ts, updated_at: ts,
    }));
    if (rows.length) await store.upsert("schedules", rows, "id");
    return { ok: true, count: rows.length };
  }

  if (method === "POST" && seg[0] === "upsert" && seg.length === 2 && UPSERT_TABLES[seg[1]]) {
    const spec = UPSERT_TABLES[seg[1]];
    const list = body.rows;
    if (!Array.isArray(list) || list.length === 0) throw new HttpError(400, "rows must be a non-empty array");
    const rows = list.slice(0, 500).map((r: Json) => {
      const out = pick(r, spec.cols);
      if (!out[spec.key]) throw new HttpError(400, `${spec.key} is required`);
      if (seg[1] === "pipeline" && out.stage) oneOf(out.stage, STAGES, "stage");
      if (seg[1] === "prospects" && out.status) oneOf(out.status, PROSPECT_STATUS, "status");
      if (seg[1] !== "metrics") out.updated_at = ts;
      return out;
    });
    // Rows carrying every required column are upserted; partial rows only patch existing records.
    const full = rows.filter((r) => (spec.required ?? []).every((c) => r[c]));
    const partial = rows.filter((r) => !full.includes(r));
    if (full.length) await store.upsert(seg[1], full, spec.key);
    let missing = 0;
    for (const r of partial) {
      const { [spec.key]: keyValue, ...patch } = r;
      if ((await store.update(seg[1], spec.key, String(keyValue), patch)) === 0) missing++;
    }
    return { ok: true, count: rows.length - missing, missing };
  }

  throw new HttpError(404, `no route ${route}`);
}
