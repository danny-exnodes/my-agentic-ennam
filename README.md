# my-agentic-ennam

Đội agent bán hàng của Exnodes và Én Nam: tìm khách (ưu tiên Úc), chào hàng, follow-up, giao việc cho người và báo cáo hằng ngày, kèm hệ thống **Agent Ops** để Danny theo dõi và duyệt việc.

## Agent Ops
- **Web app:** https://danny-exnodes.github.io/my-agentic-ennam/. Đăng nhập bằng magic link, chỉ email có trong bảng `admins` mới xem được dữ liệu.
- **Theo dõi:** agent trên cloud, trên máy local và routine (đang chạy, chờ, bị chặn, mất kết nối), từng run, lịch routine (lỡ lịch, lần trước lỗi), pipeline, prospect, nhật ký, KPI.
- **Hàng đợi Duyệt:** agent đề xuất (gửi email, follow-up, việc cần người làm). Danny duyệt hoặc từ chối trên web. Agent gửi email đã duyệt ở lần chạy kế tiếp rồi ghi kết quả.
- **Kiến trúc:** Supabase (Postgres + RLS + Auth + Realtime) · Edge Function `agent-api` nhận dữ liệu từ agent bằng token riêng của từng agent · hook Claude Code gọi `scripts/agentops.py` · web tĩnh trên GitHub Pages.

## Bắt đầu
- Cài đặt lần đầu: `SETUP.md`.
- Agent: `CLAUDE.md`, sau đó `.claude/skills/sales-workflow/SKILL.md`. Luật: `memory/rules.md`.
- Test: `cd tests && npm ci && npm test`.
- Phiên bản: `VERSION` (hiện 0.0.1), `CHANGELOG.md`, release note ở `docs/releases/`, trạng thái mới nhất ở `docs/CHECKPOINT.md`.

## CI/CD
- `ci.yml`: test database, API, kiểm tra `site/` trên mọi push và PR.
- `pages.yml`: deploy `site/` lên GitHub Pages.
- `supabase.yml`: áp migration và deploy `agent-api` khi `supabase/` đổi. Bỏ qua nếu chưa có secret.

Repo **public**: chỉ chứa code, quy trình và hồ sơ công ty. Dữ liệu khách nằm trong Supabase, hội thoại nằm trong Gmail. Không đưa thông tin cá nhân, giá hay đề xuất thầu lên repo.
