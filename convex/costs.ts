import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// AGT-193: Cost Tracking Backend
// Track API token usage and cost per agent per task

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Log a cost entry for API usage
 */
export const logCost = mutation({
  args: {
    agentName: v.string(),
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("costLogs", {
      agentName: args.agentName,
      taskId: args.taskId,
      linearIdentifier: args.linearIdentifier,
      sessionId: args.sessionId,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      cost: args.cost,
      model: args.model,
      timestamp: Date.now(),
    });
  },
});

/**
 * Batch log multiple cost entries
 */
export const logCostBatch = mutation({
  args: {
    entries: v.array(v.object({
      agentName: v.string(),
      taskId: v.optional(v.id("tasks")),
      linearIdentifier: v.optional(v.string()),
      sessionId: v.optional(v.string()),
      inputTokens: v.number(),
      outputTokens: v.number(),
      cost: v.number(),
      model: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids: Id<"costLogs">[] = [];
    for (const entry of args.entries) {
      const id = await ctx.db.insert("costLogs", {
        ...entry,
        timestamp: now,
      });
      ids.push(id);
    }
    return { inserted: ids.length, ids };
  },
});

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get costs aggregated by agent
 */
export const getCostsByAgent = query({
  args: {
    startTs: v.optional(v.number()),
    endTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startTs = args.startTs ?? 0;
    const endTs = args.endTs ?? Date.now();

    const logs = await ctx.db
      .query("costLogs")
      .withIndex("by_timestamp")
      .collect();

    const filtered = logs.filter(l => l.timestamp >= startTs && l.timestamp <= endTs);

    // Aggregate by agent
    const byAgent: Record<string, {
      agentName: string;
      totalInputTokens: number;
      totalOutputTokens: number;
      totalCost: number;
      entries: number;
    }> = {};

    for (const log of filtered) {
      if (!byAgent[log.agentName]) {
        byAgent[log.agentName] = {
          agentName: log.agentName,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCost: 0,
          entries: 0,
        };
      }
      byAgent[log.agentName].totalInputTokens += log.inputTokens;
      byAgent[log.agentName].totalOutputTokens += log.outputTokens;
      byAgent[log.agentName].totalCost += log.cost;
      byAgent[log.agentName].entries += 1;
    }

    return {
      startTs,
      endTs,
      agents: Object.values(byAgent),
      totalCost: filtered.reduce((sum, l) => sum + l.cost, 0),
      totalTokens: filtered.reduce((sum, l) => sum + l.inputTokens + l.outputTokens, 0),
    };
  },
});

/**
 * Get costs for a specific date range with daily breakdown
 */
export const getCostsByDateRange = query({
  args: {
    startTs: v.number(),
    endTs: v.number(),
    agentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let logs;
    if (args.agentName) {
      logs = await ctx.db
        .query("costLogs")
        .withIndex("by_agent", q => q.eq("agentName", args.agentName!))
        .collect();
    } else {
      logs = await ctx.db
        .query("costLogs")
        .withIndex("by_timestamp")
        .collect();
    }

    const filtered = logs.filter(l => l.timestamp >= args.startTs && l.timestamp <= args.endTs);

    // Group by day
    const byDay: Record<string, {
      date: string;
      inputTokens: number;
      outputTokens: number;
      cost: number;
      entries: number;
    }> = {};

    for (const log of filtered) {
      const date = new Date(log.timestamp).toISOString().split("T")[0];
      if (!byDay[date]) {
        byDay[date] = {
          date,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          entries: 0,
        };
      }
      byDay[date].inputTokens += log.inputTokens;
      byDay[date].outputTokens += log.outputTokens;
      byDay[date].cost += log.cost;
      byDay[date].entries += 1;
    }

    // Sort by date
    const dailyBreakdown = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

    return {
      startTs: args.startTs,
      endTs: args.endTs,
      agentName: args.agentName,
      dailyBreakdown,
      totals: {
        inputTokens: filtered.reduce((sum, l) => sum + l.inputTokens, 0),
        outputTokens: filtered.reduce((sum, l) => sum + l.outputTokens, 0),
        cost: filtered.reduce((sum, l) => sum + l.cost, 0),
        entries: filtered.length,
      },
    };
  },
});

/**
 * Get costs for a specific task
 */
export const getCostsByTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("costLogs")
      .withIndex("by_task", q => q.eq("taskId", args.taskId))
      .collect();

    return {
      taskId: args.taskId,
      logs,
      totals: {
        inputTokens: logs.reduce((sum, l) => sum + l.inputTokens, 0),
        outputTokens: logs.reduce((sum, l) => sum + l.outputTokens, 0),
        cost: logs.reduce((sum, l) => sum + l.cost, 0),
        entries: logs.length,
      },
    };
  },
});

/**
 * Get recent cost logs
 */
export const getRecentCosts = query({
  args: {
    limit: v.optional(v.number()),
    agentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let query;
    if (args.agentName) {
      query = ctx.db
        .query("costLogs")
        .withIndex("by_agent", q => q.eq("agentName", args.agentName!))
        .order("desc");
    } else {
      query = ctx.db
        .query("costLogs")
        .withIndex("by_timestamp")
        .order("desc");
    }

    return await query.take(limit);
  },
});
