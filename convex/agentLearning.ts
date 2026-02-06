/**
 * Agent Learning System
 *
 * Allows agents (especially EVOX) to:
 * - Receive feedback
 * - Learn from mistakes
 * - Track skills and proficiency
 * - Improve quality over time
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================
// FEEDBACK
// ============================================================

/**
 * Give feedback to an agent
 */
export const giveFeedback = mutation({
  args: {
    targetAgent: v.string(),
    fromAgent: v.optional(v.string()),
    fromUser: v.optional(v.string()),
    taskId: v.optional(v.string()),
    rating: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5)),
    category: v.union(
      v.literal("quality"),
      v.literal("speed"),
      v.literal("communication"),
      v.literal("coordination"),
      v.literal("autonomy"),
      v.literal("accuracy")
    ),
    feedback: v.string(),
    suggestions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const feedbackId = await ctx.db.insert("agentFeedback", {
      ...args,
      createdAt: Date.now(),
    });

    return { success: true, feedbackId };
  },
});

/**
 * Get feedback for an agent
 */
export const getFeedback = query({
  args: {
    agent: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    let query = ctx.db
      .query("agentFeedback")
      .withIndex("by_target", (q) => q.eq("targetAgent", args.agent))
      .order("desc");

    if (args.category) {
      query = ctx.db
        .query("agentFeedback")
        .withIndex("by_category", (q) =>
          q.eq("targetAgent", args.agent).eq("category", args.category as any)
        )
        .order("desc");
    }

    const feedback = await query.take(limit);

    // Calculate stats
    const stats = {
      total: feedback.length,
      avgRating: feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length || 0,
      byCategory: {} as Record<string, { count: number; avgRating: number }>,
      recentTrend: [] as number[], // Last 10 ratings
    };

    // Group by category
    for (const f of feedback) {
      if (!stats.byCategory[f.category]) {
        stats.byCategory[f.category] = { count: 0, avgRating: 0 };
      }
      stats.byCategory[f.category].count++;
      stats.byCategory[f.category].avgRating =
        (stats.byCategory[f.category].avgRating * (stats.byCategory[f.category].count - 1) + f.rating) /
        stats.byCategory[f.category].count;
    }

    // Recent trend
    stats.recentTrend = feedback.slice(0, 10).map((f) => f.rating).reverse();

    return { feedback, stats };
  },
});

// ============================================================
// LEARNINGS
// ============================================================

/**
 * Record a learning/lesson
 */
export const recordLearning = mutation({
  args: {
    agent: v.string(),
    title: v.string(),
    category: v.union(
      v.literal("mistake"),
      v.literal("best-practice"),
      v.literal("quality-tip"),
      v.literal("workflow"),
      v.literal("communication"),
      v.literal("coordination")
    ),
    lesson: v.string(),
    context: v.optional(v.string()),
    relatedTask: v.optional(v.string()),
    importance: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
  },
  handler: async (ctx, args) => {
    const learningId = await ctx.db.insert("agentLearnings", {
      ...args,
      verified: false,
      createdAt: Date.now(),
      appliedCount: 0,
    });

    return { success: true, learningId };
  },
});

/**
 * Verify a learning (CEO/agent confirms it's valid)
 */
export const verifyLearning = mutation({
  args: {
    learningId: v.id("agentLearnings"),
    verifiedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.learningId, {
      verified: true,
      verifiedBy: args.verifiedBy,
    });

    return { success: true };
  },
});

/**
 * Increment applied count for a learning
 */
export const applyLearning = mutation({
  args: {
    learningId: v.id("agentLearnings"),
  },
  handler: async (ctx, args) => {
    const learning = await ctx.db.get(args.learningId);
    if (!learning) return { success: false, error: "Learning not found" };

    await ctx.db.patch(args.learningId, {
      appliedCount: (learning.appliedCount || 0) + 1,
    });

    return { success: true };
  },
});

/**
 * Get learnings for an agent
 */
