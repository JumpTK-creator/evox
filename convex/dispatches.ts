import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
  },
  handler: async (ctx, { agentId, command, payload }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) throw new Error("Agent not found");

    return await ctx.db.insert("dispatches", {
      agentId,
      command,
      payload,
      status: "pending",
      createdAt: Date.now(),
    });
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

// List all pending dispatches
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("dispatches")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .collect();
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
