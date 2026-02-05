# CEO Backlog — EVOX Requirements

*Managed by EVOX (COO). Updated continuously from CEO feedback.*

---

## 🎯 Active Goals

### Goal 1: Agent Communication (P0)
**Status:** 🔄 In Progress
**Requirement:** MAX cần tự viết ticket được
**Progress:**
- ✅ Linear API key created
- ✅ `/api/agent/create-ticket` endpoint ready
- ✅ MAX config updated
- ⏳ Deploy to Vercel (need LINEAR_API_KEY env)
- ⏳ Test MAX creating tickets autonomously

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
| P0 | AGT-NEXT-1 | Enable MAX to create tickets via API | SAM → MAX | In Progress |
| P1 | AGT-NEXT-2 | CEO Dashboard improvements | LEO | Pending |
| P1 | AGT-NEXT-3 | Per-agent ticket completion stats | SAM/LEO | New |
| P2 | AGT-NEXT-4 | Auto-sync CEO backlog to dashboard | SAM | New |

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

*Last updated: 2026-02-05 02:42 PST by EVOX (COO)*
