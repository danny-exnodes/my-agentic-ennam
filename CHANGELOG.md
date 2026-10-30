# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo [SemVer](https://semver.org/lang/vi/). Chi tiết từng bản nằm ở `docs/releases/`.

## [0.0.1] – 2026-10-30
### Thêm
- Quy trình đội agent bán hàng: 6 skill, luật, hồ sơ công ty, bộ bán hàng Toy City.
- Agent Ops trên Supabase: schema có RLS và vai trò, Edge Function `agent-api` với token theo agent, view live cho agent, run và lịch.
- Hook Claude Code và CLI `scripts/agentops.py` báo trạng thái agent cloud và local.
- Hàng đợi Duyệt: đề xuất, duyệt hoặc từ chối, thực hiện, ghi kết quả; guard chặn sửa sau khi duyệt.
- Web app đăng nhập magic link trên GitHub Pages, realtime, quản lý token và người dùng.
- CI: test PGlite, kiểm tra site public, deploy Pages và Supabase.

### Sửa
- Thắt quyền và tối ưu theo Supabase advisor; migration sửa lỗi chạy lại được.

### Gỡ bỏ
- Dashboard artifact và bản status JSON công khai; dữ liệu prospect và pipeline trong repo.

[0.0.1]: https://github.com/danny-exnodes/my-agentic-ennam/releases/tag/v0.0.1
