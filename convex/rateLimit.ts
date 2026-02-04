import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// AGT-211: Rate Limiting
// Enforce task and token limits per agent

/**
 * Check if agent is within rate limits
 */
export const checkRateLimit = query({
  args: {
    agentName: v.string(),
  },
  handler: async (ctx, { agentName }) => {
    // Get rate limit config for agent
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_agent", (q) => q.eq("agentName", agentName.toLowerCase()))
      .first();

    if (!rateLimit || !rateLimit.enabled) {
      return { allowed: true, reason: "no_limit_configured" };
    }

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Count tasks completed in last hour
    const recentActivity = await ctx.db
      .query("activityEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(500);

    const hourlyTasks = recentActivity.filter(
      (a) =>
        a.agentName === agentName.toLowerCase() &&
        a.timestamp > oneHourAgo &&
        (a.eventType === "completed" || a.eventType === "auto_dispatched")
    ).length;

    // Check hourly limit
    if (hourlyTasks >= rateLimit.hourlyTaskLimit) {
      return {
        allowed: false,
        reason: "hourly_limit_reached",
        current: hourlyTasks,
        limit: rateLimit.hourlyTaskLimit,
        resetIn: Math.ceil((oneHourAgo + 60 * 60 * 1000 - now) / 1000 / 60), // minutes
      };
    }

    // Check daily limit if configured
    if (rateLimit.dailyTaskLimit) {
      const dailyTasks = recentActivity.filter(
        (a) =>
          a.agentName === agentName.toLowerCase() &&
          a.timestamp > oneDayAgo &&
          (a.eventType === "completed" || a.eventType === "auto_dispatched")
      ).length;

      if (dailyTasks >= rateLimit.dailyTaskLimit) {
        return {
          allowed: false,
          reason: "daily_limit_reached",
          current: dailyTasks,
          limit: rateLimit.dailyTaskLimit,
        };
      }
    }

    // Check daily cost if configured
    if (rateLimit.maxCostPerDay) {
      const costLogs = await ctx.db
        .query("costLogs")
        .withIndex("by_agent", (q) => q.eq("agentName", agentName.toLowerCase()))
        .order("desc")
        .take(200);

      const dailyCost = costLogs
        .filter((c) => c.timestamp > oneDayAgo)
        .reduce((sum, c) => sum + c.cost, 0);

      if (dailyCost >= rateLimit.maxCostPerDay) {
        return {
          allowed: false,
          reason: "daily_cost_limit_reached",
          current: dailyCost,
          limit: rateLimit.maxCostPerDay,
        };
      }
    }

    return {
      allowed: true,
      reason: "within_limits",
      hourlyTasks,
      hourlyLimit: rateLimit.hourlyTaskLimit,
      maxTokensPerTask: rateLimit.maxTokensPerTask,
    };
  },
});

/**
 * Enforce rate limit before dispatching
 * Returns error if limit exceeded
 */
export const enforceRateLimit = mutation({
  args: {
    agentName: v.string(),
  },
  handler: async (ctx, { agentName }) => {
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_agent", (q) => q.eq("agentName", agentName.toLowerCase()))
      .first();

    if (!rateLimit || !rateLimit.enabled) {
      return { allowed: true };
    }

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Count hourly tasks
    const recentActivity = await ctx.db
      .query("activityEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(500);

    const hourlyTasks = recentActivity.filter(
      (a) =>
        a.agentName === agentName.toLowerCase() &&
        a.timestamp > oneHourAgo &&
        (a.eventType === "completed" || a.eventType === "auto_dispatched")
    ).length;

    if (hourlyTasks >= rateLimit.hourlyTaskLimit) {
      // Log rate limit hit
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", agentName.toUpperCase()))
        .first();

      if (agent) {
        await ctx.db.insert("activityEvents", {
          agentId: agent._id,
          agentName: agentName.toLowerCase(),
          category: "system",
          eventType: "rate_limited",
          title: `${agentName.toUpperCase()} rate limited (${hourlyTasks}/${rateLimit.hourlyTaskLimit} tasks/hour)`,
          metadata: {
            source: "rate_limit",
          },
          timestamp: now,
        });
      }

      return {
        allowed: false,
        reason: "hourly_limit_reached",
        current: hourlyTasks,
        limit: rateLimit.hourlyTaskLimit,
      };
    }

    // Check daily cost
    if (rateLimit.maxCostPerDay) {
      const costLogs = await ctx.db
        .query("costLogs")
        .withIndex("by_agent", (q) => q.eq("agentName", agentName.toLowerCase()))
        .order("desc")
        .take(200);

      const dailyCost = costLogs
        .filter((c) => c.timestamp > oneDayAgo)
        .reduce((sum, c) => sum + c.cost, 0);

      if (dailyCost >= rateLimit.maxCostPerDay) {
        return {
          allowed: false,
          reason: "daily_cost_limit_reached",
          current: dailyCost,
          limit: rateLimit.maxCostPerDay,
        };
      }
    }

    return { allowed: true };
  },
});

/**
 * Set rate limits for an agent
 */
export const setRateLimit = mutation({
  args: {
    agentName: v.string(),
    hourlyTaskLimit: v.number(),
    dailyTaskLimit: v.optional(v.number()),
    maxTokensPerTask: v.number(),
    maxCostPerDay: v.optional(v.number()),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_agent", (q) => q.eq("agentName", args.agentName.toLowerCase()))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        hourlyTaskLimit: args.hourlyTaskLimit,
        dailyTaskLimit: args.dailyTaskLimit,
        maxTokensPerTask: args.maxTokensPerTask,
        maxCostPerDay: args.maxCostPerDay,
        enabled: args.enabled,
        updatedAt: now,
      });
      return { success: true, id: existing._id, updated: true };
    }

    const id = await ctx.db.insert("rateLimits", {
      agentName: args.agentName.toLowerCase(),
      hourlyTaskLimit: args.hourlyTaskLimit,
      dailyTaskLimit: args.dailyTaskLimit,
      maxTokensPerTask: args.maxTokensPerTask,
      maxCostPerDay: args.maxCostPerDay,
      enabled: args.enabled,
      updatedAt: now,
    });

    return { success: true, id, created: true };
  },
});

/**
 * Get rate limits for all agents
 */
export const getAllRateLimits = query({
  handler: async (ctx) => {
    return await ctx.db.query("rateLimits").collect();
  },
});

/**
 * Get rate limit for specific agent
 */
export const getRateLimit = query({
  args: {
    agentName: v.string(),
  },
  handler: async (ctx, { agentName }) => {
    return await ctx.db
      .query("rateLimits")
      .withIndex("by_agent", (q) => q.eq("agentName", agentName.toLowerCase()))
      .first();
  },
});
