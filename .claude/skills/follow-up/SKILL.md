---
name: follow-up
description: Khai thác lead ấm trong Gmail (báo giá chưa chốt, khách cũ, khách hiện tại có thể bán thêm) và nhắc lại các khách đã chào nhưng chưa phản hồi, luôn chờ Danny duyệt trước khi gửi. Dùng khi tìm nguồn tiền nhanh hoặc khi lead quá 3 ngày chưa trả lời.
---

# Follow-up

## Lead ấm từ Gmail
- Chạy subagent **chỉ đọc** Gmail, xem lại 12 tháng: báo giá, proposal, RFQ, form liên hệ từ web, khách hiện tại.
- Kết quả: bảng công ty, đầu mối, đã chào gì, giá trị, lần cuối, ai phụ trách, trạng thái, việc nên làm. Xếp theo khả năng ra tiền.
- **Không tự gửi.** Theo luật ngày 29/10: dự án có thể đã drop mà mail không thể hiện.
  - Lead đã nguội: soạn nháp và đưa vào `asks` để Danny duyệt.
  - Deal đang có người trong team phụ trách: giao Phoebe hoặc Kai qua email, không email thẳng cho khách.

## Nhắc lại khách mới đã chào
- Sau 3 ngày làm việc chưa có phản hồi: soạn một email ngắn trả lời ngay trong thread cũ, thêm một ý mới (ví dụ case study hợp ngành hơn). Người nhận đã có trong Gmail nên **chờ Danny duyệt** mới gửi.
- Tối đa 2 lần nhắc. Sau đó chuyển stage `lost`, ghi lý do "no reply".

## Ghi nhận
- `pipeline` stage và `next`.
- `asks` cho từng nháp cần duyệt. Tiêu đề: "Duyệt follow-up: <công ty>".
