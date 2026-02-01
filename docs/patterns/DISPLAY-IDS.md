# Pattern: Display IDs

## Problem
Raw Convex IDs look like `jx75d6f7qsprkftb6wxpsf8qsh80ak3p` — meaningless to users.
Human-readable IDs like `AGT-128` are stored in `linearIdentifier`.

## Rule
**NEVER display raw Convex `_id` to users. Always use `linearIdentifier ?? "—"`.**

## Examples

```typescript
// BAD — raw ID in UI
<span>{task._id}</span>
<span>{task.id}</span>

// GOOD — human-readable
<span>{task.linearIdentifier ?? "—"}</span>
<span>{task.linearIdentifier ?? task.title}</span>
```

## Verification

Run before every commit:
```bash
grep -rn "\._id" app/ components/ --include="*.tsx" | grep -v "key=" | grep -v "// internal" | grep -v ".filter" | grep -v ".find" | grep -v ".map"
```

Any output = potential bug. Check if it's rendered in UI.

## Exceptions
- Using `_id` as React `key` prop is fine: `key={task._id}`
- Using `_id` for internal lookups is fine: `.find(t => t._id === id)`
- Using `_id` in Convex queries is fine

## Affected Components
- Activity feed
- Standup page
- Task cards
- Agent cards
- Any component showing task references
