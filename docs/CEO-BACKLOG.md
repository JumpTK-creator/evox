# CEO Backlog — EVOX Requirements

*Managed by EVOX (COO). Updated continuously from CEO feedback.*

---

## 🎯 Active Goals

### Goal 1: Agent Communication (P0)
**Status:** 🔄 In Progress → Waiting on Human
**Requirement:** MAX cần tự viết ticket được
**Progress:**
- ✅ Linear API key created
- ✅ `/api/agent/create-ticket` endpoint ready
- ✅ MAX config updated
- ✅ MAX can create tickets via Linear MCP (working!)
- ⏳ AGT-270: Deploy to Vercel (need LINEAR_API_KEY env) — Human required
- ⏳ Test MAX creating tickets via HTTP API

### Goal 2: CEO Dashboard — Elon Style (P1)
**Status:** 🔄 In Progress
**Requirement:** Khi CEO thức dậy, dashboard phải show all key metrics at a glance
**Progress:**
- ✅ `CEODashboard` component exists
- ✅ `ElonDashboard` component exists (metrics view)
- ⏳ Merge/improve for single glanceable view
- ⏳ Set as default view

### Goal 3: Visibility & Continuous Improvement (P1)
**Status:** 📋 New
**Requirements:**
1. Nhìn thấy được ai đang làm, ai không làm
2. Đã hoàn thành bao nhiêu ticket
3. Tổng hợp yêu cầu CEO → Backlog
4. Cải tiến từ feedback liên tục

**Acceptance Criteria:**
- [ ] Real-time agent status visible (working/idle/offline)
- [ ] Ticket completion count per agent
- [ ] CEO requirements captured in backlog (this file)
- [ ] Feedback loop: CEO → EVOX → Tickets → Agents → Results → CEO

---

## 📊 Metrics Dashboard Requirements

| Metric | Current | Target |
|--------|---------|--------|
| Agent visibility | ✅ Team Status grid | Enhance with live activity |
| Ticket counts | ✅ In Progress/Done | Add per-agent breakdown |
| CEO backlog | ✅ This file | Auto-sync to dashboard? |
| Feedback loop | 🆕 Manual | Automate via tickets |

---

## 🗓️ CEO Feedback Log

### 2026-02-05
- **02:35** — MAX cần tự viết ticket được
- **02:37** — CEO Dashboard kiểu Elon, một cái nhìn thấy hết
- **02:37** — COO có quyền chủ động onboard, hire agents, không cần hỏi
- **02:38** — EVOX là người tổng hợp yêu cầu, làm việc với MAX, coordinate agents
- **02:42** — Goal 3: Visibility (ai làm, ai không), ticket counts, backlog, continuous improvement

---

## 📌 Backlog Queue

| Priority | Ticket | Description | Assignee | Status |
|----------|--------|-------------|----------|--------|
| P0 | AGT-270 | Deploy create-ticket API (LINEAR_API_KEY) | Human | ⏳ Waiting |
| P1 | AGT-268 | Per-agent ticket completion stats | SAM | ✅ Done |
| P1 | AGT-269 | CEO Dashboard single glanceable view | LEO | ✅ Done |
| P2 | — | Auto-sync CEO backlog to dashboard | SAM | Future |

---

## 🔄 Feedback → Action Process

```
1. CEO gives feedback (Telegram)
2. EVOX captures in CEO-BACKLOG.md
3. EVOX creates tickets for agents
4. Agents execute
5. Results visible on dashboard
6. CEO reviews → New feedback
7. Loop continues
```

---

---

## 🎭 EVOX Role Definition (COO/Operations)

**From CEO (2026-02-05 02:43):**
- Vận hành — giúp agents làm việc chéo hiệu quả
- Xây dựng văn hóa làm việc
- Facilitate trao đổi giữa agents
- Giúp nhau đạt mục tiêu chung
- Reference: `docs/CULTURE.md` for team culture

**Key Responsibilities:**
1. Capture CEO requirements → Backlog → Tickets
2. Coordinate with MAX (PM) on priorities
3. Ensure agents follow CULTURE.md principles
4. Monitor peer communication quality
5. Unblock agents when stuck
6. Report progress to CEO

---

*Last updated: 2026-02-05 02:43 PST by EVOX (COO)*
