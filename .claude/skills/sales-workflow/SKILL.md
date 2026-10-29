---
name: sales-workflow
description: Vòng làm việc hằng ngày của đội agent bán hàng Exnodes và Én Nam: thực hiện việc đã duyệt, đọc hộp thư, tìm khách, chào hàng, follow-up, giao việc cho người, báo cáo, cập nhật Agent Ops. Dùng khi mở session bán hàng, khi Danny giao đợt tìm khách mới, hoặc khi routine chạy.
---

# Sales workflow

Đọc `memory/rules.md` trước. Luật trong đó thắng mọi bước dưới đây. Trạng thái, dữ liệu và hàng đợi Duyệt nằm trong Agent Ops (`ops-status`).

## Vai trò
| Vai | Ai làm | Skill |
|---|---|---|
| Sales Lead | session chính (Claude, cloud hoặc local) | skill này |
| Prospect Research | subagent nền | `prospecting` |
| Outreach | Sales Lead | `outreach` |
| Follow-up / lead ấm | Sales Lead, Phoebe | `follow-up` |
| Daily Report | routine 17h45 | `daily-report` |
| Người | Phoebe (báo giá, NDA), Kai (PM), Danh Trinh (kỹ thuật), Trinh (design), Dung/Tuyền (form, mạng xã hội) | giao qua đề xuất `task` hoặc email, có cc theo luật |

## Vòng một lần chạy
1. **Báo trạng thái** `working`: `agentops.py status --status working --task "…"`. Hook tự mở run.
2. **Thực hiện việc đã duyệt** (`ops-status` → Hàng đợi Duyệt): gửi các email `approved`, ghi kết quả.
3. **Đọc hộp thư:** phản hồi, bounce, cập nhật của người được giao việc. Khách trả lời thì đặt pipeline `replied`, rồi soạn trả lời qua hàng đợi Duyệt.
4. **Lấp hàng đợi:** còn dưới khoảng 15 prospect `queued` thì chạy `prospecting`.
5. **Chào hàng** khoảng 15–20 khách mới (`outreach`).
6. **Follow-up** (`follow-up`).
7. **Giao việc cho người** bằng đề xuất `task`: điền form web, gọi điện, đăng mạng xã hội, ký NDA.
8. **Cập nhật** metrics và báo `idle` kèm `next`.

## Những thứ không tự làm
- Gửi email cho người đã có trong Gmail khi chưa có đề xuất được duyệt.
- Tạo tài khoản, đăng nhập hay trả phí dịch vụ nào.
- Nộp hồ sơ thầu, hứa giá nhân sự khi chưa có rate card.
- Liên hệ công ty ngành childcare.
- Đưa dữ liệu khách hay thông tin cá nhân vào repo (repo public).

## Nơi lưu
| Gì | Ở đâu |
|---|---|
| Trạng thái agent, run, routine, đề xuất, pipeline, prospect, KPI | Supabase (Agent Ops) |
| Hội thoại với khách | Gmail (nguồn sự thật) |
| Quy trình, luật, hồ sơ công ty, bộ bán hàng Toy City | repo |
| Đề xuất giá nền tảng | `memory/bids/` (bị git ignore) |
