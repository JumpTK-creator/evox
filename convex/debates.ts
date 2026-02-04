import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// AGT-253: Debate Culture System
// Agents can debate, vote, and reach consensus

/**
 * Start a new debate
 */
export const startDebate = mutation({
  args: {
    topic: v.string(),
    context: v.optional(v.string()),
    initiatedBy: v.string(),
    initialPosition: v.object({
      stance: v.string(),
      arguments: v.array(v.string()),
      evidence: v.optional(v.array(v.string())),
    }),
    taskRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const id = await ctx.db.insert("debates", {
      topic: args.topic,
      context: args.context,
      initiatedBy: args.initiatedBy.toLowerCase(),
      positions: [
        {
          agent: args.initiatedBy.toLowerCase(),
          stance: args.initialPosition.stance,
          arguments: args.initialPosition.arguments,
          evidence: args.initialPosition.evidence,
          submittedAt: now,
        },
      ],
      status: "open",
      taskRef: args.taskRef,
      outcomeApplied: false,
      votes: [],
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, debateId: id };
  },
});

/**
 * Add a position to a debate
 */
export const addPosition = mutation({
  args: {
    debateId: v.id("debates"),
    agent: v.string(),
    stance: v.string(),
    arguments: v.array(v.string()),
    evidence: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const debate = await ctx.db.get(args.debateId);
    if (!debate) throw new Error("Debate not found");
    if (debate.status !== "open") throw new Error("Debate is not open");

    const now = Date.now();
    const agentLower = args.agent.toLowerCase();

    // Check if agent already has a position
    const existingIndex = debate.positions.findIndex(
      (p) => p.agent === agentLower
    );

    const newPosition = {
      agent: agentLower,
      stance: args.stance,
      arguments: args.arguments,
      evidence: args.evidence,
      submittedAt: now,
    };

    const positions =
      existingIndex >= 0
        ? debate.positions.map((p, i) => (i === existingIndex ? newPosition : p))
        : [...debate.positions, newPosition];

    await ctx.db.patch(args.debateId, {
      positions,
      updatedAt: now,
    });

    return { success: true, positionCount: positions.length };
  },
});

/**
 * Vote for a position
 */
export const vote = mutation({
  args: {
    debateId: v.id("debates"),
    agent: v.string(),
    positionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const debate = await ctx.db.get(args.debateId);
    if (!debate) throw new Error("Debate not found");
    if (debate.status !== "open") throw new Error("Debate is not open");

    const now = Date.now();
    const agentLower = args.agent.toLowerCase();
    const votes = debate.votes || [];

    // Remove existing vote from this agent
    const filteredVotes = votes.filter((v) => v.agent !== agentLower);

    await ctx.db.patch(args.debateId, {
      votes: [
        ...filteredVotes,
        { agent: agentLower, position: args.positionIndex, votedAt: now },
      ],
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Resolve a debate
 */
export const resolve = mutation({
  args: {
    debateId: v.id("debates"),
    resolution: v.string(),
    resolvedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.debateId, {
      status: "resolved",
      resolution: args.resolution,
      resolvedBy: args.resolvedBy.toLowerCase(),
      resolvedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Escalate a debate to human
 */
export const escalate = mutation({
  args: {
    debateId: v.id("debates"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.debateId, {
      status: "escalated",
      resolution: args.reason || "Escalated to human decision",
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Mark outcome as applied
 */
export const markApplied = mutation({
  args: {
    debateId: v.id("debates"),
    impactMeasured: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.debateId, {
      outcomeApplied: true,
      impactMeasured: args.impactMeasured,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * List open debates
 */
export const listOpen = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("debates")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(50);
  },
});

/**
 * Get debate by ID
 */
export const get = query({
  args: { id: v.id("debates") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * List debates by agent
 */
export const listByAgent = query({
  args: { agent: v.string() },
  handler: async (ctx, { agent }) => {
    return await ctx.db
      .query("debates")
      .withIndex("by_initiator", (q) => q.eq("initiatedBy", agent.toLowerCase()))
      .order("desc")
      .take(50);
  },
});

/**
 * Get debates needing resolution (open > 24 hours)
 */
export const listStale = query({
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const openDebates = await ctx.db
      .query("debates")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    return openDebates.filter((d) => d.createdAt < oneDayAgo);
  },
});
