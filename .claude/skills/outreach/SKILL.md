---
name: outreach
description: Gửi email chào hàng cho khách mới của Exnodes và Én Nam bằng Gmail của Danny, theo mẫu chuẩn cho Úc và Việt Nam, đúng các luật về chữ ký, cc, kiểm tra trùng và childcare; email cho người đã có trong Gmail đi qua hàng đợi Duyệt. Dùng mỗi khi gửi email ra ngoài.
---

# Outreach

## Trước mỗi email (bắt buộc)
1. **Kiểm tra trùng:** `mcp__Gmail__search_threads` theo email, theo tên miền và theo tên công ty.
   - **Có bất kỳ thư nào:** không gửi. Tạo đề xuất `send_email` trong hàng đợi Duyệt (`ops-status`). Danny duyệt trên web, và agent gửi ở lần chạy kế tiếp.
   - **Không có thư nào:** được tự gửi.
2. Không thuộc ngành childcare (gặp thì đặt prospect `status: hold`, `hold_reason: childcare`), không phải đối thủ, không phải hộp thư hỗ trợ khách.
3. Chỉ dùng sự thật trong `memory/company.md`. Không mốc năm, không số liệu tự nghĩ ra, không tên khách đang chờ kiểm NDA.

## Tham số gửi (luôn luôn)
```
mcp__Gmail__send_message({
  to: [<email công khai>],
  cc: ["phoebe@exnodes.vn", "dragoon@exnodes.vn", "kai@exnodes.vn"],
  subject, htmlBody, includeSignature: true
})
```
- Thân thư kết thúc ở "Best regards," hoặc "Trân trọng,". Chữ ký do Gmail chèn.
- Khoảng 15–20 khách mới mỗi ngày. Mỗi công ty viết một email riêng.

## Mẫu Úc (tiếng Anh)
Cấu trúc 6 đoạn ngắn:
1. Một câu cá nhân hoá theo bằng chứng: tin tuyển dev, vòng gọi vốn, dịch vụ white-label.
2. "I'm Danny, Chairman of Exnodes, a software company in Ho Chi Minh City building web and mobile products since 2017, including for Australian clients."
3. Đề nghị cụ thể: dedicated developers month-to-month hoặc fixed-price, hoặc white-label cho agency.
4. 2–3 dự án portfolio hợp ngành, **SiteSmart luôn có**, kèm link `https://exnodes.vn/staticfile/Exnodes-Project-Portfolio.pdf`.
5. "Vietnam is 3–4 hours behind AEST (1 hour behind Perth)… NDA, IP yours, start with one engineer."
6. Đề nghị gọi 15 phút tuần tới.

Tiêu đề: `<đề nghị cụ thể> for <Company> – Exnodes (Vietnam)`.

## Mẫu Việt Nam (agency, sự kiện)
"Mình là Danny, Chairman của Exnodes…". Chào làm white-label web, web app, app Flutter, microsite sự kiện (đăng ký, thanh toán, check-in QR), có NDA, báo giá trong 24 giờ, kèm link hồ sơ năng lực, rồi xin 15 phút trao đổi.

## Toy City
Nội dung ở `memory/toy-city/`. Giá theo `memory/rules.md`.

## Sau khi gửi (qua `scripts/agentops.py`)
- `event --kind email --title "Gửi N email …" --detail "<danh sách công ty>"`.
- `upsert prospects`: `status: contacted`, `contacted_at`.
- `upsert pipeline`: `stage: contacted`, `last_touch`, `next`.
- `upsert metrics`: cập nhật `emails_sent` của hôm nay. Ghi giá trị tổng đếm từ `in:sent`, không cộng dồn.
