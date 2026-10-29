#!/usr/bin/env python3
"""agentops — report agent status to Agent Ops and work the approval queue.

Standard library only, so it runs the same in Claude Code cloud sessions and on a local machine.

Configuration (environment variables):
  AGENT_OPS_URL    https://<project-ref>.supabase.co/functions/v1/agent-api
  AGENT_OPS_TOKEN  this agent's token (minted in the web app, Settings (Cài đặt) → Tạo token)
  AGENT_OPS_AGENT  agent id to report as (default: <kind>-<hostname>)
  AGENT_OPS_NAME   display name (default: the agent id)
  AGENT_OPS_ROLE   short role text shown on the dashboard
  AGENT_OPS_KIND   cloud | local | routine (default: cloud inside Claude Code on the web, else local)
Missing configuration is not an error for hooks: they exit 0 without doing anything.

Examples:
  agentops.py hook start|tool|stop|end     (called by .claude/settings.json hooks, reads hook JSON on stdin)
  agentops.py status --status working --task "Gửi 12 email Úc" --next "Báo cáo 17h45"
  agentops.py event --kind email --title "Gửi 12 email Úc đợt 3" --detail "Code Squirrel, Pixel"
  agentops.py routine-start --schedule trig_015EJPCfMUW8xvtjrytX8SJA
  agentops.py approval-create --file draft.json        (draft: {kind,title,summary,payload:{to,cc,subject,html}})
  agentops.py approvals --status approved              (prints JSON)
  agentops.py approval-result <id> --status executed --result '{"message_id":"..."}'
  agentops.py schedules-sync --file triggers.json      (raw list_triggers payload)
  agentops.py upsert pipeline --file rows.json         (also: prospects, metrics)
"""
import argparse
import json
import os
import socket
import sys
import time
import urllib.error
import urllib.request

TOOL_BEAT_SECONDS = 60


def config():
    url = os.environ.get("AGENT_OPS_URL", "").rstrip("/")
    token = os.environ.get("AGENT_OPS_TOKEN", "")
    remote = bool(os.environ.get("CLAUDE_CODE_REMOTE") or os.environ.get("CLAUDE_CODE_REMOTE_SDK_URL"))
    kind = os.environ.get("AGENT_OPS_KIND") or ("cloud" if remote else "local")
    host = os.environ.get("AGENT_OPS_HOST") or ("claude-cloud" if remote else socket.gethostname())
    agent = os.environ.get("AGENT_OPS_AGENT") or f"{kind}-{host}".lower().replace(" ", "-")[:80]
    return {
        "url": url, "token": token, "kind": kind, "host": host, "agent": agent,
        "name": os.environ.get("AGENT_OPS_NAME") or agent, "role": os.environ.get("AGENT_OPS_ROLE"),
    }


