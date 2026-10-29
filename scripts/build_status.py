#!/usr/bin/env python3
"""Build site/data/status.json for the public Agent Ops page.

Usage:
  build_status.py EXPORT_DIR [--triggers triggers.json] [--sessions sessions.json]

EXPORT_DIR holds the Agent Ops database exported with ArtifactData `list ... out_dir`
(one JSON file per document under agents/, events/, asks/, metrics/, pipeline/).
--triggers / --sessions take raw list_triggers / list_sessions payloads; only ids in
config/public-allowlist.json are kept, and only display-safe fields are copied.
"""
import argparse
import datetime as dt
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
COLLECTIONS = ["agents", "events", "asks", "metrics", "pipeline"]
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"(?<!\d)(?:\+?84|0)\d[\d .-]{7,}\d")


def scrub(value):
    """Drop anything that looks like an email address or phone number before publishing."""
    if isinstance(value, str):
        return PHONE.sub("[đã ẩn]", EMAIL.sub("[đã ẩn]", value))
    if isinstance(value, list):
        return [scrub(v) for v in value]
    if isinstance(value, dict):
        return {k: scrub(v) for k, v in value.items()}
    return value


def load_collection(export_dir, name):
    folder = export_dir / name
    if not folder.is_dir():
        return []
    return [scrub(json.loads(p.read_text(encoding="utf-8"))) for p in sorted(folder.glob("*.json"))]


def load_payload(path):
    data = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    if isinstance(data, dict) and "ccr" in data:
        data = data["ccr"]
    return data.get("data", []) if isinstance(data, dict) else data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("export_dir")
    ap.add_argument("--triggers")
    ap.add_argument("--sessions")
    ap.add_argument("--out", default=str(ROOT / "site" / "data" / "status.json"))
    args = ap.parse_args()

    allow = json.loads((ROOT / "config" / "public-allowlist.json").read_text(encoding="utf-8"))
    out_path = pathlib.Path(args.out)
    previous = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}
    now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    status = {"generatedAt": now}
    for name in COLLECTIONS:
        status[name] = load_collection(pathlib.Path(args.export_dir), name)

    if args.triggers:
        status["routines"] = [
            {k: t.get(k) for k in ("name", "enabled", "next_run_at", "cron_expression")}
            | {"last_run": {k: (t.get("last_run") or {}).get(k) for k in ("status", "fired_at")}}
            for t in load_payload(args.triggers) if t.get("id") in allow["trigger_ids"]
        ]
    if args.sessions:
        status["sessions"] = [
            {"title": s.get("title"), "status_bucket": s.get("status_bucket"), "updated_at": s.get("updated_at"),
             "summary": scrub(s.get("task_summary") or (s.get("post_turn_summary") or {}).get("recent_action") or "")}
            for s in load_payload(args.sessions) if s.get("id") in allow["session_ids"]
        ]
    if args.triggers or args.sessions:
        status["routinesAt"] = now
    else:
        for key in ("routines", "sessions", "routinesAt"):
            if key in previous:
                status[key] = previous[key]

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(status, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {out_path} ({', '.join(f'{k}={len(status.get(k) or [])}' for k in COLLECTIONS + ['routines', 'sessions'])})")


if __name__ == "__main__":
    main()
