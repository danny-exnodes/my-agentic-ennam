---
name: prospecting
description: Tìm khách và dự án mới cho Exnodes và Én Nam bằng nghiên cứu web (subagent): agency cần đội dev, startup vừa gọi vốn hoặc đang tuyển dev, SME cần app/portal, dự án đang mở trên Freelancer, RFP và gói thầu; lưu vào bảng prospects của Agent Ops. Dùng khi hàng đợi khách mới cạn.
---

# Prospecting

## Cách chạy
Chạy bằng `Agent` (general-purpose), để nền. Brief cho subagent phải gồm:
- **Hồ sơ năng lực:** phần liên quan trong `memory/company.md` và các dự án portfolio.
- **Danh sách loại trừ:** công ty đã có trong bảng `prospects` và `pipeline`. Xem trên web app, hoặc nhờ Danny xuất danh sách.
- **Chỉ nghiên cứu web.** Không liên hệ, không đăng ký, không điền form.
- **Email:** chỉ lấy email doanh nghiệp thấy trên site chính thức, không đoán. Không có email thì ghi URL form.
- **Bằng chứng nhu cầu:** tin tuyển dev, tin gọi vốn, trang white-label, kèm URL và ngày. Ưu tiên tin trong 30 ngày.
- **Childcare / early learning / OSHC / mầm non:** đặt `status: hold`, `hold_reason: childcare`.

## Nhóm khách hiệu quả (đã kiểm chứng 29/10/2026)
1. Agency Úc nhỏ đang tuyển dev (Laravel, React, .NET, Flutter, WordPress).
2. Startup Úc vừa gọi vốn (Startup Daily, SmartCompany).
3. Construction / field ops tech: case SiteSmart.
4. Booking / POS / retail: case Salonbookly, TWS.
5. Agency Việt Nam (ads, SEO, branding, sự kiện): làm white-label.
6. Freelancer.com: dự án từ $1k. Đề xuất soạn vào `memory/bids/`, thư mục này nằm ngoài repo vì repo public.
7. Gói thầu UNDP tìm national firm Việt Nam.

## Bỏ qua
Đối thủ có đội offshore riêng · hộp thư chỉ dành cho hỗ trợ khách (`support@`, `community@`) · dự án yêu cầu vượt CAPTCHA hoặc WAF · sàn có phí khi chưa được Danny duyệt.

## Lưu kết quả
```bash
python3 scripts/agentops.py upsert prospects --file prospects.json
# mỗi dòng: {id (slug), company, website, email_public | contact_form, country, city, segment, evidence, angle, status, hold_reason, source}
python3 scripts/agentops.py event --kind research --title "Tìm N khách Úc mới" --detail "<nhóm, nguồn>"
```
Công ty chỉ có form liên hệ: tạo đề xuất `task` giao Marketing điền form.
