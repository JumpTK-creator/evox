
## P2: Message Latency Between Telegram ↔ OpenClaw Dashboard
**Added:** 2026-02-05
**Reporter:** CEO

**Issue:** Có độ trễ khi so sánh tốc độ truyền tải thông tin giữa Telegram và OpenClaw Dashboard.

**To investigate:**
- Measure actual latency (Telegram → Gateway → Dashboard)
- Identify bottleneck (network? polling interval? rendering?)
- Consider WebSocket for real-time sync

**Priority:** P2 (after v0.2 complete)
