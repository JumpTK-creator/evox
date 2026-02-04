/**
 * AGT-247: Event Bus — Real-time Agent Notifications
 *
 * Replaces 60s polling with instant push notifications.
 * Agents subscribe to events and are notified immediately when:
 * - New tasks are assigned
 * - Tasks are completed/handed off
 * - They are mentioned
 * - Approvals are needed
 *
 * Target notification latency: <3 seconds
 */
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Publish an event to an agent.
 * Internal mutation - called by other Convex functions.
 */
export const publishEvent = internalMutation({
  args: {
    type: v.union(
      v.literal("task_assigned"),
      v.literal("task_completed"),
      v.literal("handoff"),
      v.literal("mention"),
      v.literal("approval_needed"),
      v.literal("system_alert"),
      v.literal("dispatch")
    ),
    targetAgent: v.string(),
    payload: v.object({
      taskId: v.optional(v.string()),
      dispatchId: v.optional(v.string()),
      fromAgent: v.optional(v.string()),
      message: v.optional(v.string()),
      priority: v.optional(v.union(
        v.literal("low"),
        v.literal("normal"),
        v.literal("high"),
        v.literal("urgent")
      )),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes

    await ctx.db.insert("agentEvents", {
      type: args.type,
      targetAgent: args.targetAgent,
      payload: args.payload,
      status: "pending",
      createdAt: now,
      expiresAt,
    });

    return { success: true };
  },
});

/**
 * Subscribe to events for a specific agent.
 * Returns pending events that have not been delivered yet.
 *
 * This query is reactive - it will automatically update when new events arrive.
 */
export const subscribeToEvents = query({
  args: {
    agent: v.string(),
    since: v.optional(v.number()), // Only get events after this timestamp
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const since = args.since ?? 0;

    // Get pending events for this agent created after 'since' timestamp
    const events = await ctx.db
      .query("agentEvents")
      .withIndex("by_target_status", (q) =>
        q.eq("targetAgent", args.agent).eq("status", "pending")
      )
      .filter((q) => q.gt(q.field("createdAt"), since))
      .order("desc")
      .take(50); // Limit to 50 events

    return {
      events: events.map((e) => ({
        id: e._id,
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt,
      })),
      timestamp: now,
    };
  },
});

/**
 * Mark an event as delivered (acknowledged by agent).
 */
export const acknowledgeEvent = mutation({
  args: {
    eventId: v.id("agentEvents"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error(`Event not found: ${args.eventId}`);
    }

    await ctx.db.patch(args.eventId, {
      status: "delivered",
      deliveredAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Cleanup expired events (run periodically via cron).
 * Removes events older than 5 minutes that were never delivered.
 */
export const cleanupExpiredEvents = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Find expired pending events
    const expiredEvents = await ctx.db
      .query("agentEvents")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    // Mark as expired
    for (const event of expiredEvents) {
      await ctx.db.patch(event._id, {
        status: "expired",
      });
    }

    return {
      success: true,
      expiredCount: expiredEvents.length,
    };
  },
});

/**
 * Get event history for an agent (for debugging).
 */
export const getEventHistory = query({
  args: {
    agent: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const events = await ctx.db
      .query("agentEvents")
      .withIndex("by_target_created", (q) => q.eq("targetAgent", args.agent))
      .order("desc")
      .take(limit);

    return events.map((e) => ({
      id: e._id,
      type: e.type,
      payload: e.payload,
      status: e.status,
      createdAt: e.createdAt,
      deliveredAt: e.deliveredAt,
    }));
  },
});

/**
 * Public mutation to publish events from HTTP endpoints.
 */
export const publishEventFromHTTP = mutation({
  args: {
    type: v.union(
      v.literal("task_assigned"),
      v.literal("task_completed"),
      v.literal("handoff"),
      v.literal("mention"),
      v.literal("approval_needed"),
      v.literal("system_alert"),
      v.literal("dispatch")
    ),
    targetAgent: v.string(),
    payload: v.object({
      taskId: v.optional(v.string()),
      dispatchId: v.optional(v.string()),
      fromAgent: v.optional(v.string()),
      message: v.optional(v.string()),
      priority: v.optional(v.union(
        v.literal("low"),
        v.literal("normal"),
        v.literal("high"),
        v.literal("urgent")
      )),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes

    const eventId = await ctx.db.insert("agentEvents", {
      type: args.type,
      targetAgent: args.targetAgent,
      payload: args.payload,
      status: "pending",
      createdAt: now,
      expiresAt,
    });

    return { success: true, eventId };
  },
});
