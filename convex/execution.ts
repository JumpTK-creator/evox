import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// AGT-197: Execution Visibility Backend
// Provides file activity tracking and execution logging for agent transparency

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Log a file access event (read, write, create, delete)
 */
export const logFileAccess = mutation({
  args: {
    agentName: v.string(),
    filePath: v.string(),
    action: v.union(
      v.literal("read"),
      v.literal("write"),
      v.literal("create"),
      v.literal("delete")
    ),
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.optional(v.string()),
    linesChanged: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("fileActivity", {
      agentName: args.agentName,
      filePath: args.filePath,
      action: args.action,
      taskId: args.taskId,
      linearIdentifier: args.linearIdentifier,
      linesChanged: args.linesChanged,
      timestamp: Date.now(),
    });
  },
});

/**
 * Log a single execution event
 */
export const logExecution = mutation({
  args: {
    agentName: v.string(),
    sessionId: v.optional(v.string()),
    level: v.union(
      v.literal("debug"),
      v.literal("info"),
      v.literal("warn"),
      v.literal("error")
    ),
    message: v.string(),
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.optional(v.string()),
    metadata: v.optional(v.object({
      command: v.optional(v.string()),
      exitCode: v.optional(v.number()),
      duration: v.optional(v.number()),
      filesAffected: v.optional(v.array(v.string())),
      error: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("executionLogs", {
      agentName: args.agentName,
      sessionId: args.sessionId,
      level: args.level,
      message: args.message,
      taskId: args.taskId,
      linearIdentifier: args.linearIdentifier,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

/**
 * Batch insert execution logs for efficiency
 */
export const logExecutionBatch = mutation({
  args: {
    logs: v.array(v.object({
      agentName: v.string(),
      sessionId: v.optional(v.string()),
      level: v.union(
        v.literal("debug"),
        v.literal("info"),
        v.literal("warn"),
        v.literal("error")
      ),
      message: v.string(),
      taskId: v.optional(v.id("tasks")),
      linearIdentifier: v.optional(v.string()),
      metadata: v.optional(v.object({
        command: v.optional(v.string()),
        exitCode: v.optional(v.number()),
        duration: v.optional(v.number()),
        filesAffected: v.optional(v.array(v.string())),
        error: v.optional(v.string()),
      })),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const insertedIds: Id<"executionLogs">[] = [];

    for (const log of args.logs) {
      const id = await ctx.db.insert("executionLogs", {
        agentName: log.agentName,
        sessionId: log.sessionId,
        level: log.level,
        message: log.message,
        taskId: log.taskId,
        linearIdentifier: log.linearIdentifier,
        metadata: log.metadata,
        timestamp: now,
      });
      insertedIds.push(id);
    }

    return { inserted: insertedIds.length, ids: insertedIds };
  },
});

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get recent file activity, optionally filtered by agent or task
 */
export const getRecentFileActivity = query({
  args: {
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let query;
    if (args.taskId) {
      query = ctx.db
        .query("fileActivity")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
        .order("desc");
    } else if (args.agentName) {
      const agentName = args.agentName;
      query = ctx.db
        .query("fileActivity")
        .withIndex("by_agent", (q) => q.eq("agentName", agentName))
        .order("desc");
    } else {
      query = ctx.db
        .query("fileActivity")
        .withIndex("by_timestamp")
        .order("desc");
    }

    return await query.take(limit);
  },
});

/**
 * Stream execution logs in real-time, with filtering options
 */
export const streamExecutionLogs = query({
  args: {
    agentName: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    level: v.optional(v.union(
      v.literal("debug"),
      v.literal("info"),
      v.literal("warn"),
      v.literal("error")
    )),
    taskId: v.optional(v.id("tasks")),
    limit: v.optional(v.number()),
    sinceTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    let baseQuery;

    // Choose the best index based on filters
    if (args.sessionId) {
      baseQuery = ctx.db
        .query("executionLogs")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .order("desc");
    } else if (args.taskId) {
      baseQuery = ctx.db
        .query("executionLogs")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
        .order("desc");
    } else if (args.agentName) {
      const agentName = args.agentName;
      baseQuery = ctx.db
        .query("executionLogs")
        .withIndex("by_agent", (q) => q.eq("agentName", agentName))
        .order("desc");
    } else if (args.level) {
      const level = args.level;
      baseQuery = ctx.db
        .query("executionLogs")
        .withIndex("by_level", (q) => q.eq("level", level))
        .order("desc");
    } else {
      baseQuery = ctx.db
        .query("executionLogs")
        .withIndex("by_timestamp")
        .order("desc");
    }

    // Apply additional filters
    let results = await baseQuery.take(limit * 2); // Fetch extra for filtering

    if (args.sinceTimestamp) {
      results = results.filter(log => log.timestamp >= args.sinceTimestamp!);
    }

    // Apply level filter if not already indexed
    if (args.level && !args.taskId && !args.agentName && !args.sessionId) {
      // Already filtered by index
    } else if (args.level) {
      results = results.filter(log => log.level === args.level);
    }

    return results.slice(0, limit);
  },
});

/**
 * Get execution summary statistics for an agent or task
 */
export const getExecutionSummary = query({
  args: {
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    timeRangeMs: v.optional(v.number()), // e.g., 3600000 for last hour
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRangeMs ?? 24 * 60 * 60 * 1000; // Default: 24 hours
    const since = Date.now() - timeRange;

    // Get file activity
    let fileActivityQuery;
    if (args.taskId) {
      const taskId = args.taskId;
      fileActivityQuery = ctx.db
        .query("fileActivity")
        .withIndex("by_task", (q) => q.eq("taskId", taskId));
    } else if (args.agentName) {
      const agentName = args.agentName;
      fileActivityQuery = ctx.db
        .query("fileActivity")
        .withIndex("by_agent", (q) => q.eq("agentName", agentName));
    } else {
      fileActivityQuery = ctx.db.query("fileActivity").withIndex("by_timestamp");
    }

    const fileActivity = await fileActivityQuery.collect();
    const recentFileActivity = fileActivity.filter(f => f.timestamp >= since);

    // Get execution logs
    let logsQuery;
    if (args.taskId) {
      const taskId = args.taskId;
      logsQuery = ctx.db
        .query("executionLogs")
        .withIndex("by_task", (q) => q.eq("taskId", taskId));
    } else if (args.agentName) {
      const agentName = args.agentName;
      logsQuery = ctx.db
        .query("executionLogs")
        .withIndex("by_agent", (q) => q.eq("agentName", agentName));
    } else {
      logsQuery = ctx.db.query("executionLogs").withIndex("by_timestamp");
    }

    const logs = await logsQuery.collect();
    const recentLogs = logs.filter(l => l.timestamp >= since);

    // Calculate stats
    const fileStats = {
      totalActions: recentFileActivity.length,
      reads: recentFileActivity.filter(f => f.action === "read").length,
      writes: recentFileActivity.filter(f => f.action === "write").length,
      creates: recentFileActivity.filter(f => f.action === "create").length,
      deletes: recentFileActivity.filter(f => f.action === "delete").length,
      uniqueFiles: [...new Set(recentFileActivity.map(f => f.filePath))].length,
      totalLinesChanged: recentFileActivity.reduce((sum, f) => sum + (f.linesChanged ?? 0), 0),
    };

    const logStats = {
      total: recentLogs.length,
      debug: recentLogs.filter(l => l.level === "debug").length,
      info: recentLogs.filter(l => l.level === "info").length,
      warn: recentLogs.filter(l => l.level === "warn").length,
      error: recentLogs.filter(l => l.level === "error").length,
      uniqueSessions: [...new Set(recentLogs.map(l => l.sessionId).filter(Boolean))].length,
    };

    // Get most active files
    const fileCounts: Record<string, number> = {};
    for (const f of recentFileActivity) {
      fileCounts[f.filePath] = (fileCounts[f.filePath] ?? 0) + 1;
    }
    const topFiles = Object.entries(fileCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // Get recent errors
    const recentErrors = recentLogs
      .filter(l => l.level === "error")
      .slice(-5)
      .map(l => ({
        message: l.message,
        timestamp: l.timestamp,
        metadata: l.metadata,
      }));

    return {
      timeRange: {
        since,
        now: Date.now(),
        durationMs: timeRange,
      },
      files: fileStats,
      logs: logStats,
      topFiles,
      recentErrors,
    };
  },
});
