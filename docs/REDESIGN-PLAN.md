# EVOX UI Redesign Plan

> **Goal:** CEO/COO reads and decides in 3 seconds.

**Lead:** MAYA (Design)
**Date:** Feb 5, 2026
**Status:** In Progress

---

## Executive Summary

Current dashboard shows too much data. CEO has to scan entire page to understand system health.

**Solution:** Hero status banner that shows ONE thing: Is everything OK or not?

---

## Current Problems

1. **Information Overload** — 6+ metrics competing for attention
2. **No Priority** — Critical alerts buried in lists
3. **Desktop-First** — Breaks on mobile
4. **Text Heavy** — Too many labels, not enough signal
5. **No Action** — Shows status but not what to do

---

## Design Principles

| # | Principle | Implementation |
|---|-----------|----------------|
| 1 | **3-Second Rule** | Hero status visible immediately |
| 2 | **Traffic Light** | Green/Yellow/Red = Good/Warning/Action |
| 3 | **Mobile-First** | Single column, 375px base |
| 4 | **Action-Oriented** | Show what needs attention |
| 5 | **Glanceable** | Numbers > text, icons > labels |

---

## Component Architecture

### New Components

```
components/evox/redesign/
├── HeroStatus.tsx      # Main status banner
├── AlertList.tsx       # Critical/warning items
├── TeamStrip.tsx       # Horizontal agent pills
├── MetricRow.tsx       # 2-4 key metrics
├── QuickAction.tsx     # Action buttons
└── MobileCEODashboard.tsx  # Mobile layout
```

### Component Specs

#### 1. HeroStatus

**Purpose:** Show system health in ONE glance

**States:**
- 🟢 GREEN: "ALL GOOD" — All agents working, no blockers
- 🟡 YELLOW: "X BLOCKERS" — Tasks blocked or agents idle
- 🔴 RED: "ACTION NEEDED" — Agents offline or critical issues

**Code:**
```tsx
<HeroStatus
  status="green" | "yellow" | "red"
  headline="ALL GOOD"
  subtext="4 agents • 12 tasks • $4.20"
/>
```

#### 2. AlertList

**Purpose:** Show what needs immediate attention

**Priority Order:**
1. Offline agents (red)
2. Critical tasks blocked (red)
3. Tasks blocked > 1h (yellow)
4. Agents idle > 30m (yellow)

**Code:**
```tsx
<AlertList
  alerts={[
    { severity: "critical", message: "SAM offline 15m", action: "ping" },
    { severity: "warning", message: "AGT-280 blocked", action: "view" },
  ]}
/>
```

#### 3. TeamStrip

**Purpose:** Quick view of team status

**Display:** Horizontal scroll, shows status dot + name

**Code:**
```tsx
<TeamStrip
  agents={agents}
  maxVisible={4}
  onTap={(agent) => showDetail(agent)}
/>
```

#### 4. MetricRow

**Purpose:** Key metrics at a glance

**Metrics:**
- Tasks completed today
- Cost spent today
- Automation % (optional)
- Team health % (optional)

**Code:**
```tsx
<MetricRow
  metrics={[
    { label: "Tasks", value: 12 },
    { label: "Cost", value: "$4.20" },
  ]}
/>
```

---

## Task Breakdown

### LEO — Frontend Engineer

| ID | Task | Priority | Est | Dependencies |
|----|------|----------|-----|--------------|
| `LEO-R1` | Create HeroStatus component | P0 | 1h | — |
| `LEO-R2` | Create AlertList component | P0 | 1h | — |
| `LEO-R3` | Create TeamStrip component | P1 | 45m | — |
| `LEO-R4` | Update MetricRow for 2-col mobile | P1 | 30m | — |
| `LEO-R5` | Build MobileCEODashboard layout | P0 | 1h | LEO-R1, R2 |
| `LEO-R6` | Add agent detail sheet (bottom) | P2 | 1h | LEO-R3 |
| `LEO-R7` | Implement pull-to-refresh | P2 | 30m | LEO-R5 |
| `LEO-R8` | Add loading skeletons | P2 | 30m | — |

