# Pattern: Convex Actions vs Mutations

## Problem
Convex has two types of server functions: mutations (database only) and actions (can call external APIs).
Using the wrong one causes errors.

## Rule
- **Mutations**: Database reads/writes only. No `fetch()`, no external APIs.
- **Actions**: Can call external APIs (Linear, GitHub, etc.). Can call mutations.

## When to Use What

| Need | Use | Example |
|------|-----|---------|
| Read from database | Query | `ctx.db.query("tasks")` |
| Write to database | Mutation | `ctx.db.insert("tasks", {...})` |
| Call external API | Action | `fetch("https://api.linear.app/...")` |
| Call external API + write DB | Action + Mutation | Action calls mutation via `ctx.runMutation()` |

## Example: Webhook Handler

```typescript
// This is an ACTION because it calls Linear API
export const processGitHubPush = action({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    // Call external API (only actions can do this)
    const result = await fetch("https://api.linear.app/graphql", {...});

    // Store result in database (actions call mutations)
    await ctx.runMutation(api.webhooks.storeWebhookEvent, {
      source: "github",
      payload: JSON.stringify(args.payload),
    });
  },
});

// This is a MUTATION because it only touches the database
export const storeWebhookEvent = mutation({
  args: { source: v.string(), payload: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhookEvents", args);
  },
});
```

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Cannot use fetch in mutation" | Called external API in mutation | Convert to action |
| "Cannot call ctx.db in action" | Tried to write DB directly in action | Use `ctx.runMutation()` |

## References
- Convex docs: https://docs.convex.dev/functions/actions
