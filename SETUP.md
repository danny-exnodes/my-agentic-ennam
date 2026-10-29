# Cài đặt Agent Ops

Làm một lần. Tổng cộng khoảng 20 phút. Mọi thứ dùng gói miễn phí.

## 1. Tạo project Supabase
1. https://supabase.com → New project (region Singapore). Lưu lại **Database password**.
2. Project Settings → API: chép **Project URL** và khoá **anon public**.
   Khoá `service_role` **không** được đưa vào repo hay `site/`. Edge Function tự có khoá này trên Supabase.

## 2. Áp database và deploy API
**Cách A, qua GitHub Actions (khuyên dùng).** Repo → Settings → Secrets and variables → Actions, thêm:
| Secret | Lấy ở đâu |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens |
| `SUPABASE_PROJECT_REF` | phần `<ref>` trong `https://<ref>.supabase.co` |
| `SUPABASE_DB_PASSWORD` | mật khẩu ở bước 1 |

Sau đó Actions → "Deploy database and agent-api to Supabase" → Run workflow.

**Cách B, trên máy:**
```bash
supabase link --project-ref <ref>
supabase db push
supabase functions deploy agent-api --no-verify-jwt
```

## 3. Đăng nhập và quyền
1. Authentication → URL Configuration: **Site URL** và **Redirect URLs** = `https://danny-exnodes.github.io/my-agentic-ennam/`.
2. SQL Editor, cấp quyền chủ:
   ```sql
   insert into admins (email, role) values ('danny.tranhoang@exnodes.vn', 'owner');
   ```
   Vai trò: `owner` (toàn quyền, tạo token, quản lý người dùng), `approver` (duyệt, sửa pipeline), `viewer` (chỉ xem).

## 4. Nối web app
Điền vào `site/config.js` rồi push lên `main` (khoá anon được phép công khai, RLS chặn người ngoài):
```js
window.AGENT_OPS_CONFIG = { supabaseUrl: "https://<ref>.supabase.co", supabaseAnonKey: "<anon key>" };
```
Mở web app, đăng nhập bằng magic link.

## 5. Token cho agent
Web app → **Cài đặt** → Tạo token (mỗi nơi chạy một token, ví dụ `cloud-sales`, `local-danny-mac`, `routine-daily-report`). Token chỉ hiện một lần.

- **Cloud (Claude Code on the web):** Environment → Environment variables:
  ```
  AGENT_OPS_URL=https://<ref>.supabase.co/functions/v1/agent-api
  AGENT_OPS_TOKEN=aops_…
  AGENT_OPS_AGENT=cloud-sales
  AGENT_OPS_NAME=Sales Lead (cloud)
  ```
- **Máy local:** đặt các biến trên vào `~/.zshrc` hoặc `~/.bashrc` (đổi `AGENT_OPS_AGENT`), mở Claude Code trong thư mục repo. Hook trong `.claude/settings.json` tự chạy.
- **Routine:** dùng chung biến của environment. Dòng đầu prompt routine: `python3 scripts/agentops.py routine-start --schedule <trig_id>`.

Kiểm tra: `python3 scripts/agentops.py status --status idle --task "Kiểm tra kết nối"` rồi xem tab Agents.

## 6. Chuyển dữ liệu cũ (một lần)
Dữ liệu từ dashboard artifact cũ được xuất thành `seed.sql` (không nằm trong repo vì có tên khách). Chạy **một lần** trong SQL Editor. Chạy lại sẽ nhân đôi nhật ký và đề xuất.

## Sự cố
| Hiện tượng | Xử lý |
|---|---|
| Web báo "chưa cấu hình" | `site/config.js` còn trống |
| Đăng nhập xong báo "không có quyền" | thêm email vào `admins` |
| Agent báo 401 | token sai hoặc đã thu hồi, tạo token mới |
| Agent báo 403 | token không được phép báo cho `AGENT_OPS_AGENT` này |
| Agent hiện "Mất kết nối" | quá 15 phút không có heartbeat, session đã dừng hoặc mất mạng |
