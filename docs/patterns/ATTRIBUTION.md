# Pattern: Agent Attribution

## Problem
All Linear API calls use Son's API key, so all activity appears as "Son" in Linear.
We need agent attribution in Convex to be accurate.

## Rule
**Attribution comes from the caller (agent name), not the API key.**

## How It Works

1. Agent calls `completeTask` with their name:
```bash
npx convex run agentActions:completeTask \
  '{"agent":"sam","ticket":"AGT-128","action":"completed","summary":"..."}'
```

2. Convex resolves agent name → Convex agent ID via `agentMappings` table

3. Activity is logged with correct agent attribution

4. Linear comment is posted (appears as Son, but Convex knows it was Sam)

## The API

```typescript
// convex/agentActions.ts
export const completeTask = mutation({
  args: {
    agent: v.union(v.literal("leo"), v.literal("sam"), v.literal("max"), v.literal("ella")),
    ticket: v.string(),      // "AGT-128"
    action: v.union(v.literal("in_progress"), v.literal("completed"), v.literal("blocked")),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    // Resolves agent name → Convex ID
    const agentId = await resolveAgentIdByName(ctx.db, args.agent);
    // ... updates task, logs activity with correct attribution
  },
});
```

## References
- ADR-001: External Persistent State for Agent Memory
- `convex/agentMappings.ts`: Name → ID resolution
- `convex/agentActions.ts`: The completeTask mutation
