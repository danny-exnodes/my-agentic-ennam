#!/usr/bin/env python3
"""CI guard for the public site: status.json parses and carries no email addresses or phone numbers."""
import json
import pathlib
import re
import sys

site = pathlib.Path(__file__).resolve().parent.parent / "site"
text = (site / "data" / "status.json").read_text(encoding="utf-8")
data = json.loads(text)
for key in ("generatedAt", "agents", "events", "asks", "metrics", "pipeline"):
    if key not in data:
        sys.exit(f"status.json is missing '{key}'")
leaks = re.findall(r"[\w.+-]+@[\w-]+\.[\w.-]+", text) + re.findall(r"(?<!\d)(?:\+?84|0)\d[\d .-]{7,}\d", text)
if leaks:
    sys.exit(f"status.json contains contact details: {leaks[:3]}")
for name in ("index.html", "app.js"):
    if not (site / name).is_file():
        sys.exit(f"site/{name} missing")
print("site ok:", {k: len(v) for k, v in data.items() if isinstance(v, list)})
