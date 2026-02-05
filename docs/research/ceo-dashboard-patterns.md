# CEO Dashboard Patterns

> **For:** MAYA (Design) | **From:** COLE (Research) | **AGT-309**
> **North Star:** CEO sees impact in 3 seconds

---

## 1. What Metrics Do CEOs Need at a Glance?

### The Airplane Cockpit Principle
> "A CEO dashboard is like an airplane cockpit—the pilot doesn't need mechanical details of every engine component, but must see altitude, speed, fuel levels, and critical warnings instantly."

### Essential Metrics for EVOX CEO

| Category | Metric | Why It Matters |
|----------|--------|----------------|
| **Health** | Agent Status (4/4 online) | Are we operational? |
| **Velocity** | Tasks Done Today | Are we productive? |
| **Efficiency** | Avg Task Time | Are we fast? |
| **Cost** | $ Spent Today | Are we efficient? |
| **Quality** | Build Status | Are we shipping clean? |
| **Blockers** | Stuck Tasks (>30 min) | What needs attention? |

### Information Hierarchy (Top to Bottom)

```
1. CRITICAL ALERTS (Red banner if any issue)
   └─ "Agent SAM offline for 15 min"

2. HERO METRICS (3-second glance)
   └─ Tasks: 12 | Agents: 4/4 | Cost: $2.34

3. AGENT STATUS (Quick scan)
   └─ SAM ● | LEO ● | QUINN ○ | MAX ●

4. ACTIVITY FEED (What's happening now)
   └─ Recent commits, tasks, messages

5. DETAILED VIEWS (Click to expand)
   └─ Performance charts, logs, history
```

---

## 2. Best Layout Patterns

### Pattern A: Hero Number (Mercury Style)
```
┌─────────────────────────────────────┐
│            12 TASKS                 │  ← Hero metric
│         Completed Today             │
├─────────────────────────────────────┤
│  ↑ 8 Backend  │  ↑ 4 Frontend       │  ← Breakdown
└─────────────────────────────────────┘
```
**When to use:** Single most important metric (velocity, revenue)

### Pattern B: Status Grid (Vercel Style)
```
┌──────────┬──────────┬──────────┬──────────┐
│  SAM     │  LEO     │  QUINN   │  MAX     │
│  ● busy  │  ● idle  │  ○ off   │  ● busy  │
│  AGT-309 │  —       │  —       │  AGT-310 │
└──────────┴──────────┴──────────┴──────────┘
```
**When to use:** Multiple entities with same status types

### Pattern C: Timeline (Datadog Style)
```
┌─────────────────────────────────────┐
│  [1h] [24h] [7d] [30d]              │  ← Time selector
├─────────────────────────────────────┤
│  ████████████▓▓▓░░░░░░░░░░░░░░░░░   │  ← Sparkline
│  Tasks: 12    Peak: 3/hr            │
└─────────────────────────────────────┘
```
**When to use:** Trends, patterns over time

### Pattern D: Alert Banner (Universal)
```
┌─────────────────────────────────────┐
│  🔴 ALERT: Agent SAM offline 15min  │  ← Critical
│  🟡 WARNING: Task stuck 45 min      │  ← Warning
└─────────────────────────────────────┘
```
**When to use:** Immediate attention required

---

## 3. Top 3 Dashboard Examples

### #1: Linear (Task Management)
**Why It's Great:**
- Monochrome base + color only for status
- Keyboard-first (Cmd+K command palette)
- Dense, scannable lists
- Filters as tabs

**Steal This:**
- Command palette for quick actions
- Status colors only (no decorative colors)
- Dense information display

### #2: Mercury (Banking)
**Why It's Great:**
- Hero number dominates (account balance)
- Generous whitespace = trust/calm
- Consistent iconography
- Real-time sync indicators

**Steal This:**
- Hero metric pattern (biggest number = most important)
- "Last synced: 2s ago" indicator
- Whitespace for breathing room

### #3: Vercel (Deployment)
**Why It's Great:**
- Status at a glance (green dot = good)
- Relative timestamps ("3m ago" not "10:42 AM")
- Progressive disclosure (summary → details)
- Mobile-responsive

**Steal This:**
- Status dots as primary indicator
- Relative timestamps everywhere
- Click-to-expand for details

---

## 4. EVOX CEO Dashboard Recommendations

### Immediate Changes

1. **Add Hero Metrics Section**
   ```
   Tasks: 12 | Agents: 4/4 | Cost: $2.34
   ```

2. **Improve Agent Cards**
   - Bigger status dots
   - Show current task inline
   - Add mini sparkline

3. **Add Alert Banner**
   - Red: Agent offline
   - Yellow: Task stuck >30 min

4. **Time Range Selector**
   - "Last 1h | 24h | 7d"

### Design System

```css
/* Colors: Status only */
--online: #22c55e;   /* green */
--busy: #eab308;     /* yellow */
--idle: #71717a;     /* gray */
--offline: #ef4444;  /* red */

/* Typography */
--hero: 48px bold;   /* Big numbers */
--title: 24px;       /* Section headers */
--body: 14px;        /* Regular text */
--small: 12px;       /* Timestamps */
```

---

## Summary

| Question | Answer |
|----------|--------|
| What metrics? | Health, Velocity, Cost, Quality, Blockers |
| What layout? | Hero → Status Grid → Activity → Details |
| What examples? | Linear, Mercury, Vercel |

**North Star Check:** CEO can assess team health in 3 seconds? ✅

---

*Created: 2026-02-05 by COLE*
*Source research: docs/DASHBOARD-RESEARCH.md (371 lines)*
