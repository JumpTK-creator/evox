/**
 * AGT-317: Blocker Detection Engine
 *
 * Automatically detects blocked tasks by scanning the blockedBy field.
 * Runs on a 5-min cron. Fires alerts.triggerTaskBlocked() on detection.
 *
 * blockedBy stores task identifiers (Linear identifiers like "AGT-72"
 * or Convex task IDs). A task is "blocked" if ANY blocker is incomplete.
 * A blocker is "unresolvable" if it's in a terminal failure state.
 */
import { v } from "convex/values";
import { query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// AGT-318: Escalation tier thresholds (in milliseconds)
const ESCALATION_THRESHOLDS = {
  T1: 0,                    // Immediate on detection
  T2: 30 * 60 * 1000,       // 30 minutes
  T3: 60 * 60 * 1000,       // 60 minutes
  T4: 4 * 60 * 60 * 1000,   // 4 hours
} as const;

/**
 * Resolve a single blocker string to its task and status.
 * Supports both Linear identifiers ("AGT-72") and Convex task IDs.
 */
async function resolveBlocker(
  ctx: { db: { get: (id: Id<"tasks">) => Promise<any>; query: (table: string) => any } },
  blocker: string
) {
  // Try as Linear identifier first (e.g. "AGT-72")
  if (blocker.includes("-") && !blocker.includes("|")) {
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_linearIdentifier", (q: any) => q.eq("linearIdentifier", blocker))
      .first();
    if (task) {
      return {
        id: task._id,
        identifier: blocker,
        title: task.title,
        status: task.status,
        resolved: task.status === "done",
        unresolvable: false, // Will be set below
      };
    }
  }

  // Try as Convex task ID
  try {
    const task = await ctx.db.get(blocker as Id<"tasks">);
    if (task) {
      return {
        id: task._id,
        identifier: task.linearIdentifier ?? task._id,
        title: task.title,
        status: task.status,
        resolved: task.status === "done",
        unresolvable: false,
      };
    }
  } catch {
    // Not a valid Convex ID, ignore
  }

  // Blocker not found — treat as unresolvable
  return {
    id: null,
    identifier: blocker,
    title: "Unknown task",
    status: "not_found",
    resolved: false,
    unresolvable: true,
  };
}

/**
 * Get all blockers for a task with their resolution status.
 */
export const getTaskBlockers = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task || !task.blockedBy || task.blockedBy.length === 0) {
      return [];
    }

    const blockers = [];
    for (const blockerRef of task.blockedBy) {
      const resolved = await resolveBlocker(ctx, blockerRef);
      blockers.push(resolved);
    }
    return blockers;
  },
});

/**
 * Check if a task is currently blocked (any blocker incomplete).
 */
export const isTaskBlocked = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task || !task.blockedBy || task.blockedBy.length === 0) {
      return false;
    }

    for (const blockerRef of task.blockedBy) {
      const blocker = await resolveBlocker(ctx, blockerRef);
      if (!blocker.resolved) return true;
    }
    return false;
  },
});

/**
 * Internal query: find all in_progress tasks that have blockedBy set.
 */
export const getTasksWithBlockers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const inProgressTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q: any) => q.eq("status", "in_progress"))
      .collect();

    return inProgressTasks.filter(
      (t: any) => t.blockedBy && t.blockedBy.length > 0
    );
  },
});

/**
 * Internal mutation: set blockedSince timestamp on a task.
 */
export const markTaskBlocked = internalMutation({
  args: {
    taskId: v.id("tasks"),
    blockedSince: v.number(),
  },
  handler: async (ctx, { taskId, blockedSince }) => {
    const task = await ctx.db.get(taskId);
    if (!task) return;
    // Only set if not already set
    if (!task.blockedSince) {
      await ctx.db.patch(taskId, { blockedSince });
    }
  },
});

/**
 * Internal mutation: clear blockedSince when blockers resolve.
 */
export const clearTaskBlocked = internalMutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) return;
    if (task.blockedSince) {
      await ctx.db.patch(taskId, {
        blockedSince: undefined,
        escalationTier: undefined,
      });
    }
  },
});

/**
 * AGT-318: Internal mutation to update escalation tier on a task.
 */
export const setEscalationTier = internalMutation({
  args: {
    taskId: v.id("tasks"),
    tier: v.number(),
  },
  handler: async (ctx, { taskId, tier }) => {
    await ctx.db.patch(taskId, { escalationTier: tier });
  },
});

/**
 * Determine the escalation tier based on how long a task has been blocked.
 */
