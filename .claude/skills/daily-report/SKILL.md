---
name: daily-report
description: Báo cáo bán hàng hằng ngày gửi Danny lúc 17h45 (giờ Việt Nam) qua email, đồng bộ lịch routine và số liệu vào Agent Ops. Dùng khi routine báo cáo chạy hoặc khi Danny hỏi tình hình.
---

# Daily report

## Đầu lần chạy
`python3 scripts/agentops.py routine-start --schedule <trig_id của routine này>`

## Nguồn số liệu
- Gmail hôm nay:
  - `in:sent after:<hôm nay>`: email gửi ra ngoài, tách riêng email nội bộ;
  - phản hồi đến;
  - bounce (`from:mailer-daemon newer_than:1d`);
  - cập nhật của Phoebe và Marketing trong các thread giao việc.
- Routine: gọi `list_triggers`, lưu payload thành file rồi chạy `agentops.py schedules-sync --file`.
- Hàng đợi Duyệt: `agentops.py approvals --status pending` (đếm số việc đang chờ) và `--status failed`.

## Ghi vào Agent Ops
- `upsert metrics` cho hôm nay: emails_sent, replies, new_leads, proposals, meetings.
- `upsert pipeline` cho khách có phản hồi (stage `replied`), kèm `next`.
- Mỗi phản hồi cần trả lời: soạn email và tạo đề xuất `send_email` (người nhận đã có trong Gmail).
- `event --kind report --title "Báo cáo ngày N"`.

## Email
- Gửi danny.tranhoang@exnodes.vn. Tiêu đề `[Sales] Báo cáo ngày N – <dd/mm>`, `htmlBody`, `includeSignature: true`. Email báo cáo là thư nội bộ cho Danny: không cc.
- Bố cục:
  1. Tóm tắt 3 dòng: tiền và deal, phản hồi, việc cần anh làm.
  2. Số liệu.
  3. Phản hồi và tiến triển từng deal.
  4. Số đề xuất đang chờ duyệt, kèm link `https://danny-exnodes.github.io/my-agentic-ennam/#approvals`.
  5. Agent mất kết nối, routine lỡ lịch hoặc lỗi.
  6. Rủi ro.
  7. Kế hoạch ngày mai.
  8. Công cụ cần cấp, ưu tiên miễn phí.
