---
name: sales-workflow
description: Vòng làm việc hằng ngày của đội agent bán hàng Exnodes và Én Nam: tìm khách, chào hàng, follow-up, giao việc cho người, báo cáo, cập nhật dashboard. Dùng khi mở session bán hàng, khi Danny giao đợt tìm khách mới, hoặc khi routine báo cáo chạy.
---

# Sales workflow

Đọc `memory/rules.md` trước. Luật trong đó thắng mọi bước dưới đây.

## Vai trò
| Vai | Ai làm | Skill |
|---|---|---|
| Sales Lead | session chính (Claude) | skill này, điều phối |
| Prospect Research | subagent (Agent tool, chạy nền) | `prospecting` |
| Outreach | Sales Lead | `outreach` |
| Follow-up / lead ấm | Sales Lead và Phoebe | `follow-up` |
| Daily Report | routine 17h45 | `daily-report` |
| Ops status | mọi agent | `ops-status` |
| Người | Phoebe (báo giá, NDA), Kai (PM), Danh Trinh (kỹ thuật), Trinh (design), Dung/Tuyền (form, mạng xã hội) | giao qua email, có cc theo luật |

## Vòng một ngày
1. **Báo trạng thái** `working` lên dashboard (`ops-status`).
2. **Đọc hộp thư.** Gồm phản hồi của khách, thư bounce (`from:mailer-daemon newer_than:1d`) và cập nhật của Phoebe và Marketing trong các thread giao việc. Khách trả lời:
   - chuyển stage pipeline sang `replied`;
   - soạn nháp trả lời, cc theo luật;
   - người đã có trong Gmail thì chờ Danny duyệt mới gửi;
   - ghi vào mục `asks` nếu cần Danny.
3. **Lấp hàng đợi.** Nếu còn dưới khoảng 15 khách mới chưa chào, chạy `prospecting` bằng subagent nền, ưu tiên Úc.
4. **Chào hàng** khoảng 15–20 khách mới (`outreach`). Mỗi email ghi một dòng `events` và một doc `pipeline`.
5. **Follow-up** (`follow-up`):
   - lead đã chào từ 3 ngày trở lên mà chưa phản hồi: soạn nháp nhắc lại, đưa vào `asks` để Danny duyệt;
   - lead ấm trong Gmail: chỉ đề xuất, không tự gửi.
6. **Giao việc cho người.** Những việc agent không tự làm được (điền form web, gọi điện, đăng mạng xã hội, ký NDA) giao qua email, cc theo luật. Theo dõi bằng cách đọc thread trả lời.
7. **Cập nhật** KPI `metrics/<YYYY-MM-DD>`, rồi báo trạng thái `idle` hoặc `waiting` kèm `next`.
8. **17h45:** routine `daily-report` gửi báo cáo cho Danny.

## Những thứ không tự làm
- Gửi email cho người đã có trong Gmail.
- Tạo tài khoản, đăng nhập hay trả phí bất kỳ dịch vụ nào.
- Nộp hồ sơ thầu, ký hay hứa hẹn giá nhân sự khi chưa có rate card.
- Liên hệ công ty ngành childcare.
- Push thông tin cá nhân vào repo.

## Nơi lưu
- Pipeline và nhật ký: dashboard db (xem `ops-status`).
- Danh sách prospect nghiên cứu được, chỉ email doanh nghiệp công khai: `memory/prospects/*.md`.
- Đề xuất chào giá nền tảng: `memory/bids/` (repo private).
- Hội thoại với khách: Gmail. Đây là nguồn sự thật.
