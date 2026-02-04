/**
 * AGT-249: Self-Spawning Agents — Parallel Workers
 *
 * Allows agents to spawn sub-agents for parallel task execution.
 *
 * Architecture:
 * 1. Parent agent splits task into subtasks
 * 2. Spawns worker dispatches for each subtask
 * 3. Workers execute in parallel
 * 4. Parent collects and merges results
 * 5. Auto-cleanup completed workers
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Split a task into parallel subtasks.
 *
 * Usage from CLI:
 * npx convex run parallelWorkers:splitTask '{
 *   "parentAgent": "sam",
 *   "taskId": "AGT-249",
 *   "subtasks": [
 *     {"name": "worker-1", "command": "test", "description": "Run unit tests"},
 *     {"name": "worker-2", "command": "lint", "description": "Run linter"}
 *   ]
 * }'
 */
export const splitTask = mutation({
  args: {
    parentAgent: v.string(), // "sam", "leo", "max", "quinn"
    taskId: v.string(),       // Linear identifier like "AGT-249"
    subtasks: v.array(v.object({
      name: v.string(),           // worker-1, worker-2, etc.
      command: v.string(),        // Command to execute
      description: v.string(),    // Human-readable description
      payload: v.optional(v.string()), // Optional command payload
      priority: v.optional(v.number()), // 0=URGENT, 1=HIGH, 2=NORMAL, 3=LOW
    })),
    // Configuration options
    mergeStrategy: v.optional(v.union(
      v.literal("all_success"),    // Wait for all workers to succeed
      v.literal("first_success"),   // Return on first success
      v.literal("best_effort")      // Collect all results, even with failures
    )),
    timeoutMs: v.optional(v.number()), // Overall timeout for all workers
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find parent agent by name
    const agents = await ctx.db.query("agents").collect();
    const parentAgent = agents.find(
      (a) => a.name.toLowerCase() === args.parentAgent.toLowerCase()
    );

    if (!parentAgent) {
      throw new Error(`Parent agent not found: ${args.parentAgent}`);
    }

    // Find the task
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_linearIdentifier", (q) =>
        q.eq("linearIdentifier", args.taskId.toUpperCase())
      )
      .first();

    // Create a worker pool record
    const poolId = await ctx.db.insert("workerPools", {
      parentAgentId: parentAgent._id,
      parentAgentName: args.parentAgent.toLowerCase(),
      taskId: task?._id,
      linearIdentifier: args.taskId.toUpperCase(),
      status: "pending",
      mergeStrategy: args.mergeStrategy ?? "all_success",
      timeoutMs: args.timeoutMs,
      totalWorkers: args.subtasks.length,
      completedWorkers: 0,
      failedWorkers: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Create worker records and spawn dispatches
    const workerIds = await Promise.all(
      args.subtasks.map(async (subtask) => {
        // Create worker record
        const workerId = await ctx.db.insert("workers", {
          poolId,
          name: subtask.name,
          command: subtask.command,
          description: subtask.description,
          payload: subtask.payload,
          status: "pending",
          priority: subtask.priority ?? 2,
          createdAt: now,
          updatedAt: now,
        });

        // Create dispatch for this worker
        const dispatchId = await ctx.db.insert("dispatches", {
          agentId: parentAgent._id,
          command: subtask.command,
          payload: subtask.payload ?? JSON.stringify({
            workerId,
            poolId,
            taskId: args.taskId,
            description: subtask.description,
          }),
          priority: subtask.priority ?? 2,
          isUrgent: (subtask.priority ?? 2) === 0,
          status: "pending",
          createdAt: now,
        });

        // Link dispatch to worker
        await ctx.db.patch(workerId, {
          dispatchId,
        });

        return { workerId, dispatchId };
      })
    );

    // Mark worker pool as running
    await ctx.db.patch(poolId, {
      status: "running",
      startedAt: now,
      updatedAt: now,
    });

    // Schedule timeout handler if specified
    if (args.timeoutMs) {
      await ctx.scheduler.runAfter(
        args.timeoutMs,
        internal.parallelWorkers.handleTimeout,
        { poolId }
      );
    }

    // Log activity
    await ctx.db.insert("executionLogs", {
      agentName: args.parentAgent.toLowerCase(),
      level: "info",
      message: `Spawned ${args.subtasks.length} workers for task ${args.taskId} (pool: ${poolId}, strategy: ${args.mergeStrategy ?? "all_success"})`,
      taskId: task?._id,
      linearIdentifier: args.taskId.toUpperCase(),
      timestamp: now,
    });

    return {
      success: true,
      poolId,
      workerCount: args.subtasks.length,
      workers: workerIds,
      parentAgent: args.parentAgent,
      taskId: args.taskId,
    };
  },
});

/**
 * Report worker completion.
 * Workers call this when they finish their subtask.
 *
 * Usage from worker:
 * npx convex run parallelWorkers:reportWorkerComplete '{
 *   "workerId": "...",
 *   "success": true,
 *   "result": "Tests passed: 42/42"
 * }'
 */
export const reportWorkerComplete = mutation({
  args: {
    workerId: v.id("workers"),
    success: v.boolean(),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
    metrics: v.optional(v.object({
      durationMs: v.optional(v.number()),
      filesChanged: v.optional(v.array(v.string())),
      linesChanged: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get worker
    const worker = await ctx.db.get(args.workerId);
    if (!worker) {
      throw new Error(`Worker not found: ${args.workerId}`);
    }

    // Get pool
    const pool = await ctx.db.get(worker.poolId);
    if (!pool) {
      throw new Error(`Worker pool not found: ${worker.poolId}`);
    }

    // Update worker status
    await ctx.db.patch(args.workerId, {
      status: args.success ? "completed" : "failed",
      result: args.result,
      error: args.error,
      metrics: args.metrics,
      completedAt: now,
      updatedAt: now,
    });

    // Update pool counters
    const newCompleted = pool.completedWorkers + (args.success ? 1 : 0);
    const newFailed = pool.failedWorkers + (args.success ? 0 : 1);
    const totalDone = newCompleted + newFailed;

    await ctx.db.patch(worker.poolId, {
      completedWorkers: newCompleted,
      failedWorkers: newFailed,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("executionLogs", {
      agentName: pool.parentAgentName,
      level: args.success ? "info" : "error",
      message: `Worker ${worker.name} ${args.success ? "completed" : "failed"}: ${args.result ?? args.error ?? "No details"} (pool: ${worker.poolId}, worker: ${args.workerId})`,
      linearIdentifier: pool.linearIdentifier,
      metadata: args.metrics ? {
        duration: args.metrics.durationMs,
        filesAffected: args.metrics.filesChanged,
      } : undefined,
      timestamp: now,
    });

    // Check if pool is complete
    if (totalDone === pool.totalWorkers) {
      // All workers done - schedule merge
      await ctx.scheduler.runAfter(0, internal.parallelWorkers.mergeResults, {
        poolId: worker.poolId,
      });
    } else if (pool.mergeStrategy === "first_success" && args.success) {
      // First success - schedule merge immediately
      await ctx.scheduler.runAfter(0, internal.parallelWorkers.mergeResults, {
        poolId: worker.poolId,
      });
    }

    return {
      success: true,
      workerId: args.workerId,
      poolId: worker.poolId,
      poolProgress: {
        completed: newCompleted,
        failed: newFailed,
        total: pool.totalWorkers,
        isComplete: totalDone === pool.totalWorkers,
      },
    };
  },
});

/**
 * Internal: Merge results from all workers in a pool.
 * Scheduled automatically when pool completes.
 */
export const mergeResults = internalMutation({
  args: {
    poolId: v.id("workerPools"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get pool
    const pool = await ctx.db.get(args.poolId);
    if (!pool) {
      console.error(`Pool not found: ${args.poolId}`);
      return { success: false, error: "Pool not found" };
    }

    // Already merged?
    if (pool.status === "completed" || pool.status === "failed") {
      return { success: true, alreadyMerged: true };
    }

    // Get all workers
    const workers = await ctx.db
      .query("workers")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .collect();

    // Collect results based on merge strategy
    const completedWorkers = workers.filter((w) => w.status === "completed");
    const failedWorkers = workers.filter((w) => w.status === "failed");
    const pendingWorkers = workers.filter((w) => w.status === "pending" || w.status === "running");

    let poolSuccess = false;
    let poolStatus: "completed" | "failed" | "partial" = "failed";

    switch (pool.mergeStrategy) {
      case "all_success":
        // All workers must succeed
        poolSuccess = failedWorkers.length === 0 && pendingWorkers.length === 0;
        poolStatus = poolSuccess ? "completed" : "failed";
        break;

      case "first_success":
        // At least one worker succeeded
        poolSuccess = completedWorkers.length > 0;
        poolStatus = poolSuccess ? "completed" : "failed";
        break;

      case "best_effort":
        // Collect all results, success if at least one completed
        poolSuccess = completedWorkers.length > 0;
        poolStatus = failedWorkers.length > 0 ? "partial" : "completed";
        break;
    }

    // Build merged result
    const mergedResult = {
      totalWorkers: workers.length,
      completed: completedWorkers.length,
      failed: failedWorkers.length,
      pending: pendingWorkers.length,
      results: completedWorkers.map((w) => ({
        name: w.name,
        result: w.result,
        metrics: w.metrics,
      })),
      errors: failedWorkers.map((w) => ({
        name: w.name,
        error: w.error,
      })),
    };

    // Update pool
    await ctx.db.patch(args.poolId, {
      status: poolStatus,
      mergedResult: JSON.stringify(mergedResult),
      completedAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("executionLogs", {
      agentName: pool.parentAgentName,
      level: poolSuccess ? "info" : "warn",
      message: `Worker pool merged: ${completedWorkers.length}/${workers.length} succeeded (pool: ${args.poolId}, strategy: ${pool.mergeStrategy})`,
      linearIdentifier: pool.linearIdentifier,
      timestamp: now,
    });

    // Schedule cleanup
    await ctx.scheduler.runAfter(
      60000, // 1 minute delay
      internal.parallelWorkers.cleanupPool,
      { poolId: args.poolId }
    );

    return {
      success: true,
      poolId: args.poolId,
      poolSuccess,
      poolStatus,
      mergedResult,
    };
  },
});

/**
 * Internal: Handle pool timeout.
 * Scheduled when pool is created with a timeout.
 */
export const handleTimeout = internalMutation({
  args: {
    poolId: v.id("workerPools"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const pool = await ctx.db.get(args.poolId);
    if (!pool) return;

    // Already completed?
    if (pool.status === "completed" || pool.status === "failed") {
      return;
    }

    // Mark as timed out
    await ctx.db.patch(args.poolId, {
      status: "failed",
      error: "Pool timed out",
      completedAt: now,
      updatedAt: now,
    });

    // Cancel pending workers
    const workers = await ctx.db
      .query("workers")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .collect();

    for (const worker of workers) {
      if (worker.status === "pending" || worker.status === "running") {
        await ctx.db.patch(worker._id, {
          status: "failed",
          error: "Pool timed out",
          completedAt: now,
          updatedAt: now,
        });
      }
    }

    // Log timeout
    await ctx.db.insert("executionLogs", {
      agentName: pool.parentAgentName,
      level: "error",
      message: `Worker pool ${args.poolId} timed out after ${pool.timeoutMs}ms`,
      linearIdentifier: pool.linearIdentifier,
      metadata: {
        duration: pool.timeoutMs,
      },
      timestamp: now,
    });

    // Trigger merge to collect partial results
    await ctx.scheduler.runAfter(0, internal.parallelWorkers.mergeResults, {
      poolId: args.poolId,
    });
  },
});

/**
 * Internal: Cleanup completed worker pool.
 * Removes old worker records to prevent database bloat.
 */
export const cleanupPool = internalMutation({
  args: {
    poolId: v.id("workerPools"),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const pool = await ctx.db.get(args.poolId);
    if (!pool) return { success: true, message: "Pool already deleted" };

    // Only cleanup completed/failed pools
    if (!args.force && pool.status !== "completed" && pool.status !== "failed" && pool.status !== "partial") {
      return { success: false, message: "Pool not ready for cleanup" };
    }

    // Get all workers
    const workers = await ctx.db
      .query("workers")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .collect();

    // Archive workers (don't delete, keep for audit trail)
    for (const worker of workers) {
      await ctx.db.patch(worker._id, {
        archived: true,
        updatedAt: Date.now(),
      });
    }

    // Archive pool
    await ctx.db.patch(args.poolId, {
      archived: true,
      updatedAt: Date.now(),
    });

    // Log cleanup
    await ctx.db.insert("executionLogs", {
      agentName: pool.parentAgentName,
      level: "info",
      message: `Cleaned up worker pool ${args.poolId} (${workers.length} workers archived)`,
      linearIdentifier: pool.linearIdentifier,
      timestamp: Date.now(),
    });

    return {
      success: true,
      poolId: args.poolId,
      workersArchived: workers.length,
    };
  },
});

/**
 * Query: List all worker pools with their workers.
 */
export const listPools = query({
  args: {
    includeArchived: v.optional(v.boolean()),
    parentAgent: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("partial")
    )),
  },
  handler: async (ctx, args) => {
    // Get pools
    let pools = await ctx.db.query("workerPools").order("desc").take(50);

    // Filter by archived status
    if (!args.includeArchived) {
      pools = pools.filter((p) => !p.archived);
    }

    // Filter by parent agent
    if (args.parentAgent) {
      pools = pools.filter((p) =>
        p.parentAgentName.toLowerCase() === args.parentAgent!.toLowerCase()
      );
    }

    // Filter by status
    if (args.status) {
      pools = pools.filter((p) => p.status === args.status);
    }

    // Enrich with workers
    return Promise.all(
      pools.map(async (pool) => {
        const workers = await ctx.db
          .query("workers")
          .withIndex("by_pool", (q) => q.eq("poolId", pool._id))
          .collect();

        return {
          ...pool,
          workers: workers.map((w) => ({
            _id: w._id,
            name: w.name,
            command: w.command,
            status: w.status,
            result: w.result,
            error: w.error,
            metrics: w.metrics,
          })),
        };
      })
    );
  },
});

/**
 * Query: Get details of a specific worker pool.
 */
export const getPool = query({
  args: {
    poolId: v.id("workerPools"),
  },
  handler: async (ctx, args) => {
    const pool = await ctx.db.get(args.poolId);
    if (!pool) return null;

    // Get workers
    const workers = await ctx.db
      .query("workers")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .collect();

    return {
      ...pool,
      workers,
    };
  },
});

/**
 * Query: Get worker details.
 */
export const getWorker = query({
  args: {
    workerId: v.id("workers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workerId);
  },
});

/**
 * Manual cleanup of old archived pools (for maintenance).
 * Deletes pools and workers older than specified days.
 */
export const pruneArchivedPools = mutation({
  args: {
    olderThanDays: v.number(), // Delete pools older than this many days
    dryRun: v.optional(v.boolean()), // If true, only report what would be deleted
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoffTime = now - (args.olderThanDays * 24 * 60 * 60 * 1000);

    // Find old archived pools
    const pools = await ctx.db.query("workerPools").collect();
    const oldPools = pools.filter((p) =>
      p.archived &&
      (p.completedAt ?? p.createdAt) < cutoffTime
    );

    if (args.dryRun) {
      return {
        dryRun: true,
        poolsToDelete: oldPools.length,
        pools: oldPools.map((p) => ({
          poolId: p._id,
          linearIdentifier: p.linearIdentifier,
          completedAt: p.completedAt,
          age: Math.round((now - (p.completedAt ?? p.createdAt)) / 1000 / 60 / 60 / 24),
        })),
      };
    }

    // Actually delete
    let deletedWorkers = 0;
    for (const pool of oldPools) {
      // Delete workers
      const workers = await ctx.db
        .query("workers")
        .withIndex("by_pool", (q) => q.eq("poolId", pool._id))
        .collect();

      for (const worker of workers) {
        await ctx.db.delete(worker._id);
        deletedWorkers++;
      }

      // Delete pool
      await ctx.db.delete(pool._id);
    }

    return {
      success: true,
      poolsDeleted: oldPools.length,
      workersDeleted: deletedWorkers,
    };
  },
});
