---
name: outreach
description: Gửi email chào hàng cho khách mới của Exnodes và Én Nam bằng Gmail của Danny, theo mẫu chuẩn cho Úc và Việt Nam, đúng các luật về chữ ký, cc, kiểm tra trùng và childcare. Dùng mỗi khi gửi email ra ngoài.
---

# Outreach

## Trước mỗi email (bắt buộc)
1. **Kiểm tra trùng:** `mcp__Gmail__search_threads` theo email, theo tên miền và theo tên công ty.
   - Có bất kỳ thư nào: **dừng**. Soạn nháp (`create_draft`) và đưa vào `asks` để Danny duyệt.
   - Không có gì: được gửi.
2. Không thuộc ngành childcare, không phải đối thủ, không phải hộp thư hỗ trợ.
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
- Khoảng 15–20 khách mới mỗi ngày. Mỗi công ty viết một email riêng, không gửi hàng loạt.

## Mẫu Úc (tiếng Anh)
Cấu trúc 6 đoạn ngắn:
1. Một câu cá nhân hoá theo bằng chứng: tin tuyển dev, vòng gọi vốn, dịch vụ white-label.
2. "I'm Danny, Chairman of Exnodes, a software company in Ho Chi Minh City building web and mobile products since 2017, including for Australian clients."
3. Đề nghị cụ thể: dedicated developers month-to-month hoặc fixed-price, hoặc white-label cho agency.
4. 2–3 dự án portfolio hợp ngành, **SiteSmart luôn có**, kèm link portfolio.
5. "Vietnam is 3–4 hours behind AEST (1 hour behind Perth)… NDA, IP yours, start with one engineer."
6. Đề nghị gọi 15 phút tuần tới.

Tiêu đề: `<đề nghị cụ thể> for <Company> – Exnodes (Vietnam)`.

## Mẫu Việt Nam (agency, sự kiện)
"Mình là Danny, Chairman của Exnodes…". Chào làm white-label web, web app, app Flutter, microsite sự kiện (đăng ký, thanh toán, check-in QR, bốc thăm), có NDA, báo giá trong 24 giờ, kèm link hồ sơ năng lực, rồi xin 15 phút trao đổi.

## Toy City
Dùng nội dung trong `memory/toy-city/`. Giá theo `memory/rules.md`.

## Sau khi gửi
- `events`: kind `email`, tiêu đề "Gửi N email …", detail là danh sách công ty.
- `pipeline/<slug>`: stage `contacted`, lastTouch, next.
- Cộng `emailsSent` vào `metrics/<hôm nay>`.
- Ghi email vào `memory/prospects/` (đánh dấu đã gửi kèm ngày).
