---
name: ops-status
description: Cách mọi agent (cloud, local, routine) báo trạng thái lên hệ thống Agent Ops (Supabase), ghi nhật ký, đồng bộ lịch routine, và làm việc với hàng đợi Duyệt. Dùng khi bắt đầu, xong, bị chặn, gửi email, có phản hồi, hoặc cần Danny duyệt.
---

# Ops status: báo trạng thái lên Agent Ops

Web app: https://danny-exnodes.github.io/my-agentic-ennam/ (đăng nhập bằng email được cấp quyền). Dữ liệu nằm trong Supabase. Repo chỉ chứa code.

## Tự động (không phải làm gì)
`.claude/settings.json` gắn hook vào `scripts/agentops.py`:
- **SessionStart:** tạo hoặc cập nhật agent, mở một "run".
- **PostToolUse:** heartbeat tối đa mỗi 60 giây, đếm số lần dùng tool.
- **Stop:** agent chuyển `idle`.
- **SessionEnd:** đóng run.

Hook chạy được khi môi trường có `AGENT_OPS_URL` và `AGENT_OPS_TOKEN`. Thiếu hai biến này thì hook im lặng bỏ qua, không làm hỏng session. Agent quá 15 phút không có tín hiệu sẽ hiện **Mất kết nối**.

## Agent tự gọi (CLI, chỉ dùng thư viện chuẩn của Python)
```bash
A="python3 scripts/agentops.py"
$A status --status working --task "Gửi 12 email Úc đợt 3" --next "Báo cáo 17h45"
$A event --kind email --title "Gửi 12 email Úc đợt 3" --detail "Code Squirrel, Pixel, …"
$A routine-start --schedule trig_015EJPCfMUW8xvtjrytX8SJA     # dòng đầu tiên của mọi routine
$A upsert pipeline --json '[{"id":"pixel","company":"Pixel","market":"AU","stage":"contacted","next":"Chờ phản hồi","last_touch":"<date -u>"}]'
$A upsert metrics  --json '{"date":"2026-10-30","emails_sent":15,"replies":1,"new_leads":20,"proposals":0,"meetings":0}'
$A upsert prospects --file prospects.json
$A schedules-sync --file triggers.json      # payload thô của list_triggers
```
- `kind` của event: `email`, `reply`, `task`, `report`, `research`, `blocked`, `error`, `note`.
- `stage` của pipeline: `researched`, `contacted`, `replied`, `meeting`, `proposal`, `won`, `lost`, `hold`.
- `status` của prospect: `queued`, `contacted`, `hold`, `skip`.
- Một dòng chỉ có khoá (`id`) và vài trường thì chỉ cập nhật bản ghi đã có, không tạo mới.
- Thời gian lấy bằng `date -u +%Y-%m-%dT%H:%M:%SZ`. Không ước lượng.

## Hàng đợi Duyệt
1. **Tạo đề xuất,** khi cần Danny cho phép, ví dụ gửi email cho người đã có trong Gmail:
   ```bash
   $A approval-create --file draft.json
   # draft.json: {"kind":"send_email","title":"Follow-up P2P (ICRBO 2027)","summary":"vì sao gửi","priority":1,
   #   "payload":{"to":["…"],"cc":["phoebe@exnodes.vn","dragoon@exnodes.vn","kai@exnodes.vn"],
   #              "subject":"…","html":"<p>…</p>","reply_thread_id":"<Gmail thread id nếu trả lời>"}}
   ```
   Các kind khác: `follow_up`, `task` (việc Danny phải làm, ví dụ tạo tài khoản), `other`.
2. **Thực hiện,** ở đầu mỗi lần chạy:
   ```bash
   $A approvals --status approved --kind send_email
   ```
   Gửi từng email bằng `mcp__Gmail__send_message`, dùng đúng `to`, `cc`, `subject`, `htmlBody` = `html`, `includeSignature: true`, và `replyThreadId` nếu có. Sau đó:
   ```bash
   $A approval-result <id> --status executed --result '{"message_id":"<id Gmail trả về>"}' --title "<title>"
   # lỗi: --status failed --result '{"error":"<thông báo>"}'
   ```
   Không bao giờ sửa nội dung đã được duyệt. Muốn đổi thì tạo đề xuất mới.
3. Đề xuất bị **từ chối** có `decision_note` là lý do. Đọc lý do để không đề xuất lại điều tương tự.

## Routine và lịch
- Mỗi routine gọi `routine-start --schedule <trig_id>` ngay đầu lần chạy, để hệ thống biết routine đã chạy đúng giờ.
- Mỗi ngày ít nhất một agent gọi `list_triggers` (connector Claude Code Remote) rồi `schedules-sync`. Agent Ops so `next_run_at` với lần chạy thực tế và báo **Lỡ lịch** hoặc **Lần trước lỗi**.
- Lịch chạy trên máy local (cron, Task Scheduler) được báo bằng `schedules-sync` với `"source":"local"`.

## Không có cấu hình
Nếu CLI báo "AGENT_OPS_URL and AGENT_OPS_TOKEN must be set", ghi việc đó vào báo cáo cho Danny và làm tiếp phần việc chính.