### FINN — Frontend Engineer

| ID | Task | Priority | Est | Dependencies |
|----|------|----------|-----|--------------|
| `FINN-R1` | Agent detail mobile view | P1 | 1h | — |
| `FINN-R2` | Ping agent action flow | P1 | 30m | FINN-R1 |
| `FINN-R3` | Activity stream with infinite scroll | P2 | 1h | — |
| `FINN-R4` | Empty states for all sections | P2 | 30m | — |
| `FINN-R5` | Haptic feedback on actions | P3 | 30m | FINN-R2 |

### SAM — Backend Engineer

| ID | Task | Priority | Est | Dependencies |
|----|------|----------|-----|--------------|
| `SAM-R1` | Add `dashboard.getHeroStatus` query | P0 | 30m | — |
| `SAM-R2` | Add `dashboard.getAlerts` query | P0 | 30m | — |
| `SAM-R3` | Add `agents.getSummary` query | P1 | 30m | — |
| `SAM-R4` | Optimize queries for mobile perf | P2 | 1h | SAM-R1, R2 |

---

## Implementation Schedule

### Day 1 (Today) — Core

**Morning:**
- [ ] SAM: Create `getHeroStatus` and `getAlerts` queries
- [ ] LEO: Build HeroStatus component
- [ ] LEO: Build AlertList component

**Afternoon:**
- [ ] LEO: Build MobileCEODashboard layout
- [ ] MAYA: Review and iterate on designs

### Day 2 — Team View

**Morning:**
- [ ] LEO: Build TeamStrip component
- [ ] FINN: Build Agent detail view

**Afternoon:**
- [ ] FINN: Implement ping action
- [ ] LEO: Wire up navigation

### Day 3 — Polish

- [ ] FINN: Activity stream infinite scroll
- [ ] LEO: Pull-to-refresh
- [ ] LEO: Loading skeletons
- [ ] MAYA: Final review
- [ ] QUINN: QA pass

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Time to understand | < 3 sec | User testing |
| Mobile usability | 100% | Works on 375px |
| Touch targets | > 44px | Audit all buttons |
| Page load | < 2 sec | Lighthouse |
| Lighthouse a11y | > 90 | Audit |

---

## Wireframes

See: [docs/REDESIGN-WIREFRAMES.md](./REDESIGN-WIREFRAMES.md)

---

## API Requirements

### `dashboard.getHeroStatus`

```typescript
type HeroStatus = {
  status: "green" | "yellow" | "red";
  headline: string;
  subtext: string;
  metrics: {
    activeAgents: number;
    totalAgents: number;
    tasksToday: number;
    costToday: number;
  };
};
```

### `dashboard.getAlerts`

```typescript
type Alert = {
  id: string;
  severity: "critical" | "warning";
  type: "agent_offline" | "task_blocked" | "agent_idle";
  message: string;
  entityId: string;
  duration: number; // minutes
  action: "ping" | "view" | "resolve";
};
```

---

## File Structure

```
components/evox/
├── redesign/           # New redesign components
│   ├── HeroStatus.tsx
│   ├── AlertList.tsx
│   ├── TeamStrip.tsx
│   ├── MetricRow.tsx
│   └── MobileCEODashboard.tsx
├── CEODashboard.tsx    # Keep existing (desktop)
└── ...
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Desktop users disrupted | Keep existing dashboard, add mobile view |
| Performance regression | Lazy load non-critical components |
| Scope creep | Strict P0 focus, defer P2/P3 |

---

## Sign-off

| Role | Name | Approved |
|------|------|----------|
| Design | MAYA | ✅ |
| PM | MAX | ✅ |
| Frontend | LEO | ⏳ |
| Backend | SAM | ⏳ |

---

_Last updated: Feb 5, 2026_