function calculateEscalationTier(blockedSince: number): number {
  const duration = Date.now() - blockedSince;
  if (duration >= ESCALATION_THRESHOLDS.T4) return 4;
  if (duration >= ESCALATION_THRESHOLDS.T3) return 3;
  if (duration >= ESCALATION_THRESHOLDS.T2) return 2;
  return 1;
}

/**
 * AGT-318: Execute escalation action for a given tier.
 * Each tier only fires once — tracked by escalationTier on the task.
 */
async function executeEscalation(
  ctx: {
    runQuery: (ref: any, args: any) => Promise<any>;
    runMutation: (ref: any, args: any) => Promise<any>;
    runAction: (ref: any, args: any) => Promise<any>;
  },
  task: any,
  tier: number,
  unresolvedNames: string[]
) {
  const taskLabel = task.linearIdentifier ?? task.title;
  const blockerList = unresolvedNames.join(", ");

  switch (tier) {
    case 1: {
      // T1: DM assigned agent (immediate)
      if (task.agentName) {
        await ctx.runMutation(api.messaging.sendDM, {
          from: "system",
          to: task.agentName.toLowerCase(),
          content: `[Blocker T1] Your task ${taskLabel} is blocked by: ${blockerList}`,
          relatedTaskId: task._id,
          priority: "normal" as const,
        });
      }
      // Also fire the existing alert
      await ctx.runAction(internal.alerts.triggerTaskBlocked, {
        taskId: task._id,
        linearIdentifier: task.linearIdentifier,
        taskTitle: task.title,
        blockedBy: blockerList,
        agentName: task.agentName,
      });
      break;
    }
    case 2: {
      // T2: DM blocker's assignee (30 min)
      for (const blockerRef of unresolvedNames) {
        const blocker = await ctx.runQuery(
          internal.blockerDetection.resolveBlockerQuery,
          { blockerRef }
        );
        if (blocker.id) {
          const blockerTask = await ctx.runQuery(
            internal.blockerDetection.getTaskAssignee,
            { taskId: blocker.id }
          );
          if (blockerTask?.agentName) {
            await ctx.runMutation(api.messaging.sendDM, {
              from: "system",
              to: blockerTask.agentName.toLowerCase(),
              content: `[Blocker T2] Your task ${blocker.identifier} is blocking ${taskLabel}. Blocked for 30+ min.`,
              priority: "urgent" as const,
            });
          }
        }
      }
      break;
    }
    case 3: {
      // T3: Escalate to MAX (PM) via DM + #dev post (60 min)
      await ctx.runMutation(api.messaging.sendDM, {
        from: "system",
        to: "max",
        content: `[Blocker T3] Task ${taskLabel} blocked 60+ min by: ${blockerList}. Agent: ${task.agentName ?? "unassigned"}. Needs PM intervention.`,
        relatedTaskId: task._id,
        priority: "urgent" as const,
      });
      break;
    }
    case 4: {
      // T4: Post to #ceo channel (4 hours)
      await ctx.runMutation(api.messaging.sendDM, {
        from: "system",
        to: "max",
        content: `[Blocker T4 — CEO ESCALATION] Task ${taskLabel} blocked 4+ hours by: ${blockerList}. Human attention required.`,
        relatedTaskId: task._id,
        priority: "urgent" as const,
      });
      break;
    }
  }
}

/**
 * Cron action: scan in_progress tasks, detect blockers, fire tiered alerts.
 * Runs every 5 minutes via crons.ts.
 *
 * AGT-318: Escalation tiers (T1-T4) based on blockedSince duration.
 */
export const detectBlockedTasks = internalAction({
  args: {},
  handler: async (ctx) => {
    const tasksWithBlockers = await ctx.runQuery(
      internal.blockerDetection.getTasksWithBlockers
    );

    let newlyBlocked = 0;
    let escalated = 0;
    let resolved = 0;

    for (const task of tasksWithBlockers) {
      let hasUnresolvedBlocker = false;
      const unresolvedNames: string[] = [];

      for (const blockerRef of task.blockedBy) {
        const blocker = await resolveBlockerInAction(ctx, blockerRef);
        if (!blocker.resolved) {
          hasUnresolvedBlocker = true;
          unresolvedNames.push(blocker.identifier);
        }
      }

      if (hasUnresolvedBlocker) {
        if (!task.blockedSince) {
          // Newly blocked — set timestamp, start at T1
          await ctx.runMutation(
            internal.blockerDetection.markTaskBlocked,
            { taskId: task._id, blockedSince: Date.now() }
          );
          await ctx.runMutation(
            internal.blockerDetection.setEscalationTier,
            { taskId: task._id, tier: 1 }
          );
          await executeEscalation(ctx, task, 1, unresolvedNames);
          newlyBlocked++;
        } else {
          // Already blocked — check if escalation tier should increase
          const currentTier = task.escalationTier ?? 1;
          const newTier = calculateEscalationTier(task.blockedSince);

          if (newTier > currentTier) {
            await ctx.runMutation(
              internal.blockerDetection.setEscalationTier,
              { taskId: task._id, tier: newTier }
            );
            await executeEscalation(ctx, task, newTier, unresolvedNames);
            escalated++;
          }
        }
      } else {
        // All blockers resolved — clear blocked state
        if (task.blockedSince) {
          await ctx.runMutation(
            internal.blockerDetection.clearTaskBlocked,
            { taskId: task._id }
          );
          resolved++;
        }
      }
    }

    if (newlyBlocked > 0 || escalated > 0 || resolved > 0) {
      console.log(
        `[BlockerDetection] new=${newlyBlocked} escalated=${escalated} resolved=${resolved}`
      );
    }
  },
});

