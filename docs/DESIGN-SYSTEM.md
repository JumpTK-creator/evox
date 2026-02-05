# EVOX Design System

> Mobile-first. Dark mode default. Consistent. Accessible.

---

## Quick Reference

```tsx
// Colors - Use semantic tokens, not raw values
className="bg-evox-surface text-evox-text-primary"
className="border-evox-border"
className="text-evox-success" // green
className="text-evox-warning" // yellow
className="text-evox-error"   // red
className="text-evox-info"    // blue

// Status Colors (AGT-273)
className="bg-green-500"  // Online
className="bg-yellow-500" // Busy/Working
className="bg-zinc-500"   // Idle
className="bg-red-500"    // Offline/Error

// Responsive Patterns
className="text-xs sm:text-sm"           // Text scaling
className="p-2 sm:p-4"                   // Padding scaling
className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" // Grid breakpoints
className="flex-col sm:flex-row"         // Stack → Row
```

---

## 1. Color Palette

### Semantic Tokens

| Token | Usage | Value |
|-------|-------|-------|
| `evox-bg` | Page background | `#000000` |
| `evox-surface` | Card/panel background | `#0a0a0a` |
| `evox-surface-raised` | Elevated surfaces | `#0f0f0f` |
| `evox-surface-hover` | Hover states | `#1a1a1a` |
| `evox-border` | Default borders | `#222222` |
| `evox-border-subtle` | Subtle borders | `#1a1a1a` |
| `evox-text-primary` | Primary text | `#fafafa` |
| `evox-text-secondary` | Secondary text | `#888888` |
| `evox-text-muted` | Muted/disabled text | `#555555` |

### Status Colors (Mandatory - AGT-273)

```tsx
// ALWAYS use these for agent/system status
const statusColors = {
  online: "bg-green-500",   // #22c55e
  busy: "bg-yellow-500",    // #eab308
  idle: "bg-zinc-500",      // #71717a
  offline: "bg-red-500",    // #ef4444
};
```

### Accent Colors

| Color | Class | Usage |
|-------|-------|-------|
| Blue | `text-blue-400` / `bg-blue-500` | Primary actions, links |
| Emerald | `text-emerald-400` / `bg-emerald-500` | Success, positive |
| Yellow | `text-yellow-400` / `bg-yellow-500` | Warning, busy |
| Red | `text-red-400` / `bg-red-500` | Error, destructive |
| Purple | `text-purple-400` / `bg-purple-500` | Special, highlights |

---

## 2. Typography

### Scale

| Name | Class | Size | Usage |
|------|-------|------|-------|
| Display | `text-2xl sm:text-3xl` | 24-30px | Page titles |
| Title | `text-lg sm:text-xl` | 18-20px | Section headers |
| Subtitle | `text-sm sm:text-base` | 14-16px | Card titles |
| Body | `text-xs sm:text-sm` | 12-14px | Default content |
| Caption | `text-[10px] sm:text-xs` | 10-12px | Labels, timestamps |
| Micro | `text-[9px]` | 9px | Badges, tiny labels |

### Font Weights

```tsx
font-normal   // 400 - Body text
font-medium   // 500 - Emphasis
font-semibold // 600 - Headings
font-bold     // 700 - Strong emphasis
```

### Font Families

```tsx
font-sans  // Geist Sans - UI text
font-mono  // Geist Mono - Code, IDs, data
```

---

## 3. Spacing

### Scale (4px base)

| Token | Value | Usage |
|-------|-------|-------|
| `0.5` | 2px | Micro gaps |
| `1` | 4px | Tight spacing |
| `1.5` | 6px | Compact elements |
| `2` | 8px | Default gap |
| `3` | 12px | Component padding |
| `4` | 16px | Section padding |
| `6` | 24px | Large spacing |
| `8` | 32px | Section gaps |

### Responsive Padding Pattern

```tsx
// Cards
className="p-3 sm:p-4"

// Containers
className="p-2 sm:p-4 lg:p-6"

// Inline elements
className="px-2 sm:px-3 py-1 sm:py-1.5"
```

---

## 4. Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| Default | 0px+ | Mobile |
| `sm:` | 640px+ | Large phones |
| `md:` | 768px+ | Tablets |
| `lg:` | 1024px+ | Laptops |
| `xl:` | 1280px+ | Desktops |

### Mobile-First Grid Pattern

```tsx
// 1 → 2 → 3 columns
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"

// 2 → 3 → 6 columns (metrics)
className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3"
```

---

## 5. Components

### StatusDot

