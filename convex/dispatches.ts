import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Phase 5: Execution Engine - Dispatch Management
 * Handles command dispatching to agents (OpenClaw integration ready)
 */

// Create a new dispatch for an agent
export const create = mutation({
  args: {
    agentId: v.id("agents"),
    command: v.string(),
    payload: v.optional(v.string()),
    priority: v.optional(v.number()), // 0=URGENT, 1=HIGH, 2=NORMAL (default), 3=LOW
    isUrgent: v.optional(v.boolean()),
  },
  handler: async (ctx, { agentId, command, payload, priority, isUrgent }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) throw new Error("Agent not found");

    const dispatchId = await ctx.db.insert("dispatches", {
      agentId,
      command,
      payload,
      priority: priority ?? 2, // Default to NORMAL
      isUrgent: isUrgent ?? priority === 0,
      status: "pending",
      createdAt: Date.now(),
    });

    // AGT-247: Fire event bus notification for new dispatch
    const priorityMap = { 0: "urgent", 1: "high", 2: "normal", 3: "low" };
    await ctx.scheduler.runAfter(0, internal.agentEvents.publishEvent, {
      type: "dispatch",
      targetAgent: agent.name.toLowerCase(),
      payload: {
        dispatchId: dispatchId,
        message: `New dispatch: ${command}`,
        priority: (priorityMap as Record<number, "urgent" | "high" | "normal" | "low">)[priority ?? 2],
      },
    });

    return dispatchId;
  },
});

// Agent claims a pending dispatch (marks as running)
export const claim = mutation({
  args: {
    dispatchId: v.id("dispatches"),
  },
  handler: async (ctx, { dispatchId }) => {
    const dispatch = await ctx.db.get(dispatchId);
    if (!dispatch) throw new Error("Dispatch not found");
    if (dispatch.status !== "pending") {
      throw new Error(`Cannot claim dispatch with status: ${dispatch.status}`);
    }

    await ctx.db.patch(dispatchId, {
      status: "running",
      startedAt: Date.now(),
    });

    return dispatchId;
  },
});

// Mark dispatch as completed with result
export const complete = mutation({
  args: {
    dispatchId: v.id("dispatches"),
    result: v.optional(v.string()),
  },
  handler: async (ctx, { dispatchId, result }) => {
    const dispatch = await ctx.db.get(dispatchId);
    if (!dispatch) throw new Error("Dispatch not found");
    if (dispatch.status !== "running") {
      throw new Error(`Cannot complete dispatch with status: ${dispatch.status}`);
    }

    await ctx.db.patch(dispatchId, {
      status: "completed",
      completedAt: Date.now(),
      result,
    });

    return dispatchId;
  },
});

// Mark dispatch as failed with error
export const fail = mutation({
  args: {
    dispatchId: v.id("dispatches"),
    error: v.string(),
  },
  handler: async (ctx, { dispatchId, error }) => {
    const dispatch = await ctx.db.get(dispatchId);
    if (!dispatch) throw new Error("Dispatch not found");
    if (dispatch.status !== "running") {
      throw new Error(`Cannot fail dispatch with status: ${dispatch.status}`);
    }

    await ctx.db.patch(dispatchId, {
      status: "failed",
      completedAt: Date.now(),
      error,
    });

    return dispatchId;
  },
});

// List all pending dispatches (with agent names), sorted by priority
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const dispatches = await ctx.db
      .query("dispatches")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(50);

    // Sort by priority (0=URGENT first), then by createdAt
    const sorted = dispatches.sort((a, b) => {
      const priorityA = a.priority ?? 2;
      const priorityB = b.priority ?? 2;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });

    // Enrich with agent names
    return Promise.all(
      sorted.map(async (d) => {
        const agent = await ctx.db.get(d.agentId);
        return {
          ...d,
          agentName: agent?.name ?? "unknown",
        };
      })
    );
  },
});

// List active dispatches (pending + running) for UI display
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    // Get pending dispatches
    const pending = await ctx.db
      .query("dispatches")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(20);

    // Get running dispatches
    const running = await ctx.db
      .query("dispatches")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .order("asc")
      .take(10);

    // Combine and sort by createdAt
    const all = [...running, ...pending].sort((a, b) =>
      (a.createdAt ?? 0) - (b.createdAt ?? 0)
    );

    // Enrich with agent names
    return Promise.all(
      all.map(async (d) => {
        const agent = await ctx.db.get(d.agentId);
        return {
          ...d,
          agentName: agent?.name ?? "unknown",
        };
      })
    );
  },
});

// List dispatches for a specific agent
export const listByAgent = query({
  args: {
    agentId: v.id("agents"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    )),
  },
  handler: async (ctx, { agentId, status }) => {
    if (status) {
      return await ctx.db
        .query("dispatches")
        .withIndex("by_agent", (q) => q.eq("agentId", agentId).eq("status", status))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("dispatches")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc")
      .collect();
  },
});

// Get a single dispatch by ID
export const get = query({
  args: { id: v.id("dispatches") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Create dispatch from Linear webhook (auto-assign to agent by name)
export const createFromLinear = mutation({
  args: {
    agentName: v.string(),
    linearIdentifier: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { agentName, linearIdentifier, title, description }) => {
    // Find agent by name (case-insensitive)
    const agents = await ctx.db.query("agents").collect();
    const agent = agents.find(
      (a) => a.name.toUpperCase() === agentName.toUpperCase()
    );

    if (!agent) {
      console.log(`Agent not found: ${agentName}`);
      return null;
    }

    const dispatchId = await ctx.db.insert("dispatches", {
      agentId: agent._id,
      command: "execute_ticket",
      payload: JSON.stringify({
        identifier: linearIdentifier,
        title,
        description: description || "",
      }),
      status: "pending",
      createdAt: Date.now(),
    });

    // AGT-247: Fire event bus notification for new dispatch
    await ctx.scheduler.runAfter(0, internal.agentEvents.publishEvent, {
      type: "dispatch",
      targetAgent: agentName.toLowerCase(),
      payload: {
        taskId: linearIdentifier,
        dispatchId: dispatchId,
        message: `New task assigned: ${title}`,
        priority: "normal",
      },
    });

    return dispatchId;
  },
});
