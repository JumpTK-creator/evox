import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// AGT-209: Approval Workflow
// Tasks can require human approval before completion

/**
 * Submit a task for approval
 */
export const submitForApproval = mutation({
  args: {
    taskId: v.id("tasks"),
    agentName: v.string(),
  },
  handler: async (ctx, { taskId, agentName }) => {
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    const now = Date.now();

    await ctx.db.patch(taskId, {
      requiresApproval: true,
      approvalStatus: "pending",
      status: "review",
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activityEvents", {
      agentId: task.assignee ?? task.createdBy,
      agentName: agentName.toLowerCase(),
      category: "task",
      eventType: "submitted_for_approval",
      title: `${agentName.toUpperCase()} submitted ${task.linearIdentifier ?? task.title} for approval`,
      description: task.title,
      taskId,
      linearIdentifier: task.linearIdentifier,
      projectId: task.projectId,
      metadata: {
        source: "approval_workflow",
      },
      timestamp: now,
    });

    return { success: true, taskId, status: "pending" };
  },
});

/**
 * Approve a task
 */
export const approveTask = mutation({
  args: {
    taskId: v.id("tasks"),
    reviewerName: v.string(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, { taskId, reviewerName, comment }) => {
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    if (task.approvalStatus !== "pending") {
      throw new Error(`Task is not pending approval (status: ${task.approvalStatus})`);
    }

    const now = Date.now();

    await ctx.db.patch(taskId, {
      approvalStatus: "approved",
      reviewedBy: reviewerName,
      reviewedAt: now,
      status: "done",
      completedAt: now,
      updatedAt: now,
    });

    // Find reviewer agent
    const reviewer = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", reviewerName.toUpperCase()))
      .first();

    // Log activity
    await ctx.db.insert("activityEvents", {
      agentId: reviewer?._id ?? task.createdBy,
      agentName: reviewerName.toLowerCase(),
      category: "task",
      eventType: "approved",
      title: `${reviewerName.toUpperCase()} approved ${task.linearIdentifier ?? task.title}`,
      description: comment ?? task.title,
      taskId,
      linearIdentifier: task.linearIdentifier,
      projectId: task.projectId,
      metadata: {
        source: "approval_workflow",
        comment,
      },
      timestamp: now,
    });

    return { success: true, taskId, status: "approved" };
  },
});

/**
 * Reject a task
 */
export const rejectTask = mutation({
  args: {
    taskId: v.id("tasks"),
    reviewerName: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, { taskId, reviewerName, reason }) => {
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    if (task.approvalStatus !== "pending") {
      throw new Error(`Task is not pending approval (status: ${task.approvalStatus})`);
    }

    const now = Date.now();

    await ctx.db.patch(taskId, {
      approvalStatus: "rejected",
      reviewedBy: reviewerName,
      reviewedAt: now,
      status: "in_progress", // Send back to in_progress for rework
      updatedAt: now,
    });

    // Find reviewer agent
    const reviewer = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", reviewerName.toUpperCase()))
      .first();

    // Log activity
    await ctx.db.insert("activityEvents", {
      agentId: reviewer?._id ?? task.createdBy,
      agentName: reviewerName.toLowerCase(),
      category: "task",
      eventType: "rejected",
      title: `${reviewerName.toUpperCase()} rejected ${task.linearIdentifier ?? task.title}`,
      description: reason,
      taskId,
      linearIdentifier: task.linearIdentifier,
      projectId: task.projectId,
      metadata: {
        source: "approval_workflow",
        reason,
      },
      timestamp: now,
    });

    // Notify assignee
    if (task.assignee) {
      await ctx.db.insert("notifications", {
        to: task.assignee,
        from: reviewer?._id,
        type: "review_request",
        title: "Task Rejected",
        message: `${task.linearIdentifier ?? task.title} was rejected: ${reason}`,
        read: false,
        relatedTask: taskId,
        createdAt: now,
      });
    }

    return { success: true, taskId, status: "rejected", reason };
  },
});

/**
 * Get all tasks pending approval
 */
export const getPendingApprovals = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "review"))
      .order("desc")
      .take(limit ?? 50);

    // Filter to only those with pending approval
    const pendingApprovals = tasks.filter(
      (t) => t.requiresApproval && t.approvalStatus === "pending"
    );

    return pendingApprovals;
  },
});

/**
 * Mark a task as requiring approval (without submitting yet)
 */
export const setRequiresApproval = mutation({
  args: {
    taskId: v.id("tasks"),
    requiresApproval: v.boolean(),
  },
  handler: async (ctx, { taskId, requiresApproval }) => {
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(taskId, {
      requiresApproval,
      updatedAt: Date.now(),
    });

    return { success: true, taskId, requiresApproval };
  },
});
