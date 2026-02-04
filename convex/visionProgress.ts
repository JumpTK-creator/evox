import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// AGT-253: Vision Progress Tracking
// Track North Star metrics toward organizational goals

/**
 * Initialize a vision metric
 */
export const initMetric = mutation({
  args: {
    metric: v.string(),
    description: v.string(),
    unit: v.string(),
    target: v.number(),
    current: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const progressPercent = (args.current / args.target) * 100;

    const id = await ctx.db.insert("visionProgress", {
      metric: args.metric,
      description: args.description,
      unit: args.unit,
      target: args.target,
      current: args.current,
      trend: "stable",
      progressPercent,
      history: [{ value: args.current, timestamp: now }],
      contributions: [],
      onTrack: progressPercent >= 80,
      createdAt: now,
      lastUpdated: now,
    });

    return { success: true, id };
  },
});

/**
 * Update a metric value
 */
export const updateMetric = mutation({
  args: {
    metric: v.string(),
    value: v.number(),
    contribution: v.optional(
      v.object({
        agent: v.string(),
        task: v.string(),
        impact: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("visionProgress")
      .withIndex("by_metric", (q) => q.eq("metric", args.metric))
      .first();

    if (!existing) throw new Error(`Metric ${args.metric} not found`);

    // Calculate trend
    const previousValue = existing.current;
    const trend =
      args.value > previousValue
        ? "up"
        : args.value < previousValue
          ? "down"
          : "stable";

    // Update history (keep last 7)
    const history = [
      ...existing.history.slice(-6),
      { value: args.value, timestamp: now },
    ];

    // Add contribution if provided
    const contributions = args.contribution
      ? [
          ...(existing.contributions || []).slice(-19),
          { ...args.contribution, timestamp: now },
        ]
      : existing.contributions;

    const progressPercent = (args.value / existing.target) * 100;

    await ctx.db.patch(existing._id, {
      current: args.value,
      trend,
      progressPercent,
      history,
      contributions,
      onTrack: progressPercent >= 80,
      lastUpdated: now,
    });

    return { success: true, trend, progressPercent };
  },
});

/**
 * Get all metrics
 */
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("visionProgress").collect();
  },
});

/**
 * Get a specific metric
 */
export const get = query({
  args: { metric: v.string() },
  handler: async (ctx, { metric }) => {
    return await ctx.db
      .query("visionProgress")
      .withIndex("by_metric", (q) => q.eq("metric", metric))
      .first();
  },
});

/**
 * Get metrics that are off track
 */
export const listOffTrack = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("visionProgress")
      .withIndex("by_onTrack", (q) => q.eq("onTrack", false))
      .collect();
  },
});

/**
 * Set risk for a metric
 */
export const setRisk = mutation({
  args: {
    metric: v.string(),
    risk: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("visionProgress")
      .withIndex("by_metric", (q) => q.eq("metric", args.metric))
      .first();

    if (!existing) throw new Error(`Metric ${args.metric} not found`);

    await ctx.db.patch(existing._id, {
      risk: args.risk,
      lastUpdated: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Initialize default North Star metrics
 */
export const initDefaults = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const defaults = [
      {
        metric: "tasks_per_hour",
        description: "Team velocity in tasks completed per hour",
        unit: "tasks/hr",
        target: 10,
        current: 5.7,
      },
      {
        metric: "cost_per_task",
        description: "Average API cost per completed task",
        unit: "USD",
        target: 2,
        current: 0,
      },
      {
        metric: "autonomy_hours",
        description: "Hours agents can work without human intervention",
        unit: "hours",
        target: 24,
        current: 1,
      },
      {
        metric: "agent_count",
        description: "Number of active agents on the team",
        unit: "agents",
        target: 10,
        current: 4,
      },
    ];

    const created = [];

    for (const d of defaults) {
      const existing = await ctx.db
        .query("visionProgress")
        .withIndex("by_metric", (q) => q.eq("metric", d.metric))
        .first();

      if (!existing) {
        const progressPercent = (d.current / d.target) * 100;
        const id = await ctx.db.insert("visionProgress", {
          ...d,
          trend: "stable",
          progressPercent,
          history: [{ value: d.current, timestamp: now }],
          contributions: [],
          onTrack: progressPercent >= 80,
          createdAt: now,
          lastUpdated: now,
        });
        created.push({ metric: d.metric, id });
      }
    }

    return { success: true, created };
  },
});
