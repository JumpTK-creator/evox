# EVOX Design System
## Mission Control Dashboard - Complete Specification

**Version:** 1.0
**Date:** 2026-02-05
**Designer:** MAX (Claude Sonnet 4.5)
**For:** LEO (Frontend Implementation)

---

## 🎯 Design Philosophy

### Core Principle: "Cockpit, Not Control Panel"

**Goal:** CEO sees system health in 3 seconds

**Inspiration:**
- Airplane cockpit (critical metrics only)
- Bloomberg Terminal (information density)
- Tesla dashboard (clean, minimal)

**Anti-patterns we avoid:**
- ❌ 50 charts overwhelming the screen
- ❌ Deep menu navigation (>3 clicks)
- ❌ Decorative elements without purpose
- ❌ Inconsistent spacing/colors

---

## 📐 Layout System

### Grid: 8px Base Unit

All spacing multiples of 8:
- 8px: Tight spacing (icon padding)
- 16px: Default spacing (card padding)
- 24px: Section spacing
- 32px: Page margins
- 64px: Major sections

### Breakpoints

```css
mobile: 0-640px      /* Single column */
tablet: 641-1024px   /* 2 columns */
desktop: 1025px+     /* 3 columns */
```

### Container Max-Width

```css
mobile: 100%
tablet: 768px
desktop: 1280px
```

---

## 🎨 Color System

### Semantic Colors (Dark Mode Default)

```css
/* Backgrounds */
--bg-primary: #0a0a0a;      /* Main background */
--bg-secondary: #1a1a1a;    /* Cards, surfaces */
--bg-tertiary: #2a2a2a;     /* Hover states */

/* Text */
--text-primary: #e5e5e5;    /* Main text */
--text-secondary: #a3a3a3;  /* Subtitles */
--text-tertiary: #666666;   /* Captions */

/* Status Colors */
--status-online: #10b981;   /* Green - Online */
--status-offline: #ef4444;  /* Red - Offline */
--status-warning: #f59e0b;  /* Yellow - Warning */
--status-info: #3b82f6;     /* Blue - Info */

/* Accent */
--accent-primary: #3b82f6;  /* Blue - Actions */
--accent-hover: #2563eb;    /* Darker blue */

/* Borders */
--border-default: #333333;
--border-focus: #3b82f6;
```

### Status Indicators

```
🟢 Green (#10b981)  = Online, Success, Completed
🔴 Red (#ef4444)    = Offline, Error, Critical
🟡 Yellow (#f59e0b) = Warning, Waiting, Blocked
🔵 Blue (#3b82f6)   = Information, Action, Link
⚪ Gray (#666666)   = Disabled, Archived
```

---

## 📝 Typography

### Font Stack

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Display",
  "Segoe UI",
  Roboto,
  sans-serif;
```

**Why system fonts:**
- Native look & feel
- Fast loading (no web font)
- Excellent readability

### Scale

```css
--font-h1: 48px / 1.2 / 700    /* Dashboard title */
--font-h2: 32px / 1.3 / 700    /* Section headers */
--font-h3: 24px / 1.4 / 600    /* Card titles */
--font-body: 16px / 1.5 / 400  /* Content */
--font-caption: 14px / 1.4 / 400  /* Timestamps */
--font-label: 12px / 1.3 / 500    /* Labels */
```

### Usage Examples

```html
<h1>EVOX MISSION CONTROL</h1>        <!-- 48px bold -->
<h2>Velocity</h2>                     <!-- 32px bold -->
<h3>12 tasks/day</h3>                 <!-- 24px semibold -->
<p>Up 20% from yesterday</p>          <!-- 16px regular -->
<span>Updated 2 min ago</span>        <!-- 14px regular -->
```

---

## 🧱 Component Library

### 1. Metric Card

**Purpose:** Display key performance metric

**Anatomy:**
```
┌─────────────────────────┐
│ 🚀 VELOCITY             │  ← Icon (24px) + Label (14px)
│                         │
│        12               │  ← Value (48px bold)
│     tasks/day           │  ← Unit (16px)
│                         │
│     ↑ +20%              │  ← Trend (14px + arrow)
│                         │
│ Updated 2 min ago       │  ← Timestamp (12px)
└─────────────────────────┘
```

**Specs:**
```css
.metric-card {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  min-width: 280px;
  min-height: 200px;
}

.metric-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
  margin: 16px 0 4px 0;
}

.metric-unit {
  font-size: 16px;
  color: var(--text-secondary);
}

.metric-trend {
  font-size: 14px;
  margin-top: 16px;
}

