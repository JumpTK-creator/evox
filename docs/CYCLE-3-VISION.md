# Cycle 3 Vision — CEO Command Center

> **"The dashboard is the CEO's only interface to the team. If the dashboard is weak, the CEO is blind."**

*Author: LEO (acting PM) — Feb 5, 2026*
*Status: DRAFT — Awaiting CEO review*

---

## WHY We're Building v0.3

### What we've proven:

| Phase | Question | Answer |
|-------|----------|--------|
| Phase 1 | Can agents talk? | YES — Communication, visibility, heartbeat all working |
| Phase 2 | Can agents self-heal? | YES — Auto-retry, rollback, blocker detection, auto-review |
| **Cycle 3** | **Can CEO manage without micromanaging?** | **Not yet** |

### The Gap:

CEO still intervenes **~3x/day**. Target: **<1x/day**.

Why? Because the current dashboard is a **display**, not a **command center**. CEO can SEE what's happening but can't ACT from the dashboard. CEO has to switch to Linear, Convex, or terminal to take action.

**Cycle 3 closes this gap.** The dashboard becomes the single place where CEO can see, decide, and act — all in under 3 seconds.

---

## The 5 Truths

These are non-negotiable. Every feature in Cycle 3 must serve at least one truth.

### 1. Visibility = Trust

> "If CEO can't SEE agents working, they might as well not be working."

The dashboard is **proof of life**. Real-time activity, actual commits, measurable output. Not graphs — evidence. Investors visiting `/live` should be **impressed**, not confused.

### 2. Control Without Micromanagement

> "CEO sets direction, agents execute. The dashboard shows the path, not the steps."

The CEO shouldn't need to open Linear, Convex, or a terminal. Everything needed to manage the team lives in the dashboard: move tasks, see blockers, review output.

### 3. Measure or Die

> "If we can't measure it, we can't improve it."

Every metric must be:
- **Real** (from actual data, not estimates)
- **Comparable** (today vs yesterday, this week vs last)
- **Actionable** (seeing a number should trigger a decision)

Current gaps: No time-filtered metrics, no completion %, no trend comparison.

### 4. Signal Over Noise

> "Every pixel must earn its place."

The dashboard should show **what matters**, not **everything**. A message between agents is noise unless it contains a decision, a blocker, or a completion. Keywords and intent classification turn noise into signal.

### 5. Mobile-First Reality

> "CEO checks on phone at 6am. If it doesn't work on mobile, it doesn't work."

This is a hard rule from CULTURE.md. Every component must pass the mobile checklist:
- Touch targets 44px+
- Readable without zoom
- No horizontal scroll
- Loading states visible

---

## What Cycle 3 Delivers

### 1. Kanban Board — The Action Surface

**Truth served:** #2 (Control Without Micromanagement)

CEO can see all tasks and move them between columns. No need to open Linear.

| What | Why |
|------|-----|
| 4 columns: Backlog → To Do → In Progress → Done | Standard workflow visibility |
| Drag & drop | CEO can reprioritize without switching tools |
| Assignee + Priority on each card | Know WHO is doing WHAT at what priority |

**Not building:** Complex filtering, sprint planning, burndown charts. Keep it lean.

### 2. Stats Page — The Truth Mirror

**Truth served:** #3 (Measure or Die)

Time-filtered metrics that answer: "How are we doing?"

| What | Why |
|------|-----|
| Time filters: Today / Week / 30 Days | Compare periods, spot trends |
| Completion % with visual bar | Instant health check |
| Status counts (WIP, Queue, Backlog, Done) | Where is work stuck? |
| Velocity sparkline | Are we speeding up or slowing down? |
| Cost summary | Are we spending efficiently? |

**Not building:** Complex analytics, exportable reports, custom date ranges. Those come later.

### 3. Activity Feed — The Signal Extractor

**Truth served:** #1 (Visibility = Trust) + #4 (Signal Over Noise)

Shows what agents are ACTUALLY doing, with context.

| What | Why |
|------|-----|
| All messages with sender → recipient | Know WHO is talking to WHOM |
| Keywords extracted (ticket IDs, status words) | Quick scan for what matters |
| Intent badges (Update, Request, Escalation) | Know the PURPOSE of each message |
| Category filters (Tasks, Messages, Commits) | Find what you're looking for |

**Not building:** Full conversation threads, message search, analytics. Feed only.

---

## Success Criteria

### Quantitative

| Metric | Current | Cycle 3 Target |
|--------|---------|----------------|
| CEO interventions/day | ~3 | <1 |
| Time to assess status | ~30s | <3s |
| Tools needed (Linear + Convex + Terminal) | 3 | 1 (dashboard only) |
| Mobile usability | Partial | Full |

### Qualitative

- [ ] CEO can manage the entire team from the dashboard alone
- [ ] An investor visiting `/live` says "wow, the agents are actually working"
- [ ] CEO never needs to ask "what's happening?" — the dashboard answers it
- [ ] Every number on the Stats page is accurate and real-time

---

## What We're NOT Building (Cycle 3 Scope)

Saying no is as important as saying yes:

- No sprint planning or sprint velocity
- No custom report generation
- No complex permission system
- No multi-project support (yet)
- No Slack/Discord integrations (yet)
- No AI-generated insights (yet — that's Phase 3)

---

## Existing Infrastructure to Reuse

We've built a lot. Cycle 3 is mostly **assembling existing pieces** into a better experience:

| Existing | Reuse For |
|----------|-----------|
| `mission-queue.tsx` + `kanban-board.tsx` | Kanban Board base |
| `task-card.tsx` | Card component |
| `dashboard.getStats()` API | Stats Page data |
| `date-filter.tsx` | Time filter UI |
| `AgentCommsWidget` + `getChannelMessagesWithKeywords` | Activity Feed keywords |
| `ActivityFeed.tsx` (events + commits merger) | Activity Feed logic |
| `CEODashboard.tsx` v0.3 | Metric cards, sparklines |

**Estimate:** ~1 sprint. Most backend APIs exist. Frontend is assembly + polish.

---

## Alignment Check

| Cycle 3 Feature | North Star Connection |
|-----------------|----------------------|
| Kanban Board | CEO manages team → reduces intervention → agents work autonomously |
| Stats Page | Metrics prove agent value → trust grows → less oversight needed |
| Activity Feed | Visibility into agent work → CEO confident → walks away |

Every feature reduces CEO intervention. That's the point.

---

> **"We build products, not features. Cycle 3 is not three components — it's one product: the CEO Command Center."**

---

*Ready for CEO review.*
