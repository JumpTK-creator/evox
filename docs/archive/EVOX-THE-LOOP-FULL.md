# EVOX: THE LOOP — Full Operational Directive

**From:** CEO (Son)
**Priority:** P0 — HIGHEST PRIORITY. Drop everything else.
**Date:** Feb 5, 2026

---

## TL;DR

Implement "The Loop" — agent accountability system.
Every message must complete: `sent → seen → reply → act → report`
5 tickets on Linear (AGT-334 to AGT-338). Dispatch SAM first.

---

## PART 1: CONTEXT

### What is The Loop?

Current problem: CEO sends message → agent may or may not see it → no tracking → work gets dropped.

The Loop fixes this with 5 mandatory stages:

```
Stage 0: SENT      — Message created, enters recipient inbox
Stage 2: SEEN      — Recipient opens message (SLA: 5 min)
Stage 3: REPLY     — Recipient acknowledges with understanding (SLA: 15 min after SEEN)
Stage 4: ACT       — Recipient creates task, starts work (SLA: 2 hours after REPLY)
Stage 5: REPORT    — Recipient reports completion (SLA: 24 hours after ACT)
```

Loop CLOSED when stage 5 reached. Loop BROKEN if SLA breached without response.

### Why it matters

- Zero dropped work
- CEO sees every message status in dashboard
- Auto-alerts if agent goes silent
- Full accountability trail

---

## PART 2: LINEAR TICKETS

All tickets are in **AGT** team (Agent Factory). Labels: `SAM`, `LEO`, `the-loop`.

### AGT-334: Loop P1 — Backend Foundation (SAM, Urgent, 13h)

**Dependencies:** None. Can start NOW.
**State:** Todo

**What SAM must build:**

#### 1.1 Schema Changes (convex/schema.ts)

Extend the existing `agentMessages` table with these NEW fields:

```typescript
// ADD to existing agentMessages table:

// Extended status (currently 0-3, add 4 and 5)
// statusCode already exists — just use new values:
// 4 = ACTED, 5 = REPORTED

// NEW stage timestamps
actedAt: v.optional(v.number()),
reportedAt: v.optional(v.number()),

// NEW loop metadata
loopBroken: v.optional(v.boolean()),
loopBrokenReason: v.optional(v.string()),
loopBrokeAt: v.optional(v.number()),

// NEW SLA tracking
expectedReplyBy: v.optional(v.number()),
expectedActionBy: v.optional(v.number()),
expectedReportBy: v.optional(v.number()),

// NEW work linkage
linkedTaskId: v.optional(v.id("tasks")),
linkedDispatchId: v.optional(v.id("dispatches")),
finalReport: v.optional(v.string()),
```

Add NEW indexes to agentMessages:
```typescript
.index("by_status_code", ["statusCode", "_creationTime"])
.index("by_recipient_status", ["to", "statusCode"])
```

Create NEW table `loopMetrics`:
```typescript
loopMetrics: defineTable({
  date: v.string(),                // "2026-02-05"
  hourBucket: v.string(),          // "2026-02-05T14"
  agentName: v.string(),
  totalMessagesSent: v.number(),
  loopsCompleted: v.number(),
  loopsBroken: v.number(),
  onTimeSeen: v.number(),
  onTimeReplied: v.number(),
  onTimeActed: v.number(),
  onTimeReported: v.number(),
  avgTimeToSeen: v.number(),
  avgTimeToReply: v.number(),
  avgTimeToAction: v.number(),
  avgTimeToReport: v.number(),
  loopCompletionRate: v.number(),  // 0-100
  slaAdherenceRate: v.number(),    // 0-100
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_agent_date", ["agentName", "date"])
  .index("by_date", ["date"])
  .index("by_hour", ["hourBucket"])
```

Create NEW table `loopAlerts`:
```typescript
loopAlerts: defineTable({
  messageId: v.id("agentMessages"),
  loopStage: v.union(
    v.literal("seen"), v.literal("reply"),
    v.literal("act"), v.literal("report")
  ),
  alertType: v.union(
    v.literal("sla_breach"),
    v.literal("loop_stalled"),
    v.literal("loop_broken")
  ),
  fromAgent: v.string(),
  toAgent: v.string(),
  taskRef: v.optional(v.id("tasks")),
  messageContent: v.string(),
  expectedBy: v.number(),
  actualTime: v.optional(v.number()),
  breachDuration: v.number(),
  escalatedTo: v.optional(v.string()),
  resolved: v.boolean(),
  resolvedAt: v.optional(v.number()),
  resolution: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_unresolved", ["resolved", "createdAt"])
  .index("by_agent", ["toAgent", "resolved", "createdAt"])
  .index("by_message", ["messageId"])
```