```tsx
<span className={cn(
  "h-2 w-2 rounded-full shrink-0",
  status === "online" && "bg-green-500",
  status === "busy" && "bg-yellow-500 animate-pulse",
  status === "idle" && "bg-zinc-500",
  status === "offline" && "bg-red-500",
)} />
```

### Card

```tsx
<div className="rounded-lg border border-evox-border bg-evox-surface p-3 sm:p-4">
  {/* Content */}
</div>
```

### Badge/Tag

```tsx
<span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
  Label
</span>
```

### Metric Card

```tsx
<div className="rounded border border-white/10 bg-zinc-900/50 p-3">
  <div className="text-[9px] font-medium uppercase tracking-wider text-white/30">
    Title
  </div>
  <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">
    42
  </div>
</div>
```

### Interactive List Item

```tsx
<div className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded hover:bg-evox-surface-hover transition-colors cursor-pointer">
  {/* Content */}
</div>
```

---

## 6. Patterns

### Responsive Text with Truncation

```tsx
<span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
  {longText}
</span>
```

### Stack on Mobile, Row on Desktop

```tsx
<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
  {/* Items */}
</div>
```

### Horizontal Scroll on Mobile

```tsx
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
  {/* Items with shrink-0 */}
</div>
```

### Hide on Mobile

```tsx
<span className="hidden sm:inline">Desktop only</span>
<span className="sm:hidden">Mobile only</span>
```

---

## 7. Animation

### Pulse (Loading/Active)

```tsx
className="animate-pulse"
```

### Transition

```tsx
className="transition-colors"  // Color changes
className="transition-all"     // All properties
```

### Agent Working Pulse

```tsx
className="agent-pulse"  // Custom animation in globals.css
```

---

## 8. Accessibility

### Required Attributes

```tsx
// Buttons
<button type="button" aria-label="Close">

// Images
<img alt="Description" />

// Icons (decorative)
<Icon aria-hidden="true" />

// Interactive regions
<div role="tablist" aria-label="Dashboard views">
<button role="tab" aria-selected={isActive}>

// Alerts
<div role="alert" aria-live="assertive">
```

### Focus States

All interactive elements must have visible focus states:

```tsx
className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
```

---

## 9. Dark Mode

EVOX is dark-mode by default. Always use:

- `bg-*` with dark values (`bg-zinc-900`, `bg-black`)
- `text-*` with light values (`text-white`, `text-zinc-400`)
- `border-*` with subtle values (`border-zinc-800`, `border-white/10`)

Never use light mode colors like `bg-white` or `text-black`.

---

## 10. File Structure

```
components/
├── ui/           # Base primitives (shadcn)
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── evox/         # EVOX-specific components
│   ├── AgentCard.tsx
│   ├── AgentStatusIndicator.tsx
│   ├── MetricCard.tsx
│   ├── StatusBadge.tsx
│   └── ...
└── dashboard-v2/ # Dashboard-specific
```

---

## 11. Component Index

### Base Components (components/ui/)

| Component | Description |
|-----------|-------------|
| `Button` | Primary action button with variants |
| `Card` | Container with border and padding |
| `Badge` | Small label/tag |
| `Input` | Text input field |
| `Switch` | Toggle switch |

### EVOX Components (components/evox/)

| Component | Description |
|-----------|-------------|
| `AgentCard` | Agent card with status, keywords |
| `AgentStatusIndicator` | Status dot with consistent colors |
| `MetricCard` | Dashboard metric display |
| `StatusBadge` | Status pill with color coding |
| `ActivityFeed` | Real-time activity list |
| `ViewTabs` | Tab navigation |

---

## 12. Do's and Don'ts

### Do

- Use semantic color tokens
- Use responsive classes (`sm:`, `md:`, `lg:`)
- Use `cn()` for conditional classes
- Test on mobile viewport first
- Use `shrink-0` for icons/avatars
- Use `truncate` for text overflow

### Don't

- Hard-code colors like `#ff0000`
- Use fixed widths without responsive alternatives
- Forget mobile padding adjustments
- Use light mode colors
- Skip accessibility attributes
- Create new color tokens without approval

---

## Quick Start

```tsx
import { cn } from "@/lib/utils";

export function MyComponent({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-lg border border-evox-border bg-evox-surface",
      "p-3 sm:p-4",
      "flex flex-col sm:flex-row gap-2 sm:gap-3",
      className
    )}>
      <StatusDot status="online" />
      <span className="text-xs sm:text-sm text-evox-text-primary">
        Agent Name
      </span>
    </div>
  );
}
```

---

_Last updated: Feb 5, 2026 | Maintained by MAYA_
