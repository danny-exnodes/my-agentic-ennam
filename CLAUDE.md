# CLAUDE.md — My Agentic Company (Exnodes & Én Nam)

Repo của đội agent **bán hàng** cho hai công ty của Danny Tran (Chairman):
- **Exnodes CO. LTD** (Excellent Nodes, MST 0314386403): outsource web, mobile, backend, vận hành cloud, bảo trì.
- **Én Nam / ENNAM JSC** (Công ty CP Dịch vụ - Công nghệ Phần mềm Én Nam, MST 0318061237): pháp nhân ký hợp đồng với khách nước ngoài, cho thuê nhân sự theo tháng, sản phẩm AI.

Mục tiêu: tìm khách và dự án mới, ưu tiên **thị trường Úc**.

## Đọc trước khi làm
1. `memory/rules.md`: các quyết định của Danny. Đây là luật, luôn thắng mọi chỗ khác.
2. `.claude/skills/sales-workflow/SKILL.md`: vòng làm việc hằng ngày, gọi tới các skill con.
3. `docs/CHECKPOINT.md`: trạng thái công việc mới nhất và việc đang chờ. Release note ở `docs/releases/`.
4. Hệ thống **Agent Ops** (Supabase + web app https://danny-exnodes.github.io/my-agentic-ennam/): mỗi agent báo trạng thái, ghi nhật ký, và đưa việc cần Danny duyệt vào hàng đợi Duyệt (xem `.claude/skills/ops-status/SKILL.md`). Cài đặt: `SETUP.md`.

## Luật cứng (tóm tắt `memory/rules.md`)
- **Hỏi Danny trước** khi gửi email cho bất kỳ ai đã có trong Gmail (khách cũ, lead cũ, đối tác, người giới thiệu). Với họ chỉ soạn nháp.
- Chỉ **tự gửi** cho khách hoàn toàn mới. Trước khi gửi phải tìm trong Gmail theo email và tên miền. Gửi khoảng 15–20 email mỗi ngày.
- Khách thuộc ngành **childcare / early learning / OSHC**: lưu prospect `status: hold`, `hold_reason: childcare` trong Agent Ops, **không gửi**.
- Mọi email gửi đi: `htmlBody` + `includeSignature: true` (không tự gõ chữ ký) và **cc phoebe@exnodes.vn, dragoon@exnodes.vn, kai@exnodes.vn**.
- Chỉ viết những gì có trong portfolio hoặc email dự án. Không bịa mốc năm, số liệu hay tên khách.
- Repo **public**: không đưa thông tin cá nhân (email cá nhân, số điện thoại, lương, giấy tờ), danh sách khách, giá hay đề xuất thầu vào repo. Dữ liệu nằm trong Supabase, hội thoại nằm trong Gmail.
- Email cho người đã có trong Gmail: tạo đề xuất `send_email` trong hàng đợi Duyệt, chỉ gửi khi đã `approved`.
- Hành động khó đảo ngược hoặc ra bên ngoài mà chưa có quy tắc cho phép: hỏi Danny.

## Ngôn ngữ
Tài liệu, báo cáo và email cho khách Việt viết tiếng Việt. Email cho khách Úc và quốc tế viết tiếng Anh. Commit và comment code viết tiếng Anh. Không ghi model ID vào repo.

## Bố cục
- `.claude/skills/`: quy trình (sales-workflow, prospecting, outreach, follow-up, daily-report, ops-status).
- `.claude/settings.json`: hook báo trạng thái tự động qua `scripts/agentops.py`.
- `memory/`: luật, hồ sơ công ty, kênh bán, bộ bán hàng Toy City. `memory/bids/` bị git ignore.
- `supabase/`: migration (bảng, RLS, view) và Edge Function `agent-api` cho agent.
- `site/`: web app Agent Ops (đăng nhập magic link), deploy lên GitHub Pages.
- `scripts/agentops.py`: CLI cho agent (chỉ dùng thư viện chuẩn Python).
- `tests/`: test database (PGlite) và API. Chạy `cd tests && npm ci && npm test`.
