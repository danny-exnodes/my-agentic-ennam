---
name: daily-report
description: Báo cáo bán hàng hằng ngày gửi Danny lúc 17h45 (giờ Việt Nam) qua email và cập nhật dashboard Agent Ops. Dùng khi routine báo cáo chạy hoặc khi Danny hỏi tình hình.
---

# Daily report

## Nguồn số liệu
- Gmail hôm nay:
  - `in:sent after:<hôm nay>`: đếm email gửi ra ngoài, tách riêng email nội bộ;
  - phản hồi đến;
  - bounce (`from:mailer-daemon`);
  - cập nhật của Phoebe và Marketing.
- Dashboard db: `pipeline`, `asks`, `metrics/<hôm nay>`.
- Routine: `list_triggers` (lần chạy trước, có lỗi không).

## Email
- Gửi tới danny.tranhoang@exnodes.vn. Tiêu đề `[Sales] Báo cáo ngày N/5 – <dd/mm>`, `htmlBody`, `includeSignature: true`. Email báo cáo là thư nội bộ cho Danny: không cc, trừ khi Danny yêu cầu.
- Bố cục:
  1. Tóm tắt 3 dòng: tiền và deal, phản hồi, việc cần anh làm.
  2. Số liệu: email gửi, phản hồi, lead mới, đề xuất, cuộc hẹn.
  3. Phản hồi và tiến triển từng deal.
  4. Việc cần duyệt: các mục `asks` đang mở, kèm nháp follow-up.
  5. Rủi ro và vướng mắc.
  6. Kế hoạch ngày mai.
  7. Công cụ cần cấp, ưu tiên miễn phí.
  8. Danh sách childcare đang giữ.
- Kèm link dashboard: https://claude.ai/artifact/6eHNJKrdCLh7F1c88gtj9a

## Sau khi gửi
- `events`: kind `report`.
- `agents/daily-report`: status `idle`, next "Báo cáo ngày mai 17h45".
