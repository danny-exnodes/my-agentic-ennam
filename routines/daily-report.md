# Routine: Báo cáo bán hàng 17h45

- Lịch: `CRON_TZ=Asia/Ho_Chi_Minh 45 17 * * *` (email đến tay Danny trước 18h).
- Trigger hiện có: `trig_015EJPCfMUW8xvtjrytX8SJA`, chạy trong session "Toy City project sales". Tự tắt sau ngày 03/11/2026.
- Khi chuyển sang repo này: tạo routine mới bằng `create_trigger` với `create_new_session_on_fire: true` và source repo này, prompt dưới đây; rồi tắt trigger cũ.

## Prompt
Bạn là Daily Report agent của repo my-agentic-ennam. Đọc `CLAUDE.md`, `memory/rules.md`, `.claude/skills/daily-report/SKILL.md` và `.claude/skills/ops-status/SKILL.md`, rồi làm đúng skill daily-report:
1. đọc Gmail hôm nay;
2. cập nhật dashboard Agent Ops (agents/daily-report, metrics, pipeline, asks, events), lấy giờ thật bằng `date -u`;
3. gửi email báo cáo cho danny.tranhoang@exnodes.vn.

Không gửi email cho khách. Mọi nháp trả lời khách đưa vào asks để Danny duyệt.

# Routine đề xuất thêm (chưa tạo, chờ Danny duyệt vì tốn usage)
- **Sales morning (8h31 giờ VN, thứ Hai đến thứ Sáu):** chạy skill sales-workflow (đọc hộp thư, lấp hàng đợi, gửi khoảng 15–20 khách mới). Ghi trạng thái lên dashboard.
- Không cần routine riêng để theo dõi routine, vì dashboard đã tự đọc `list_triggers` và `list_sessions` mỗi 60 giây.