.metric-trend.up {
  color: var(--status-online);
}

.metric-trend.down {
  color: var(--status-offline);
}
```

**States:**
- Default
- Hover (subtle scale 1.02)
- Loading (skeleton)

---

### 2. Agent Card

**Purpose:** Show agent status and current work

**Anatomy:**
```
┌─────────────────────────┐
│ 🟢 MAX                  │  ← Status dot + Name
│                         │
│ Coordinating            │  ← Activity
│ AGT-332                 │  ← Task link
│                         │
│ 3h 15m active           │  ← Time
└─────────────────────────┘
```

**Specs:**
```css
.agent-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  min-width: 200px;
  cursor: pointer;
  transition: all 0.2s;
}

.agent-card:hover {
  background: var(--bg-tertiary);
  transform: translateY(-2px);
}

.agent-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
}

.agent-status.online {
  background: var(--status-online);
  box-shadow: 0 0 8px var(--status-online);
}

.agent-status.offline {
  background: var(--status-offline);
}

.agent-name {
  font-size: 16px;
  font-weight: 600;
}

.agent-activity {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 8px 0;
}

.agent-task {
  font-size: 14px;
  color: var(--accent-primary);
  text-decoration: none;
}

.agent-time {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}
```

**States:**
- Online (green dot, shadow)
- Offline (red dot, no shadow)
- Hover (lift effect)
- Selected (blue border)

---

### 3. Activity Feed Item

**Purpose:** Show recent agent activity

**Anatomy:**
```
┌─────────────────────────────────────┐
│ 18:02  SAM → MAX                    │  ← Time + From/To
│                                     │
│ "AGT-332 implementation started"   │  ← Message
│                                     │
│ [View Task]                         │  ← Action (optional)
└─────────────────────────────────────┘
```

**Specs:**
```css
.feed-item {
  border-bottom: 1px solid var(--border-default);
  padding: 16px 0;
}

.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.feed-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.feed-agents {
  font-size: 14px;
  font-weight: 500;
}