/**
 * Resolve blocker inside an action context (uses runQuery for DB access).
 */
async function resolveBlockerInAction(
  ctx: { runQuery: (ref: any, args: any) => Promise<any> },
  blockerRef: string
) {
  const result = await ctx.runQuery(
    internal.blockerDetection.resolveBlockerQuery,
    { blockerRef }
  );
  return result;
}

/**
 * Internal query: resolve a single blocker reference.
 * Used by the action context which can't directly access the DB.
 */
export const resolveBlockerQuery = internalQuery({
  args: { blockerRef: v.string() },
  handler: async (ctx, { blockerRef }) => {
    return await resolveBlocker(ctx, blockerRef);
  },
});

/**
 * AGT-318: Get task assignee info for escalation T2 notifications.
 */
export const getTaskAssignee = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) return null;
    return { agentName: task.agentName, title: task.title };
  },
});

/**
 * Get unresolvable blockers — dead-end tasks that are not_found or
 * in a terminal state that will never complete.
 */
export const getUnresolvableBlockers = query({
  args: {},
  handler: async (ctx) => {
    // Get all tasks that have blockedBy set
    const allTasks = await ctx.db.query("tasks").collect();
    const tasksWithBlockers = allTasks.filter(
      (t: any) => t.blockedBy && t.blockedBy.length > 0
    );

    const deadEnds: Array<{
      blockedTaskId: Id<"tasks">;
      blockedTaskTitle: string;
      blockedTaskIdentifier: string | undefined;
      blockerRef: string;
      reason: string;
    }> = [];

    for (const task of tasksWithBlockers) {
      for (const blockerRef of task.blockedBy!) {
        const blocker = await resolveBlocker(ctx, blockerRef);
        if (blocker.unresolvable || blocker.status === "not_found") {
          deadEnds.push({
            blockedTaskId: task._id,
            blockedTaskTitle: task.title,
            blockedTaskIdentifier: task.linearIdentifier,
            blockerRef,
            reason: "Blocker task not found",
          });
        }
      }
    }

    return deadEnds;
  },
});

/**
 * AGT-317 Step 4: Check if a failed task blocks other tasks.
 * Called from dispatches.fail to propagate blocker state.
 */
export const checkDependentsOfFailedTask = internalAction({
  args: {
    taskLinearIdentifier: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    // Find tasks that list this failed task in their blockedBy
    const dependents = await ctx.runQuery(
      internal.blockerDetection.findDependentTasks,
      {
        taskLinearIdentifier: args.taskLinearIdentifier,
        taskId: args.taskId,
      }
    );

    for (const dep of dependents) {
      if (!dep.blockedSince) {
        await ctx.runMutation(
          internal.blockerDetection.markTaskBlocked,
          { taskId: dep._id, blockedSince: Date.now() }
        );
        await ctx.runAction(internal.alerts.triggerTaskBlocked, {
          taskId: dep._id,
          linearIdentifier: dep.linearIdentifier,
          taskTitle: dep.title,
          blockedBy: args.taskLinearIdentifier ?? "failed task",
          agentName: dep.agentName,
        });
      }
    }
  },
});

/**
 * Internal query: find tasks whose blockedBy includes a given identifier.
 */
export const findDependentTasks = internalQuery({
  args: {
    taskLinearIdentifier: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q: any) => q.eq("status", "in_progress"))
      .collect();

    return allTasks.filter((t: any) => {
      if (!t.blockedBy || t.blockedBy.length === 0) return false;
      return t.blockedBy.some(
        (ref: string) =>
          (args.taskLinearIdentifier && ref === args.taskLinearIdentifier) ||
          (args.taskId && ref === args.taskId)
      );
    });
  },
});
