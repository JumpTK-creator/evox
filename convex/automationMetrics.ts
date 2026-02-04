import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// AGT-257: Automation Metrics Tracker — Real-time % progress

const MILESTONES = [
  { percent: 10, label: "Baseline - agents exist" },
  { percent: 20, label: "Agents can be started via script" },
  { percent: 30, label: "Dispatch queue works" },
  { percent: 40, label: "Agents claim dispatches" },
  { percent: 50, label: "Agents complete tasks" },
  { percent: 60, label: "Agents request more work" },
  { percent: 70, label: "Agents self-assign from backlog" },
  { percent: 80, label: "Webhook triggers agent start" },
  { percent: 90, label: "24hr autonomous operation" },
  { percent: 100, label: "Full automation - no human needed" },
];

/**
 * Initialize automation metrics with default milestones
 * Call this once at setup
 */
export const initialize = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("automationMetrics")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (existing) {
      return { success: false, message: "Already initialized" };
    }

    const now = Date.now();
    await ctx.db.insert("automationMetrics", {
      key: "global",
      progressPercent: 0,
      milestones: MILESTONES.map((m) => ({
        percent: m.percent,
        label: m.label,
        achieved: false,
      })),
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, message: "Automation metrics initialized" };
  },
});

/**
 * Update automation progress
 * Mark a milestone as achieved
 */
export const updateProgress = mutation({
  args: {
    percent: v.number(), // Milestone to mark as achieved (10, 20, ..., 100)
    achievedBy: v.string(), // Agent name
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { percent, achievedBy, notes }) => {
    const record = await ctx.db
      .query("automationMetrics")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (!record) {
      throw new Error("Automation metrics not initialized. Call initialize() first.");
    }

    const now = Date.now();
    const updatedMilestones = record.milestones.map((m) => {
      if (m.percent === percent && !m.achieved) {
        return {
          ...m,
          achieved: true,
          achievedAt: now,
          achievedBy,
          notes,
        };
      }
      return m;
    });

    // Calculate new progress percent (highest achieved milestone)
    const achievedMilestones = updatedMilestones.filter((m) => m.achieved);
    const newProgress = achievedMilestones.length > 0
      ? Math.max(...achievedMilestones.map((m) => m.percent))
      : 0;

    await ctx.db.patch(record._id, {
      progressPercent: newProgress,
      milestones: updatedMilestones,
      updatedAt: now,
    });

    return {
      success: true,
      progressPercent: newProgress,
      milestone: updatedMilestones.find((m) => m.percent === percent),
    };
  },
});

/**
 * Get current automation progress
 */
export const getProgress = query({
  args: {},
  handler: async (ctx) => {
    const record = await ctx.db
      .query("automationMetrics")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (!record) {
      return {
        progressPercent: 0,
        milestones: MILESTONES.map((m) => ({ ...m, achieved: false })),
      };
    }

    return {
      progressPercent: record.progressPercent,
      milestones: record.milestones,
      updatedAt: record.updatedAt,
    };
  },
});

/**
 * Reset all progress (for testing)
 */
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const record = await ctx.db
      .query("automationMetrics")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (!record) {
      return { success: false, message: "No record to reset" };
    }

    const now = Date.now();
    await ctx.db.patch(record._id, {
      progressPercent: 0,
      milestones: MILESTONES.map((m) => ({
        percent: m.percent,
        label: m.label,
        achieved: false,
      })),
      updatedAt: now,
    });

    return { success: true, message: "Automation metrics reset" };
  },
});