.feed-message {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.feed-action {
  margin-top: 8px;
  font-size: 12px;
  color: var(--accent-primary);
}
```

---

### 4. Message Card (with Status)

**Purpose:** Show message with read receipt

**Anatomy:**
```
┌─────────────────────────────────────┐
│ MAX → EVOX                    👁️ 2 │  ← From/To + Status
│                                     │
│ "AGT-332 created. Please review"   │  ← Preview
│                                     │
│ 5:48 PM  •  Seen                    │  ← Time + Status
└─────────────────────────────────────┘
```

**Specs:**
```css
.message-card {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
}

.message-card:hover {
  background: var(--bg-tertiary);
}

.message-card.unread {
  border-left: 3px solid var(--accent-primary);
  background: rgba(59, 130, 246, 0.05);
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.message-participants {
  font-size: 14px;
  font-weight: 600;
}

.message-status {
  font-size: 12px;
  color: var(--text-tertiary);
}

.message-preview {
  font-size: 14px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-footer {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}
```

**Status Indicators:**
```
pending: ⏳ (gray)
delivered: 📬 (blue)
seen: 👁️ (green)
replied: 💬 (purple)
```

---

## 📱 Screen Layouts

### Screen 1: Dashboard (Home)

**Purpose:** Quick system health check

**Layout (Mobile):**
```
┌─────────────────────────┐
│ Header                  │  64px
├─────────────────────────┤
│                         │
│ Big 3 Metrics           │  600px
│ (3 metric cards)        │
│                         │
├─────────────────────────┤
│                         │
│ Agent Status            │  400px
│ (5 agent cards)         │
│                         │
├─────────────────────────┤
│                         │
│ Live Feed               │  Fill
│ (activity items)        │
│                         │
└─────────────────────────┘
│ Bottom Nav              │  64px
└─────────────────────────┘
```

**Layout (Desktop):**
```
┌──────────────────────────────────────┐
│ Header                               │ 64px
├──────────────────────────────────────┤
│                                      │
│  Big 3 Metrics (horizontal)          │ 240px
│  [Velocity] [Quality] [Cost]         │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  Agent Status (grid 3 cols)          │ 280px
│  [MAX] [SAM] [LEO]                   │
│  [EVOX] [QUINN]                      │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  Live Feed (2 cols)                  │ Fill
│  [Activity Stream] [Quick Actions]   │
│                                      │
└──────────────────────────────────────┘
```

**Components:**
- Header (logo, user, notifications)
- 3x Metric Cards
- 5x Agent Cards
- Activity Feed (infinite scroll)
- Bottom Nav (mobile) / Sidebar (desktop)

---

### Screen 2: Messages

**Purpose:** View and manage agent messages

**Layout:**
```
┌─────────────────────────────────────┐
│ Header                              │
├─────────────────────────────────────┤
│ [Filter ▼]  [Search]  [Compose]    │  56px
├──────────────┬──────────────────────┤
│              │                      │
│ Conversations│  Message Thread      │
│ List         │                      │
│              │  [Messages...]       │
│ [MAX→EVOX]   │                      │
│ [SAM→MAX]    │  [Reply box]         │
│ [LEO→SAM]    │                      │
│              │                      │
└──────────────┴──────────────────────┘
```

**Desktop:** 2-column (list + detail)
**Mobile:** Stack (tap conversation → detail)

---

### Screen 3: Agents

**Purpose:** Deep dive into agent performance

**Layout:**
```
┌─────────────────────────────────────┐
│ Header                              │
├─────────────────────────────────────┤
│                                     │
│ [Agent Selector]                    │
│ [MAX] SAM  LEO  EVOX  QUINN         │
│  ^^^                                │
├─────────────────────────────────────┤
│                                     │
│ Agent Overview                      │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│ │Tasks│ │Time │ │Qual.│ │Cost │  │
│ └─────┘ └─────┘ └─────┘ └─────┘  │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ Charts                              │
│ [Velocity Trend]                    │
│ [Quality Over Time]                 │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ Recent Activity                     │
│ [Task history...]                   │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎬 Animations

### Micro-interactions

**Card Hover:**
```css
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.2);
  transition: all 0.2s ease;
}
```

**Status Indicator Pulse (Online):**
```css
@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
  }
}

.status-online {
  animation: pulse 2s infinite;
}
```

**Loading Skeleton:**
```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 0%,
    var(--bg-tertiary) 50%,
    var(--bg-secondary) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

**Toast Notification:**
```css
@keyframes slideInRight {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast {
  animation: slideInRight 0.3s ease;
}
```

---

## 🔔 Notifications

### Toast Style

```
┌──────────────────────────┐
│ 💬 New message           │  ← Icon + Title
│ MAX → EVOX               │  ← Details
│                          │
│ [View] [Dismiss]         │  ← Actions
└──────────────────────────┘
```

**Position:** Top-right (desktop), Top-center (mobile)
**Duration:** 5s auto-dismiss
**Stack:** Max 3 visible

**Types:**
- Info (blue)
- Success (green)
- Warning (yellow)
- Error (red)

---

## 📊 Charts

### Velocity Trend Line Chart

```css
.chart-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 24px;
  height: 300px;
}

.chart-line {
  stroke: var(--accent-primary);
  stroke-width: 2px;
  fill: none;
}

.chart-area {
  fill: url(#gradient);
  opacity: 0.2;
}

.chart-dot {
  fill: var(--accent-primary);
  stroke: var(--bg-secondary);
  stroke-width: 2px;
  r: 4px;
}

.chart-dot:hover {
  r: 6px;
  cursor: pointer;
}
```

**Library:** Use Chart.js or Recharts
**Theme:** Dark mode compatible
**Responsive:** Scales on mobile

---

## ⌨️ Keyboard Shortcuts

```
/ = Focus search
n = New message
? = Show shortcuts
esc = Close modal
j/k = Navigate list
g+d = Go to dashboard
g+m = Go to messages
g+a = Go to agents
```

---

## 🎯 Interaction Patterns

### 1. Click Target Size

Minimum 44x44px for touch targets

```css
.button, .link {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 24px;
}
```

### 2. Loading States

Always show loading feedback:
- Skeleton for initial load
- Spinner for actions
- Progress bar for uploads

### 3. Empty States

Provide guidance when no data:

```
┌────────────────────────┐
│        📭              │
│                        │
│   No messages yet      │
│                        │
│ [Send first message]   │
└────────────────────────┘
```

### 4. Error States

Clear, actionable error messages:

```
┌────────────────────────┐
│        ⚠️              │
│                        │
│   Failed to load       │
│   agents               │
│                        │
│ [Retry] [Report]       │
└────────────────────────┘
```

---

## 📐 Spacing Scale

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
--space-3xl: 64px;
```

**Usage:**
```css
.card {
  padding: var(--space-md);      /* 16px */
  margin-bottom: var(--space-lg); /* 24px */
}

.section {
  margin-bottom: var(--space-2xl); /* 48px */
}
```

---

## 🎨 Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
```

**Usage:**
- Cards: `--shadow-md`
- Modals: `--shadow-xl`
- Hover: `--shadow-lg`

---

## 🔒 Accessibility

### WCAG 2.1 AA Compliance

**Color Contrast:**
- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

**Keyboard Navigation:**
- All actions accessible via keyboard
- Focus indicators visible
- Tab order logical

**Screen Readers:**
- Semantic HTML
- ARIA labels where needed
- Alt text for images

**Example:**
```html
<button aria-label="Send message to EVOX">
  Send
</button>

<img src="avatar.png" alt="MAX agent avatar" />

<div role="status" aria-live="polite">
  Message sent successfully
</div>
```

---

## 📦 Component Implementation Guide

### For LEO (Frontend Agent):

**Tech Stack:**
- Next.js 14 (App Router)
- TailwindCSS (utility-first)
- Framer Motion (animations)
- Radix UI (primitives)

**File Structure:**
```
app/
  dashboard/
    page.tsx
  messages/
    page.tsx
  agents/
    page.tsx

components/
  metrics/
    MetricCard.tsx
    MetricGrid.tsx
  agents/
    AgentCard.tsx
    AgentGrid.tsx
  feed/
    ActivityFeed.tsx
    FeedItem.tsx
  messages/
    MessageCard.tsx
    MessageList.tsx
    MessageThread.tsx

lib/
  design-tokens.ts
  utils.ts
```

**Example Component:**
```typescript
// components/metrics/MetricCard.tsx
interface MetricCardProps {
  icon: string;
  label: string;
  value: number;
  unit: string;
  trend: {
    direction: 'up' | 'down';
    percentage: number;
  };
  updatedAt: Date;
}

export function MetricCard({
  icon, label, value, unit, trend, updatedAt
}: MetricCardProps) {
  return (
    <div className="metric-card bg-secondary rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-medium uppercase">{label}</span>
      </div>

      <div className="text-5xl font-bold mb-1">
        {value}
      </div>

      <div className="text-secondary mb-4">
        {unit}
      </div>

      <div className={`text-sm ${
        trend.direction === 'up' ? 'text-success' : 'text-error'
      }`}>
        {trend.direction === 'up' ? '↑' : '↓'} {trend.percentage}%
      </div>

      <div className="text-xs text-tertiary mt-4">
        Updated {formatRelativeTime(updatedAt)}
      </div>
    </div>
  );
}
```

---

## 🚀 Implementation Phases

### Phase 1: Core Dashboard (3 days)
- [ ] Design tokens setup
- [ ] Metric Card component
- [ ] Agent Card component
- [ ] Dashboard layout
- [ ] Mobile responsive

### Phase 2: Messages (2 days)
- [ ] Message Card component
- [ ] Conversation list
- [ ] Message thread view
- [ ] Status indicators

### Phase 3: Agent Detail (2 days)
- [ ] Agent selector
- [ ] Performance metrics
- [ ] Activity charts
- [ ] History timeline

### Phase 4: Polish (2 days)
- [ ] Animations
- [ ] Loading states
- [ ] Empty states
- [ ] Error handling
- [ ] Keyboard shortcuts

---

## 📝 Design Checklist

Before shipping, verify:

- [ ] All text readable (contrast 4.5:1)
- [ ] Touch targets 44x44px minimum
- [ ] Keyboard navigation works
- [ ] Loading states implemented
- [ ] Error states handled
- [ ] Empty states designed
- [ ] Mobile responsive
- [ ] Dark mode looks good
- [ ] Animations smooth (60fps)
- [ ] No layout shift (CLS)

---

## 🎨 Figma File Structure

```
📁 EVOX Design System
  📄 Cover
  📄 Design Principles
  📄 Color System
  📄 Typography
  📄 Components
    - Metric Card
    - Agent Card
    - Message Card
    - Feed Item
  📄 Screens
    - Dashboard
    - Messages
    - Agents
  📄 Prototypes
    - User Flow
    - Interactions
```

---

## 📚 Resources

**Design Tools:**
- Figma: Design & prototyping
- Contrast Checker: WCAG compliance
- Color Picker: Semantic colors

**Code Tools:**
- TailwindCSS: Utility classes
- Radix UI: Accessible primitives
- Framer Motion: Animations

**Inspiration:**
- Linear (clean, fast)
- Vercel Dashboard (minimal)
- Stripe Dashboard (clarity)

---

**Status:** READY FOR IMPLEMENTATION
**Next:** Create Figma mockups or start coding

🤖 Design System by MAX (Claude Sonnet 4.5)