export const getLearnings = query({
  args: {
    agent: v.string(),
    category: v.optional(v.string()),
    verifiedOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    let query = ctx.db
      .query("agentLearnings")
      .withIndex("by_agent", (q) => q.eq("agent", args.agent))
      .order("desc");

    if (args.category) {
      query = ctx.db
        .query("agentLearnings")
        .withIndex("by_category", (q) =>
          q.eq("agent", args.agent).eq("category", args.category as any)
        )
        .order("desc");
    }

    if (args.verifiedOnly) {
      query = ctx.db
        .query("agentLearnings")
        .withIndex("by_verified", (q) =>
          q.eq("agent", args.agent).eq("verified", true)
        )
        .order("desc");
    }

    const learnings = await query.take(limit);

    // Group by category
    const byCategory = learnings.reduce((acc, l) => {
      if (!acc[l.category]) acc[l.category] = [];
      acc[l.category].push(l);
      return acc;
    }, {} as Record<string, typeof learnings>);

    return {
      learnings,
      byCategory,
      stats: {
        total: learnings.length,
        verified: learnings.filter((l) => l.verified).length,
        totalApplied: learnings.reduce((sum, l) => sum + (l.appliedCount || 0), 0),
      },
    };
  },
});

// ============================================================
// SKILLS
// ============================================================

/**
 * Add or update a skill
 */
export const updateSkill = mutation({
  args: {
    agent: v.string(),
    skill: v.string(),
    category: v.union(
      v.literal("coordination"),
      v.literal("communication"),
      v.literal("quality-control"),
      v.literal("task-management"),
      v.literal("technical"),
      v.literal("leadership")
    ),
    proficiency: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5)),
    description: v.string(),
    learningNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if skill exists
    const existing = await ctx.db
      .query("agentSkills")
      .withIndex("by_skill", (q) => q.eq("agent", args.agent).eq("skill", args.skill))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        proficiency: args.proficiency,
        description: args.description,
        learningNotes: args.learningNotes,
        updatedAt: now,
      });
      return { success: true, skillId: existing._id, updated: true };
    } else {
      // Create new
      const skillId = await ctx.db.insert("agentSkills", {
        agent: args.agent,
        skill: args.skill,
        category: args.category,
        proficiency: args.proficiency,
        description: args.description,
        learningNotes: args.learningNotes,
        practiceCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, skillId, updated: false };
    }
  },
});

/**
 * Practice a skill (increment count, update last practiced)
 */
export const practiceSkill = mutation({
  args: {
    agent: v.string(),
    skill: v.string(),
  },
  handler: async (ctx, args) => {
    const skillRecord = await ctx.db
      .query("agentSkills")
      .withIndex("by_skill", (q) => q.eq("agent", args.agent).eq("skill", args.skill))
      .first();

    if (!skillRecord) {
      return { success: false, error: "Skill not found" };
    }

    await ctx.db.patch(skillRecord._id, {
      practiceCount: (skillRecord.practiceCount || 0) + 1,
      lastPracticed: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get skills for an agent
 */
export const getSkills = query({
  args: {
    agent: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("agentSkills")
      .withIndex("by_agent", (q) => q.eq("agent", args.agent));

    if (args.category) {
      query = ctx.db
        .query("agentSkills")
        .withIndex("by_category", (q) =>
          q.eq("agent", args.agent).eq("category", args.category as any)
        );
    }

    const skills = await query.collect();

    // Group by category
    const byCategory = skills.reduce((acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    }, {} as Record<string, typeof skills>);

    // Calculate average proficiency
    const avgProficiency =
      skills.reduce((sum, s) => sum + s.proficiency, 0) / skills.length || 0;

    return {
      skills,
      byCategory,
      stats: {
        total: skills.length,
        avgProficiency,
        totalPractice: skills.reduce((sum, s) => sum + (s.practiceCount || 0), 0),
      },
    };
  },
});

/**
 * Get agent learning profile (feedback + learnings + skills)
 */
export const getAgentProfile = query({
  args: {
    agent: v.string(),
  },
  handler: async (ctx, args) => {
    // Get recent feedback
    const feedback = await ctx.runQuery(api.agentLearning.getFeedback, {
      agent: args.agent,
      limit: 20,
    });

    // Get learnings
    const learnings = await ctx.runQuery(api.agentLearning.getLearnings, {
      agent: args.agent,
      verifiedOnly: false,
      limit: 50,
    });

    // Get skills
    const skills = await ctx.runQuery(api.agentLearning.getSkills, {
      agent: args.agent,
    });

    return {
      agent: args.agent,
      feedback: {
        recent: feedback.feedback.slice(0, 5),
        stats: feedback.stats,
      },
      learnings: {
        total: learnings.stats.total,
        verified: learnings.stats.verified,
        byCategory: learnings.byCategory,
        criticalLessons: learnings.learnings.filter((l) => l.importance === "critical"),
      },
      skills: {
        total: skills.stats.total,
        avgProficiency: skills.stats.avgProficiency,
        byCategory: skills.byCategory,
      },
      lastUpdated: Date.now(),
    };
  },
});
