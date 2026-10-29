---
name: follow-up
description: Khai thác lead ấm trong Gmail (báo giá chưa chốt, khách cũ, khách hiện tại có thể bán thêm) và nhắc lại các khách đã chào nhưng chưa phản hồi, luôn qua hàng đợi Duyệt của Agent Ops. Dùng khi tìm nguồn tiền nhanh hoặc khi lead quá 3 ngày chưa trả lời.
---

# Follow-up

## Lead ấm từ Gmail
- Chạy subagent **chỉ đọc** Gmail, xem lại 12 tháng: báo giá, proposal, RFQ, form liên hệ từ web, khách hiện tại.
- Kết quả: công ty, đã chào gì, giá trị, lần cuối, ai phụ trách, trạng thái, việc nên làm. Xếp theo khả năng ra tiền.
- **Không tự gửi.** Theo luật ngày 29/10: dự án có thể đã drop mà mail không thể hiện.
  - Lead đã nguội: soạn email và tạo đề xuất `send_email` trong hàng đợi Duyệt (`ops-status`).
  - Deal đang có người trong team phụ trách: tạo đề xuất `task` (ví dụ "Giao Phoebe chốt gia hạn Villa Song"). Không email thẳng cho khách.
- Ghi lead vào `pipeline` (stage `proposal` hoặc `contacted`). Không ghi email hay số điện thoại cá nhân.

## Nhắc lại khách mới đã chào
- Sau 3 ngày làm việc chưa có phản hồi: soạn một email ngắn trả lời ngay trong thread cũ (`reply_thread_id`), thêm một ý mới, ví dụ case study hợp ngành hơn. Người nhận đã có trong Gmail nên gửi qua hàng đợi Duyệt.
- Tối đa 2 lần nhắc. Sau đó đặt pipeline `stage: lost`, ghi `notes: "no reply"`.
