---
name: prospecting
description: Tìm khách và dự án mới cho Exnodes và Én Nam bằng nghiên cứu web (subagent): agency cần đội dev, startup vừa gọi vốn hoặc đang tuyển dev, SME cần app/portal, dự án đang mở trên Freelancer, RFP và gói thầu. Dùng khi hàng đợi khách mới cạn.
---

# Prospecting

## Cách chạy
Chạy bằng `Agent` (general-purpose), để nền. Brief cho subagent phải gồm:
- **Hồ sơ năng lực:** dán phần liên quan trong `memory/company.md`, kèm các dự án portfolio.
- **Danh sách loại trừ:** mọi công ty đã có trong `memory/prospects/*.md` và trong dashboard `pipeline`.
- **Chỉ nghiên cứu web.** Không liên hệ, không đăng ký, không điền form.
- **Email:** chỉ lấy email doanh nghiệp thấy trên site chính thức, không đoán. Không có email thì ghi URL form.
- **Bằng chứng nhu cầu:** tin tuyển dev, tin gọi vốn, trang white-label, kèm URL và ngày. Ưu tiên tin trong 30 ngày.
- **Childcare / early learning / OSHC / mầm non:** tách sang danh sách riêng.
- Kết quả trả về dạng bảng tiếng Việt: công ty, thành phố, website, ngành, bằng chứng, liên hệ, góc chào (gắn với một dự án trong portfolio).

## Nhóm khách hiệu quả (đã kiểm chứng 29/10/2026)
1. **Agency Úc nhỏ đang tuyển dev** (Laravel, React, .NET, Flutter, WordPress): chào dev dedicated theo tháng hoặc white-label.
2. **Startup Úc vừa gọi vốn** (Startup Daily, SmartCompany): chào thêm kỹ sư trong lúc tuyển.
3. **Construction / field ops tech**: case SiteSmart khớp gần như hoàn toàn.
4. **Booking / POS / retail**: case Salonbookly, TWS.
5. **Agency Việt Nam** (ads, SEO, branding, sự kiện): chào làm white-label web, microsite, app.
6. **Freelancer.com**: dự án từ $1k, hạn 7 ngày. Soạn đề xuất vào `memory/bids/`; cần tài khoản của công ty để nộp.
7. **Gói thầu UNDP** (procurement-notices.undp.org) tìm national firm Việt Nam.

## Bỏ qua
- Đối thủ có đội offshore riêng.
- Hộp thư chỉ dành cho hỗ trợ khách (`support@`, `community@`).
- Dự án yêu cầu vượt CAPTCHA hoặc WAF.
- Sàn có phí đăng tin (Acquire, Flippa) khi chưa được Danny duyệt.

## Sau khi có kết quả
1. Ghi danh sách vào `memory/prospects/<ngày>-<nhóm>.md`, kèm nguồn.
2. Thêm vào `memory/prospects/childcare-hold.md` nếu thuộc ngành childcare.
3. Ghi một `events` kind `research` lên dashboard.
