# Pattern: Status Colors

## Problem
Status strings can be inconsistent case (`"Online"` vs `"online"` vs `"ONLINE"`).
Ternary operators miss edge cases.

## Rule
**Always use `.toLowerCase()` and exhaustive object maps.**

## Examples

```typescript
// BAD — misses edge cases, case-sensitive
status === "online" ? "green" : "red"

// BAD — inconsistent casing
status === "Online" ? "green" : "gray"

// GOOD — exhaustive, case-insensitive
const statusColors: Record<string, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-gray-400",
  offline: "bg-red-500",
};
const color = statusColors[status.toLowerCase()] ?? "bg-gray-400";
```

## Standard Color Map

| Status | Color | Tailwind Class |
|--------|-------|----------------|
| online | Green | `bg-green-500` |
| busy | Yellow | `bg-yellow-500` |
| idle | Gray | `bg-gray-400` |
| offline | Red | `bg-red-500` |

## Task Status Colors

| Status | Color | Tailwind Class |
|--------|-------|----------------|
| backlog | Gray | `bg-gray-100` |
| todo | Blue | `bg-blue-100` |
| in_progress | Yellow | `bg-yellow-100` |
| review | Purple | `bg-purple-100` |
| done | Green | `bg-green-100` |

## Verification
Check for ternary status checks:
```bash
grep -rn "=== \"online\"" app/ components/ --include="*.tsx"
grep -rn "=== \"busy\"" app/ components/ --include="*.tsx"
```