def call(cfg, method, path, body=None, timeout=8):
    if not cfg["url"] or not cfg["token"]:
        raise RuntimeError("AGENT_OPS_URL and AGENT_OPS_TOKEN must be set")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(cfg["url"] + path, data=data, method=method, headers={
        "authorization": "Bearer " + cfg["token"], "content-type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:500]
        raise RuntimeError(f"HTTP {e.code}: {detail}") from None


def agent_block(cfg):
    out = {"id": cfg["agent"], "name": cfg["name"], "kind": "cloud" if cfg["kind"] == "routine" else cfg["kind"], "host": cfg["host"]}
    if cfg["role"]:
        out["role"] = cfg["role"]
    return out


def run_kind(cfg):
    return cfg["kind"] if cfg["kind"] in ("cloud", "local", "routine") else "cloud"


def read_hook_input():
    if sys.stdin.isatty():
        return {}
    try:
        return json.loads(sys.stdin.read() or "{}")
    except ValueError:
        return {}


def hook(cfg, phase):
    """Called from Claude Code hooks. Never fails the session: errors are swallowed."""
    if not cfg["url"] or not cfg["token"]:
        return 0
    data = read_hook_input()
    session = data.get("session_id") or os.environ.get("CLAUDE_CODE_SESSION_ID") or "unknown"
    run = {"id": session, "kind": run_kind(cfg), "host": cfg["host"], "cwd": data.get("cwd") or os.getcwd()}
    body = {"agent": agent_block(cfg), "run": run}
    stamp = os.path.join("/tmp", f"agentops-{session}.beat")
    if phase == "start":
        body.update(phase="start", status="working", task=os.environ.get("AGENT_OPS_TASK") or f"Session {session[-8:]} bắt đầu")
    elif phase == "tool":
        # Count every tool call locally; send at most one heartbeat per TOOL_BEAT_SECONDS with the running total.
        pending = 1
        try:
            last_sent = os.path.getmtime(stamp)  # mtime = when the last heartbeat was sent
            with open(stamp, encoding="utf-8") as f:
                pending = int(f.read().strip() or 0) + 1
            if time.time() - last_sent < TOOL_BEAT_SECONDS:
                with open(stamp, "w", encoding="utf-8") as f:
                    f.write(str(pending))
                os.utime(stamp, (last_sent, last_sent))
                return 0
        except (OSError, ValueError):
            pass
        body.update(phase="tool", status="working", tool=data.get("tool_name"), tools=pending)
    elif phase == "stop":  # end of a turn: the agent is waiting for its next instruction
        body.update(phase="beat", status="idle")
    elif phase == "end":
        body.update(phase="stop", status="idle")
        body["run"]["status"] = "done"
    try:
        call(cfg, "POST", "/heartbeat", body, timeout=5)
        with open(stamp, "w", encoding="utf-8") as f:
            f.write("0")
    except Exception as e:  # noqa: BLE001 - a hook must never break the session
        print(f"agentops: {e}", file=sys.stderr)
    return 0


def load_json(arg_file, arg_json):
    if arg_file:
        with open(arg_file, encoding="utf-8") as f:
            return json.load(f)
    if arg_json:
        return json.loads(arg_json)
    return json.load(sys.stdin)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    h = sub.add_parser("hook"); h.add_argument("phase", choices=["start", "tool", "stop", "end"])
    s = sub.add_parser("status")
    s.add_argument("--status", choices=["working", "waiting", "blocked", "error", "idle", "done"], required=True)
    s.add_argument("--task"); s.add_argument("--next")
    e = sub.add_parser("event")
    e.add_argument("--kind", default="note"); e.add_argument("--title", required=True); e.add_argument("--detail")
    r = sub.add_parser("routine-start"); r.add_argument("--schedule", required=True); r.add_argument("--task")
    c = sub.add_parser("approval-create"); c.add_argument("--file"); c.add_argument("--json")
    l = sub.add_parser("approvals"); l.add_argument("--status", default="approved"); l.add_argument("--kind")
    x = sub.add_parser("approval-result"); x.add_argument("id"); x.add_argument("--status", choices=["executed", "failed"], required=True)
    x.add_argument("--result", default="{}"); x.add_argument("--title")
    y = sub.add_parser("schedules-sync"); y.add_argument("--file"); y.add_argument("--json")
    u = sub.add_parser("upsert"); u.add_argument("table", choices=["pipeline", "prospects", "metrics"]); u.add_argument("--file"); u.add_argument("--json")
    args = ap.parse_args(argv)
    cfg = config()

    if args.cmd == "hook":
        return hook(cfg, args.phase)

    session = os.environ.get("CLAUDE_CODE_SESSION_ID")
    if args.cmd == "status":
        body = {"agent": agent_block(cfg), "status": args.status}
        if args.task is not None: body["task"] = args.task
        if args.next is not None: body["next"] = args.next
        if session: body.update(run={"id": session, "kind": run_kind(cfg)}, phase="beat")
        out = call(cfg, "POST", "/heartbeat", body)
    elif args.cmd == "event":
        out = call(cfg, "POST", "/event", {"agent": cfg["agent"], "run_id": session, "kind": args.kind, "title": args.title, "detail": args.detail})
    elif args.cmd == "routine-start":
        run_id = session or f"routine-{args.schedule}-{int(time.time())}"
        out = call(cfg, "POST", "/heartbeat", {
            "agent": agent_block(cfg), "status": "working", "task": args.task or f"Routine {args.schedule} đang chạy", "phase": "start",
            "run": {"id": run_id, "kind": "routine", "schedule_id": args.schedule, "host": cfg["host"], "cwd": os.getcwd()},
        })
    elif args.cmd == "approval-create":
        draft = load_json(args.file, args.json)
        draft.setdefault("agent", cfg["agent"])
        out = call(cfg, "POST", "/approvals", draft)
    elif args.cmd == "approvals":
        q = f"?status={args.status}" + (f"&kind={args.kind}" if args.kind else "")
        out = call(cfg, "GET", "/approvals" + q)
    elif args.cmd == "approval-result":
        out = call(cfg, "POST", f"/approvals/{args.id}/result", {"agent": cfg["agent"], "status": args.status, "result": json.loads(args.result), "title": args.title})
    elif args.cmd == "schedules-sync":
        payload = load_json(args.file, args.json)
        if isinstance(payload, dict):
            payload = payload.get("data") or payload.get("schedules") or []
        out = call(cfg, "POST", "/schedules/sync", {"schedules": payload})
    elif args.cmd == "upsert":
        rows = load_json(args.file, args.json)
        out = call(cfg, "POST", f"/upsert/{args.table}", {"rows": rows if isinstance(rows, list) else [rows]})
    print(json.dumps(out, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except RuntimeError as err:
        print(f"agentops: {err}", file=sys.stderr)
        sys.exit(1)