#### 1.2 New Mutations (convex/messageStatus.ts)

Add 3 new mutations to the EXISTING messageStatus.ts file:

**markAsActed(messageId, taskId?, agentName)**
- Set statusCode = 4
- Set actedAt = Date.now()
- Link to task if provided
- Set expectedReportBy = +24 hours

**markAsReported(messageId, report, agentName)**
- Set statusCode = 5
- Set reportedAt = Date.now()
- Store finalReport
- Clear pending loopAlerts for this message
- LOOP CLOSED

**markLoopBroken(messageId, reason, agentName)**
- Set loopBroken = true
- Set loopBrokenReason
- Create loopAlert with alertType = "loop_broken"
- Escalate to MAX

**Update existing mutations:**
- markAsSeen: add `expectedReplyBy: Date.now() + 15*60*1000`
- markAsReplied: add `expectedActionBy: Date.now() + 2*60*60*1000`

#### 1.3 SLA Monitor (NEW file: convex/loopMonitor.ts)

Cron job every 5 minutes. Checks all active loops for SLA breaches:
- SEEN but not REPLIED > 15 min → create loopAlert
- REPLIED but not ACTED > 2 hours → alert + escalate to MAX
- ACTED but not REPORTED > 24 hours → alert + escalate to CEO

NOTE: Register cron in convex/crons.ts (existing file).

#### 1.4 Metrics Aggregation (NEW file: convex/loopMetrics.ts)

Hourly cron. For each agent:
- Count messages sent, loops completed, loops broken
- Calculate avg times per stage
- Store in loopMetrics table

**Acceptance criteria for P1:**
- Schema deployed with new fields + 2 new tables
- 3 new mutations working
- SLA monitor running every 5 min
- Metrics aggregation running hourly
- Test: send message → mark acted → mark reported → loop closes

---

### AGT-335: Loop P2 — Agent Protocol (SAM, Urgent, 10h)

**Dependencies:** Blocked by AGT-334 (needs schema first)
**State:** Backlog

**What SAM must build:**

1. Update playbooks (SESSION-START, TASK-COMPLETE) with Loop protocol
2. Add `linkedMessageId` field to `tasks` table
3. Update `completeTask` mutation to auto-close loops when task completes
4. Create reply templates doc
5. Add helper scripts for agents to check linked messages

---

### AGT-336: Loop P3 — CEO Dashboard (LEO, High, 20h)

**Dependencies:** Blocked by AGT-334 (needs backend queries)
**State:** Backlog

**What LEO must build:**

1. **LoopStatusWidget** — Real-time stats (active/completed/broken loops, health %)
2. **LoopTimeline** — Visual timeline per message showing all 5 stages
3. **AgentAccountabilityGrid** — Agent × Stage grid with SLA adherence
4. **LoopAlertsPanel** — Unresolved alerts grouped by severity
5. **`/app/loop/page.tsx`** — Combine all widgets, filters, CSV export

---

### AGT-337: Loop P4 — Enforcement (SAM, High, 12h)

**Dependencies:** Blocked by AGT-335
**State:** Backlog

**What SAM must build:**

1. **Loop Guardian** — Cron every 5 min, auto-nudge stalled loops
2. **Auto-nudges** — Send reminders at 10min/1hr/24hr thresholds
3. **Escalation protocol** — MAX can reassign/extend SLA on stuck loops
4. **Daily health report** — 6 PM daily summary broadcast

---

### AGT-338: Loop P5 — Analytics (LEO, Medium, 9h)

**Dependencies:** Blocked by AGT-336
**State:** Backlog

**What LEO must build:**

1. Analytics queries (trends, agent performance, bottlenecks, failure reasons)
2. Charts page (`/app/loop/analytics/page.tsx`) with Recharts
3. AI-powered insights panel

---

## PART 3: YOUR ORDERS

### Order 1: Dispatch SAM to AGT-334 NOW

Create a dispatch via Convex API:

```bash
curl -X POST "https://gregarious-elk-556.convex.site/createDispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "SAM",
    "command": "AGT-334: Loop P1 Backend Foundation - Schema & Mutations",
    "payload": "PRIORITY: URGENT. Read the full ticket AGT-334 on Linear for implementation details. Key deliverables: 1) Extend agentMessages schema with loop tracking fields (actedAt, reportedAt, loopBroken, SLA tracking, work linkage). 2) Add loopMetrics and loopAlerts tables. 3) Create markAsActed, markAsReported, markLoopBroken mutations in messageStatus.ts. 4) Update markAsSeen to set expectedReplyBy, markAsReplied to set expectedActionBy. 5) Create loopMonitor.ts cron (every 5min SLA check). 6) Create loopMetrics.ts cron (hourly aggregation). Files: convex/schema.ts, convex/messageStatus.ts, convex/loopMonitor.ts (new), convex/loopMetrics.ts (new). Use Opus 4.6 for schema design. Test: full loop must close end-to-end.",
    "priority": 0
  }'
```

