# AGT-280: Self-Improvement Loop

> **Priority:** Medium
> **Owner:** MAX
> **Status:** To Do

---

## Problem

Agents repeat mistakes. No learning mechanism. Knowledge siloed.

## Solution

### 1. Log Every Failure

```typescript
interface FailureLog {
  id: string;
  agentName: string;
  errorType: "build" | "test" | "api" | "timeout" | "other";
  errorMessage: string;
  context: {
    ticketId?: string;
    files?: string[];
    command?: string;
  };
  resolution?: string;
  timestamp: number;
}
```

### 2. Weekly Pattern Analysis

Scheduled job:
1. Query last 7 days of failures
2. Group by error type
3. Find repeating patterns (>2 occurrences)
4. Generate learnings

### 3. Auto-Update Patterns

When pattern found:
1. Create doc in `docs/patterns/`
2. Post to #dev channel
3. Add to agent context

## Implementation

### convex/failures.ts
```typescript
export const logFailure = mutation({
  args: {
    agentName: v.string(),
    errorType: v.string(),
    errorMessage: v.string(),
    context: v.optional(v.object({
      ticketId: v.optional(v.string()),
      files: v.optional(v.array(v.string())),
      command: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("failures", {
      ...args,
      timestamp: Date.now(),
    });
  }
});

export const analyzePatterns = internalAction({
  handler: async (ctx) => {
    const failures = await ctx.runQuery(internal.failures.getLast7Days);

    // Group by error type + message
    const groups = new Map<string, typeof failures>();
    for (const f of failures) {
      const key = `${f.errorType}:${f.errorMessage.slice(0, 50)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    }

    // Find patterns (>2 occurrences)
    const patterns = [];
    for (const [key, group] of groups) {
      if (group.length > 2) {
        patterns.push({
          errorType: group[0].errorType,
          message: group[0].errorMessage,
          count: group.length,
          agents: [...new Set(group.map(f => f.agentName))],
        });
      }
    }

    // Create learnings
    for (const pattern of patterns) {
      await ctx.runMutation(internal.learnings.createFromPattern, {
        pattern,
      });
    }

    return { patternsFound: patterns.length };
  }
});
```

### docs/patterns/ Auto-Generation

```typescript
export const createPatternDoc = internalAction({
  args: {
    category: v.string(),
    title: v.string(),
    problem: v.string(),
    solution: v.string(),
  },
  handler: async (ctx, args) => {
    // Post to channel
    await ctx.runMutation(api.messaging.postToChannel, {
      channel: "dev",
      from: "SYSTEM",
      message: `New pattern discovered: ${args.title}\n\nProblem: ${args.problem}\n\nSolution: ${args.solution}`,
    });

    // Log to learnings table
    await ctx.runMutation(api.learnings.submitLearning, {
      agent: "SYSTEM",
      category: args.category,
      content: `${args.title}\n\n${args.problem}\n\n${args.solution}`,
    });
  }
});
```

## Schema Addition

```typescript
// convex/schema.ts
failures: defineTable({
  agentName: v.string(),
  errorType: v.string(),
  errorMessage: v.string(),
  context: v.optional(v.object({
    ticketId: v.optional(v.string()),
    files: v.optional(v.array(v.string())),
    command: v.optional(v.string()),
  })),
  resolution: v.optional(v.string()),
  timestamp: v.number(),
})
  .index("by_agent", ["agentName", "timestamp"])
  .index("by_type", ["errorType", "timestamp"])
  .index("by_timestamp", ["timestamp"]),
```

## Agent Integration

Agents should call `/logFailure` when encountering errors:

```bash
curl -X POST "$EVOX/logFailure" \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "SAM",
    "errorType": "build",
    "errorMessage": "Type error in schema.ts",
    "context": {
      "ticketId": "AGT-123",
      "files": ["convex/schema.ts"]
    }
  }'
```

## Success Criteria

- [ ] All agent failures logged
- [ ] Weekly pattern analysis runs
- [ ] Learnings posted to #dev
- [ ] Same mistake not repeated >2x
- [ ] Learnings queryable by agents

## Testing

```bash
# Log some test failures
for i in 1 2 3; do
  curl -X POST "$EVOX/logFailure" \
    -H "Content-Type: application/json" \
    -d '{"agentName": "SAM", "errorType": "build", "errorMessage": "Missing import"}'
done

# Trigger analysis
npx convex run failures:analyzePatterns

# Check learnings
curl -s "$EVOX/learnings?limit=5" | jq
```
