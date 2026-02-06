/**
 * Device Sync - Cross-device session state management
 *
 * Allows agents on different devices (Mac Mini, MacBook) to:
 * - Report their current status
 * - See what other agents are doing
 * - Sync session state across devices
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Update session state for an agent on a device
 * Called by agents to report their current status
 */
export const updateSessionState = mutation({
  args: {
    device: v.string(), // "mac-mini" | "macbook"
    agent: v.string(), // Agent name
    status: v.union(
      v.literal("active"),
      v.literal("idle"),
      v.literal("offline")
    ),
    currentTask: v.optional(v.string()),
    currentFile: v.optional(v.string()),
    notes: v.optional(v.string()),
    metadata: v.optional(v.object({
      hostname: v.optional(v.string()),
      workingDirectory: v.optional(v.string()),
      gitBranch: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if session state exists
    const existing = await ctx.db
      .query("sessionStates")
      .withIndex("by_device_agent", (q) =>
        q.eq("device", args.device).eq("agent", args.agent)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        status: args.status,
        currentTask: args.currentTask,
        currentFile: args.currentFile,
        notes: args.notes,
        metadata: args.metadata,
        lastHeartbeat: now,
      });
      return { success: true, sessionId: existing._id, updated: true };
    } else {
      // Create new
      const sessionId = await ctx.db.insert("sessionStates", {
        device: args.device,
        agent: args.agent,
        status: args.status,
        currentTask: args.currentTask,
        currentFile: args.currentFile,
        notes: args.notes,
        metadata: args.metadata,
        lastHeartbeat: now,
        createdAt: now,
      });
      return { success: true, sessionId, updated: false };
    }
  },
});

/**
 * Get all active session states across all devices
 */
export const getAllSessionStates = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    const sessions = await ctx.db
      .query("sessionStates")
      .withIndex("by_lastHeartbeat")
      .order("desc")
      .collect();

    return sessions.map((session) => ({
      ...session,
      isStale: now - session.lastHeartbeat > staleThreshold,
      lastHeartbeatAgo: now - session.lastHeartbeat,
    }));
  },
});

/**
 * Get session states for a specific device
 */
export const getDeviceSessionStates = query({
  args: {
    device: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    const sessions = await ctx.db
      .query("sessionStates")
      .withIndex("by_device", (q) => q.eq("device", args.device))
      .collect();

    return sessions.map((session) => ({
      ...session,
      isStale: now - session.lastHeartbeat > staleThreshold,
      lastHeartbeatAgo: now - session.lastHeartbeat,
    }));
  },
});

/**
 * Get session state for a specific agent (across all devices)
 */
export const getAgentSessionStates = query({
  args: {
    agent: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    const sessions = await ctx.db
      .query("sessionStates")
      .withIndex("by_agent", (q) => q.eq("agent", args.agent))
      .collect();

    return sessions.map((session) => ({
      ...session,
      isStale: now - session.lastHeartbeat > staleThreshold,
      lastHeartbeatAgo: now - session.lastHeartbeat,
    }));
  },
});

/**
 * Get sync overview - summary of all devices and agents
 */
export const getSyncOverview = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    const sessions = await ctx.db
      .query("sessionStates")
      .withIndex("by_lastHeartbeat")
      .order("desc")
      .collect();

    // Group by device
    const deviceMap = new Map<string, any[]>();
    for (const session of sessions) {
      if (!deviceMap.has(session.device)) {
        deviceMap.set(session.device, []);
      }
      deviceMap.get(session.device)!.push({
        agent: session.agent,
        status: session.status,
        currentTask: session.currentTask,
        isStale: now - session.lastHeartbeat > staleThreshold,
        lastHeartbeat: session.lastHeartbeat,
      });
    }

    const devices = Array.from(deviceMap.entries()).map(([device, agents]) => ({
      device,
      agents,
      activeCount: agents.filter((a) => a.status === "active" && !a.isStale).length,
      totalCount: agents.length,
    }));

    // Overall stats
    const totalAgents = sessions.length;
    const activeAgents = sessions.filter(
      (s) => s.status === "active" && now - s.lastHeartbeat < staleThreshold
    ).length;
    const staleAgents = sessions.filter(
      (s) => now - s.lastHeartbeat > staleThreshold
    ).length;

    return {
      devices,
      stats: {
        totalAgents,
        activeAgents,
        staleAgents,
      },
      timestamp: now,
    };
  },
});

/**
 * Clean up stale session states (optional maintenance)
 */
export const cleanupStaleSessions = mutation({
  args: {
    olderThanMs: v.optional(v.number()), // Default: 24 hours
  },
  handler: async (ctx, args) => {
    const threshold = args.olderThanMs || 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = Date.now() - threshold;

    const staleSessions = await ctx.db
      .query("sessionStates")
      .withIndex("by_lastHeartbeat")
      .filter((q) => q.lt(q.field("lastHeartbeat"), cutoff))
      .collect();

    for (const session of staleSessions) {
      await ctx.db.delete(session._id);
    }

    return {
      success: true,
      deletedCount: staleSessions.length,
    };
  },
});
