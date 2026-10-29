# Agent Ops dashboard

- Link: https://claude.ai/artifact/6eHNJKrdCLh7F1c88gtj9a (riêng tư; Danny mở trên claude.ai hoặc app Claude ở điện thoại).
- Nguồn: `agent-ops.html`. Publish lại bằng tool Artifact với `url` trên, không truyền `capabilities` để giữ khai báo cũ.
- Capabilities:
  - `db` (rule gốc: read `view`, write `admin`, nên chỉ Danny và Claude thay Danny được ghi);
  - `mcp` → `Claude Code Remote` với `list_triggers` và `list_sessions`.
- Realtime:
  - db qua `onSnapshot`, thay đổi hiện ngay;
  - connector qua `watchTool` với `refetchInterval` 60 giây (sàn khoảng 30 giây, tạm dừng khi tab ẩn).
- Schema và cách ghi: `.claude/skills/ops-status/SKILL.md`.
- Lần đầu mở, claude.ai sẽ hỏi cho phép trang đọc connector Claude Code Remote. Chọn Allow.
