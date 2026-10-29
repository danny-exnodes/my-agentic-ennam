#!/usr/bin/env python3
"""CI guard for the public web app in site/.

The site is public: it may only carry code plus the Supabase URL and anon key. Fails if a service_role key,
an agent token, or a data dump has slipped into site/.
"""
import base64
import json
import pathlib
import re
import sys

site = pathlib.Path(__file__).resolve().parent.parent / "site"
problems = []
for name in ("index.html", "app.js", "styles.css", "config.js"):
    if not (site / name).is_file():
        problems.append(f"site/{name} missing")

for path in site.rglob("*"):
    if path.is_dir() or path.parts[-2:-1] == ("vendor",):
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix == ".json":
        problems.append(f"{path.relative_to(site.parent)}: data files do not belong in the public site")
    if re.search(r"aops_[A-Za-z0-9_-]{20,}", text):
        problems.append(f"{path.relative_to(site.parent)}: contains an agent token")
    for jwt in re.findall(r"eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+", text):
        try:
            claims = json.loads(base64.urlsafe_b64decode(jwt + "=" * (-len(jwt) % 4)))
        except ValueError:
            continue
        if claims.get("role") != "anon":
            problems.append(f"{path.relative_to(site.parent)}: contains a '{claims.get('role')}' key; only the anon key is allowed")
    if "sb_secret_" in text:
        problems.append(f"{path.relative_to(site.parent)}: contains a Supabase secret key")

if problems:
    sys.exit("\n".join(problems))
print("site ok")
