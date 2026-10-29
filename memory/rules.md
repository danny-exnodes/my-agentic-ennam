# Quyết định của Danny (luật cho mọi agent)

Mỗi dòng ghi ngày chốt. Quy tắc mới hơn thắng quy tắc cũ khi mâu thuẫn.

| Ngày | Quy tắc |
|---|---|
| 29/10/2026 | Nhiệm vụ: trong 5 ngày (29/10 → 03/11) tìm khách để có tiền vận hành. Bán Toy City và tìm dự án cho Exnodes, Én Nam. Báo cáo email cho Danny mỗi ngày trước 18h. |
| 29/10/2026 | Công cụ: ưu tiên miễn phí. Công cụ có phí phải đề xuất để Danny cân nhắc. |
| 29/10/2026 | Giá Toy City đã duyệt: licence mã nguồn $149 (~3,9tr), white-label từ $1.500 (~39tr, cọc 50%), mua đứt $6.000 (~156tr), giảm 30% nếu chốt trước 03/11. |
| 29/10/2026 | Được tự gửi email chào hàng cá nhân hoá, khoảng 15–20 email mỗi ngày, **chỉ cho khách hoàn toàn mới**. |
| 29/10/2026 | Email luôn dùng chữ ký Gmail của Danny: `htmlBody` + `includeSignature: true`. Không tự gõ khối chữ ký. Giới thiệu "Danny, Chairman of Exnodes". |
| 29/10/2026 | **Phải hỏi Danny trước** khi gửi email cho người đã có trong Gmail, vì nhiều dự án đã drop mà mail không thể hiện. Với họ chỉ soạn nháp và đưa vào báo cáo để duyệt. |
| 29/10/2026 | Kênh Danny tự đăng: Facebook/Zalo cá nhân, LinkedIn. Nhóm Marketing (Dung, Tuyền) đăng trang công ty và điền form liên hệ. |
| 29/10/2026 | Tập trung thị trường **Úc**. Email giới thiệu chuẩn chỉnh, kèm link portfolio `https://exnodes.vn/staticfile/Exnodes-Project-Portfolio.pdf`. |
| 29/10/2026 | Khách ngành **childcare**: gom lại, không gửi email, để tính sau. Lý do: tránh xung đột lợi ích với khách hiện tại cùng ngành. |
| 29/10/2026 | Mọi email gửi đi đều **cc phoebe@exnodes.vn, dragoon@exnodes.vn, kai@exnodes.vn**. |
| 29/10/2026 | Không lưu thông tin liên hệ cá nhân của khách vào repo. Chỉ lưu tên công ty, email doanh nghiệp công khai, trạng thái. |
| 29/10/2026 | Chỉ nêu điều có trong portfolio hoặc email dự án. Đã có một lần lỡ ghi "Flutter từ 2019" (email gửi Code Heroes), không được lặp lại. |
| 29/10/2026 | Hệ thống Agent Ops độc lập: Supabase (Postgres + đăng nhập + realtime), web app trên GitHub Pages. Repo `my-agentic-ennam` giữ **public**, nên dữ liệu khách, pipeline, prospect và trạng thái chỉ nằm trong database có đăng nhập, **không** nằm trong repo. |
| 29/10/2026 | Mọi email cần Danny duyệt đi qua hàng đợi **Duyệt** của Agent Ops. Danny bấm Duyệt trên web, agent gửi ở lần chạy kế tiếp, rồi ghi kết quả. |
