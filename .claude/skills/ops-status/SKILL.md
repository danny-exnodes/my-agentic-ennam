---
name: ops-status
description: Cách mọi agent báo trạng thái realtime lên dashboard Agent Ops (artifact có db chung) để Danny theo dõi mọi lúc mọi nơi. Dùng khi bắt đầu, xong, bị chặn, gửi email, có phản hồi, hoặc cần Danny duyệt.
---

# Ops status: báo trạng thái lên Agent Ops

Dashboard: https://claude.ai/artifact/6eHNJKrdCLh7F1c88gtj9a. Nguồn: `dashboard/agent-ops.html`.

Trang có 2 nguồn dữ liệu realtime:
1. **Routines và Sessions:** trang tự đọc qua connector Claude Code Remote (`list_triggers`, `list_sessions`) bằng quyền của người xem, làm mới mỗi 60 giây. Agent không cần ghi gì.
2. **Agents, KPI, Chờ duyệt, Pipeline, Nhật ký:** agent tự ghi bằng tool `ArtifactData` (load qua ToolSearch `select:ArtifactData`), `url` là link dashboard. Trang nhận thay đổi ngay qua `onSnapshot`.

## Quy tắc ghi
- **Luôn lấy giờ thật** bằng `date -u +%Y-%m-%dT%H:%M:%SZ`. Không ước lượng: đã từng ghi nhầm giờ tương lai.
- Gom các thay đổi vào một lệnh `batch` (tối đa 50 thao tác). Ghi đè doc đã có thì phải truyền `if_version`: đọc doc trước, hoặc dùng `version` trả về từ lần ghi trước.
- Chỉ ghi tên công ty và trạng thái. Không ghi email cá nhân hay số điện thoại.
- Nhật ký `events` dùng id `<YYYYMMDD>-<HHMMSS>-<agent>` để không trùng. Khi db quá khoảng 20.000 doc thì xoá `events` cũ hơn 30 ngày.

## Schema
| Collection / doc | Trường | Ghi khi |
|---|---|---|
| `agents/<agent-id>` | name, role, status (`working`·`waiting`·`blocked`·`error`·`idle`·`done`), task, next, updatedAt | bắt đầu / xong / chặn |
| `events/<id>` | ts, agent, kind (`email`·`reply`·`task`·`report`·`research`·`blocked`·`error`·`note`), title, detail | mỗi việc đáng kể |
| `metrics/<YYYY-MM-DD>` | date, emailsSent, replies, newLeads, proposals, meetings, note | cuối mỗi đợt việc |
| `asks/<slug>` | title, detail, priority (1 gấp · 2 · 3), due, status (`open`·`done`), createdAt | cần Danny duyệt hoặc làm |
| `pipeline/<slug>` | company, market (AU·VN·SG·US·EU·CA·NZ), segment, stage (`researched`·`contacted`·`replied`·`meeting`·`proposal`·`won`·`lost`·`hold`), next, owner, lastTouch | mỗi lần chạm khách |

Agent id hiện có: `sales-lead`, `prospect-research`, `daily-report`. Người cũng được hiện dưới dạng "agent" để theo dõi việc giao: `phoebe`, `danh-trinh`, `trinh-designer`, `marketing`.

## Ví dụ
```json
{"action":"batch","url":"https://claude.ai/artifact/6eHNJKrdCLh7F1c88gtj9a","writes":[
 {"op":"update","collection":"agents","doc_id":"sales-lead","if_version":7,"data":{"status":"working","task":"Gửi 12 email Úc đợt 3","updatedAt":"<date -u>"}},
 {"op":"set","collection":"events","doc_id":"20261030-031500-sales-lead","data":{"ts":"<date -u>","agent":"Sales Lead","kind":"email","title":"Gửi 12 email Úc đợt 3","detail":"Code Squirrel, Pixel, …"}}
]}
```

## Đồng bộ lên GitHub Pages (bản công khai)
Bản công khai: https://danny-exnodes.github.io/my-agentic-ennam/. Đây là trang tĩnh, đọc `site/data/status.json` và tự tải lại mỗi 60 giây. Đồng bộ sau mỗi đợt việc, và luôn đồng bộ trong routine 17h45:
1. Xuất db: chạy `ArtifactData list` cho từng collection `agents`, `events`, `asks`, `metrics`, `pipeline`, với `out_dir` là `<scratch>/export` và `query.limit` 1000.
2. Lưu payload của `list_triggers` và `list_sessions` (mine: true) thành file JSON.
3. `python3 scripts/build_status.py <scratch>/export --triggers t.json --sessions s.json`. Script chỉ giữ routine và session có trong `config/public-allowlist.json`, và tự xoá mọi email hay số điện thoại.
4. `python3 scripts/check_site.py`, rồi commit `site/data/status.json` và push `main`. GitHub Actions (`.github/workflows/pages.yml`) deploy trong khoảng 1 phút.
Trang công khai: ai có link cũng xem được tên công ty trong pipeline và trạng thái agent. Danny đã đồng ý điều này ngày 29/10/2026. Không bao giờ đưa email, số điện thoại, giá hay đề xuất giá vào `site/`.

## Phương án dự phòng (nếu connector hoặc artifact không dùng được)
Agent ghi `status/agents.json` và `status/events.jsonl` vào repo rồi push. Một GitHub Action cron 5 phút gọi Claude API (Messages API, model mới nhất) để tóm tắt, rồi publish trang tĩnh trên GitHub Pages. Phương án này chỉ dùng khi cần: tốn phí API và repo phải để private.