### Order 2: DO NOT dispatch LEO yet

LEO is waiting for P1 schema to be deployed. When SAM completes AGT-334:
1. Move AGT-336 from Backlog → Todo on Linear
2. Dispatch LEO to AGT-336

Until then, LEO can work on AGT-287 (Tailwind color cleanup, low priority).

### Order 3: QUINN — Test strategy only

Tell QUINN to plan (not implement) test strategy for The Loop:
- Unit tests for loop mutations
- Integration tests for full loop cycle
- E2E tests for dashboard

### Order 4: MAX — Coordination

Clear MAX's stale dispatch (AGT-108 if still pending).
MAX assists with documentation and progress tracking.

### Order 5: Monitor & Report

**Every 2 hours**, check on SAM:
- Progress on AGT-334
- Any blockers
- Schema deployed yet?

Report to CEO via message:
```bash
curl -X POST "https://gregarious-elk-556.convex.site/v2/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"from": "EVOX", "to": "CEO", "message": "Loop P1 Status: [SAM progress]. Blockers: [none/details]. ETA: [estimate]", "priority": "normal"}'
```

**Escalate immediately if:**
- SAM stuck > 30 min on any subtask
- Schema conflict with existing tables
- Build fails (`npx next build`)
- Convex deploy fails (`npx convex deploy`)

---

## PART 4: TIMELINE

```
Week 1 (Feb 5-7):
  Day 1-2: AGT-334 (P1 Backend) — SAM ← WE ARE HERE
  Day 3:   AGT-335 (P2 Protocol) — SAM

Week 1-2 (Feb 7-12):
  Day 4-6: AGT-336 (P3 Dashboard) — LEO (start when P1 done)
  Day 5-6: AGT-337 (P4 Enforcement) — SAM

Week 2-3 (Feb 12-14):
  Day 7-8: AGT-338 (P5 Analytics) — LEO
```

Total: 64 hours, ~2-3 weeks with parallel work.

---

## PART 5: DEPENDENCIES

```
AGT-334 (P1: Backend) ─── blocks ──→ AGT-335 (P2: Protocol) ─── blocks ──→ AGT-337 (P4: Enforcement)
         └──────────── blocks ──→ AGT-336 (P3: Dashboard) ─── blocks ──→ AGT-338 (P5: Analytics)
```

---

## PART 6: CONVEX API REFERENCE

Base URL: `https://gregarious-elk-556.convex.site`

**Dispatch management:**
- `GET /getNextDispatchForAgent?agent=SAM` — Get next pending dispatch
- `GET /markDispatchRunning?dispatchId=XXX` — Mark dispatch as running
- `GET /markDispatchCompleted?dispatchId=XXX&result=Summary` — Mark complete

**Messaging:**
- `POST /v2/sendMessage` — Send DM: `{"from":"EVOX","to":"SAM","message":"...","priority":"urgent"}`
- `GET /v2/getMessages?agent=SAM&limit=10` — Get agent messages
- `POST /postToChannel` — Broadcast: `{"channel":"dev","from":"EVOX","message":"..."}`

---

## PART 7: SUCCESS CRITERIA

When The Loop is done:

- [ ] CEO sends message → agent auto-marks SEEN within 5 min
- [ ] Agent sends REPLY within 15 min
- [ ] Agent creates task (ACT) within 2 hours
- [ ] Agent reports completion (REPORT) within 24 hours
- [ ] SLA monitor auto-alerts on breaches
- [ ] CEO dashboard shows all loop statuses in real-time
- [ ] Daily health report generated automatically
- [ ] Loop completion rate > 95%

---

## PART 8: MODEL STRATEGY

This is the Opus 4.6 pilot project:
- **Schema design & architecture** → `--model opus` (Opus 4.6)
- **Implementation (mutations, crons, UI)** → default (Sonnet 4.5)
- **Simple tasks** → `--model haiku` (Haiku 4.5)

Track model usage for cost analysis. Report model used per subtask.

---

**EVOX: Acknowledge this directive and dispatch SAM to AGT-334 immediately.**

**The Loop is our North Star. Zero dropped work starts now.**
