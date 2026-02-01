import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const log = mutation({
  args: {
    agent: v.id("agents"),
    action: v.string(),
    target: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const activityId = await ctx.db.insert("activities", {
      agent: args.agent,
      action: args.action,
      target: args.target,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
    return activityId;
  },
});

// READ - Get all activities
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
    return args.limit ? activities.slice(0, args.limit) : activities;
  },
});

// READ - Get activity by ID
export const get = query({
  args: { id: v.id("activities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// READ - Get activities by agent
export const getByAgent = query({
  args: {
    agent: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_agent", (q) => q.eq("agent", args.agent))
      .order("desc")
      .collect();
    return args.limit ? activities.slice(0, args.limit) : activities;
  },
});

// READ - Get recent activities with agent details
export const listWithAgents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    const limitedActivities = args.limit
      ? activities.slice(0, args.limit)
      : activities;

    // Populate agent details
    const activitiesWithAgents = await Promise.all(
      limitedActivities.map(async (activity) => {
        const agent = await ctx.db.get(activity.agent);
        return {
          ...activity,
          agent,
        };
      })
    );

    return activitiesWithAgents;
  },
});

// READ - Get activities by time range
export const getByTimeRange = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const allActivities = await ctx.db
      .query("activities")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    return allActivities.filter(
      (activity) =>
        activity.createdAt >= args.startTime &&
        activity.createdAt <= args.endTime
    );
  },
});

// READ - Get activities by action type
export const getByAction = query({
  args: {
    action: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allActivities = await ctx.db
      .query("activities")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    const filtered = allActivities.filter(
      (activity) => activity.action === args.action
    );

    return args.limit ? filtered.slice(0, args.limit) : filtered;
  },
});

// DELETE - Remove old activities (cleanup)
export const cleanup = mutation({
  args: {
    olderThan: v.number(), // timestamp
  },
  handler: async (ctx, args) => {
    const oldActivities = await ctx.db
      .query("activities")
      .withIndex("by_created_at")
      .collect();

    const toDelete = oldActivities.filter(
      (activity) => activity.createdAt < args.olderThan
    );

    for (const activity of toDelete) {
      await ctx.db.delete(activity._id);
    }

    return toDelete.length;
  },
});

// DELETE - Remove activity by ID
export const remove = mutation({
  args: { id: v.id("activities") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// MIGRATION - Backfill activities for existing tasks (one-time)
// Creates "updated_task_status" activities for all tasks that don't have one
export const backfillFromTasks = mutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get all tasks
    const tasks = await ctx.db.query("tasks").collect();

    // Get existing activities to avoid duplicates
    const existingActivities = await ctx.db.query("activities").collect();
    const tasksWithActivity = new Set(
      existingActivities
        .filter((a) => a.action === "updated_task_status")
        .map((a) => a.target)
    );

    // Get system agent (PM) as fallback
    const agents = await ctx.db.query("agents").collect();
    const systemAgent = agents.find((a) => a.role === "pm");

    if (!systemAgent) {
      throw new Error("No PM agent found for backfill");
    }

    let created = 0;

    for (const task of tasks) {
      // Skip if already has activity
      if (tasksWithActivity.has(task._id)) {
        continue;
      }

      // Use task assignee or createdBy or system agent
      const activityAgent = task.assignee || task.createdBy || systemAgent._id;

      await ctx.db.insert("activities", {
        agent: activityAgent,
        action: "updated_task_status",
        target: task._id,
        metadata: {
          from: null,
          to: task.status,
          source: "backfill",
          linearIdentifier: task.linearIdentifier || null,
        },
        createdAt: task.updatedAt || task.createdAt || now,
      });

      created++;
    }

    return {
      message: `Backfilled ${created} activities for ${tasks.length} tasks`,
      created,
      total: tasks.length,
    };
  },
});
