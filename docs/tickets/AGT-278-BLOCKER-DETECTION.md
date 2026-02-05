# AGT-278: Auto-Detect Blockers & Escalate

> **Priority:** High
> **Owner:** SAM
> **Status:** To Do

---

## Problem

Agents get stuck and wait silently. Human intervention required.

## Solution

### 1. Detection Rules

| Condition | Trigger |
|-----------|---------|
| Task running >30min, no commits | Stuck |
| Same error logged 3+ times | Loop |
| Agent calls `/reportBlocked` | Explicit |

### 2. Escalation Flow

```
15min stuck → Ping peer agent
30min stuck → Escalate to MAX
1hr stuck   → Alert CEO (Telegram)
```

### 3. Implementation

#### convex/monitoring.ts
```typescript
export const checkStuckAgents = internalAction({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.runQuery(internal.agents.listBusy);
    const now = Date.now();

    for (const agent of agents) {
      const dispatch = await ctx.runQuery(internal.dispatches.getRunning, {
        agentId: agent._id
      });

      if (!dispatch) continue;

      const stuckMinutes = (now - dispatch.startedAt) / 60000;

      if (stuckMinutes > 60) {
        await escalateToCEO(ctx, agent, dispatch);
      } else if (stuckMinutes > 30) {
        await escalateToMAX(ctx, agent, dispatch);
      } else if (stuckMinutes > 15) {
        await pingPeerAgent(ctx, agent, dispatch);
      }
    }
  }
});
```

#### convex/http.ts — /reportBlocked
```typescript
http.route({
  path: "/reportBlocked",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { agentName, reason, ticketId } = await request.json();

    await ctx.runMutation(api.monitoring.recordBlocker, {
      agentName,
      reason,
      ticketId,
    });

    // Immediate escalation to MAX
    await ctx.runMutation(api.messaging.sendDM, {
      from: "SYSTEM",
      to: "MAX",
      message: `${agentName} blocked: ${reason}`,
      priority: "high"
    });

    return new Response(JSON.stringify({ escalated: true }));
  })
});
```

### 4. Scheduler

Run every 5 minutes:
```typescript
// convex/crons.ts
crons.interval(
  "check-stuck-agents",
  { minutes: 5 },
  internal.monitoring.checkStuckAgents
);
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `convex/monitoring.ts` | Create |
| `convex/http.ts` | Add /reportBlocked |
| `convex/crons.ts` | Add scheduler |
| `convex/schema.ts` | Add blockers table |

## Schema Addition

```typescript
// convex/schema.ts
blockers: defineTable({
  agentName: v.string(),
  ticketId: v.optional(v.string()),
  reason: v.string(),
  escalatedTo: v.string(),
  resolvedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_agent", ["agentName", "createdAt"])
  .index("by_resolved", ["resolvedAt"]),
```

## Success Criteria

- [ ] Stuck agents detected within 5min
- [ ] Peer ping at 15min
- [ ] MAX escalation at 30min
- [ ] CEO alert at 1hr
- [ ] Blocker patterns logged

## Testing

```bash
# Simulate stuck agent
curl -X POST "$EVOX/reportBlocked" \
  -H "Content-Type: application/json" \
  -d '{"agentName": "SAM", "reason": "Cannot access Linear API", "ticketId": "AGT-123"}'

# Check escalation
curl -s "$EVOX/v2/getMessages?agent=MAX" | jq '.dms'
```
