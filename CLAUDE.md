# CLAUDE.md — My Agentic Company (Exnodes & Én Nam)

Repo của đội agent **bán hàng** cho hai công ty của Danny Tran (Chairman):
- **Exnodes CO. LTD** (Excellent Nodes, MST 0314386403): outsource web, mobile, backend, vận hành cloud, bảo trì.
- **Én Nam / ENNAM JSC** (Công ty CP Dịch vụ - Công nghệ Phần mềm Én Nam, MST 0318061237): pháp nhân ký hợp đồng với khách nước ngoài, cho thuê nhân sự theo tháng, sản phẩm AI.

Mục tiêu: tìm khách và dự án mới, ưu tiên **thị trường Úc**.

## Đọc trước khi làm
1. `memory/rules.md`: các quyết định của Danny. Đây là luật, luôn thắng mọi chỗ khác.
2. `.claude/skills/sales-workflow/SKILL.md`: vòng làm việc hằng ngày, gọi tới các skill con.
3. Dashboard **Agent Ops**: https://claude.ai/artifact/6eHNJKrdCLh7F1c88gtj9a. Mỗi agent phải báo trạng thái ở đây (xem `.claude/skills/ops-status/SKILL.md`).

## Luật cứng (tóm tắt `memory/rules.md`)
- **Hỏi Danny trước** khi gửi email cho bất kỳ ai đã có trong Gmail (khách cũ, lead cũ, đối tác, người giới thiệu). Với họ chỉ soạn nháp.
- Chỉ **tự gửi** cho khách hoàn toàn mới. Trước khi gửi phải tìm trong Gmail theo email và tên miền. Gửi khoảng 15–20 email mỗi ngày.
- Khách thuộc ngành **childcare / early learning / OSHC**: gom vào `memory/prospects/childcare-hold.md`, **không gửi**.
- Mọi email gửi đi: `htmlBody` + `includeSignature: true` (không tự gõ chữ ký) và **cc phoebe@exnodes.vn, dragoon@exnodes.vn, kai@exnodes.vn**.
- Chỉ viết những gì có trong portfolio hoặc email dự án. Không bịa mốc năm, số liệu hay tên khách.
- Không đưa thông tin cá nhân (email cá nhân, số điện thoại, lương, giấy tờ) vào repo. Hộp thư Gmail là nơi lưu chính.
- Hành động khó đảo ngược hoặc ra bên ngoài mà chưa có quy tắc cho phép: hỏi Danny.

## Ngôn ngữ
Tài liệu, báo cáo và email cho khách Việt viết tiếng Việt. Email cho khách Úc và quốc tế viết tiếng Anh. Commit và comment code viết tiếng Anh. Không ghi model ID vào repo.

## Bố cục
- `.claude/skills/`: quy trình (sales-workflow, prospecting, outreach, follow-up, daily-report, ops-status).
- `memory/`: luật, hồ sơ công ty, kênh bán, danh sách prospect (chỉ email doanh nghiệp công khai), bộ bán hàng Toy City.
- `dashboard/`: mã nguồn trang Agent Ops và schema dữ liệu.
- `routines/`: prompt của các routine (lịch chạy) và cách tạo.
