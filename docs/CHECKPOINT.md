# Checkpoint — 30/10/2026 (v0.0.1)

Tóm tắt trạng thái để session kế tiếp làm tiếp mà không cần đọc lại lịch sử. Repo public: tên khách, email và giá nằm trong Agent Ops (Supabase) và Gmail, không ghi ở đây.

## Đã xong
- **Quy trình và luật:** `.claude/skills/*`, `memory/rules.md`.
- **Agent Ops v0.0.1:** xem `docs/releases/v0.0.1.md`. Supabase project `zclwbsguebfvfyvwoybt` đã có schema, `agent-api` và dữ liệu cũ. Web app chạy tại https://danny-exnodes.github.io/my-agentic-ennam/.
- **Bán hàng ngày 1 (29/10):**
  - 37 email ra ngoài (31 khách mới Úc/VN, 6 lead ấm), 97 lead đã nghiên cứu, 5 đề xuất Freelancer đã soạn nhưng chưa nộp;
  - 1 khách cũ từ chối, 1 agency trả lời xã giao, 0 bounce;
  - đã gửi báo cáo ngày 1.
- **Portfolio 2026:** đã giao việc cho đội. 2/5 case AI có nội dung và ảnh. Hạn: nội dung kỹ thuật 31/10, bản thiết kế 03/11.

## Đang chờ Danny
1. Trả lời 2 câu hỏi về Portfolio 2026, trong thread Gmail "[Portfolio 2026]".
2. Chọn lịch tự động cần tạo:
   - (a) báo cáo 17h45 chạy session mới mỗi lần;
   - (b) kiểm tra phản hồi 9h và 14h;
   - (c) tự gửi chào hàng 10h, hoặc vẫn duyệt trước khi gửi.
3. Thêm 3 secret `SUPABASE_*` vào GitHub để CI tự deploy database và function.
4. Các việc từ ngày 1:
   - gọi 2 lead ấm;
   - tạo tài khoản Freelancer;
   - có theo gói thầu UNDP không;
   - xác nhận mốc năm làm Flutter dùng trong email chào hàng;
   - quyết định nhóm khách childcare đang giữ;
   - cho phép xoá nhánh `sales/toy-city-5days` trên repo low-poly-tile-city.

## Việc tiếp theo (agent)
1. **MCP server cho Agent Ops** (v0.0.2): để Claude chat gọi trực tiếp các lệnh báo trạng thái, xem và duyệt đề xuất, đồng bộ lịch, rồi tạo lịch tự động trên claude.ai theo tác vụ.
2. Đặt `AGENT_OPS_URL`, `AGENT_OPS_TOKEN`, `AGENT_OPS_AGENT` cho environment cloud và máy local (xem `SETUP.md` mục 5).
3. Chạy `schedules-sync` lần đầu, và nạp bảng `prospects` từ bản xuất cũ (nằm ngoài repo).
4. Tạo lại routine báo cáo thành lịch độc lập và tắt lịch cũ `trig_015EJPCfMUW8xvtjrytX8SJA`. Lịch cũ đang gắn vào một session chat nên có lần chạy trễ 13 giờ. Lịch bán hàng 5 ngày kết thúc ngày 03/11.
5. Ngày 2: gửi 15–20 email cho khách Úc mới, follow-up lead ấm qua hàng đợi Duyệt.

## Nơi lưu
| Gì | Ở đâu |
|---|---|
| Trạng thái agent, run, lịch, đề xuất, pipeline, KPI | Supabase `zclwbsguebfvfyvwoybt` |
| Dashboard cũ (chỉ đọc, giữ lại để đối chiếu) | artifact Agent Ops trên claude.ai |
| Hội thoại với khách | Gmail của Danny |
| Đề xuất giá và thầu | `memory/bids/` (git ignore) |
