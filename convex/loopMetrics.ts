/**
 * CORE-209: The Loop — Metrics Aggregation
 *
 * Hourly cron: aggregateHourlyMetrics() — per-agent loop stats
 * Daily cron: aggregateDailyMetrics() — CEO dashboard summary
 *
 * Tracks: completion rate, avg stage times, SLA adherence
 */

import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MessageStatus, StatusLabels } from "./messageStatus";
import { resolveAgentNameById } from "./agentMappings";

/**
 * Hourly aggregation — per-agent loop performance.
 * Collects messages from the last hour and computes stats.
 */
export const aggregateHourlyMetrics = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const hourKey = new Date(now).toISOString().slice(0, 13); // "2026-02-06T14"

    const messages = await ctx.db
      .query("agentMessages")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), oneHourAgo))
      .collect();

    // Group by recipient agent
    const agentStats = new Map<string, {
      total: number;
      closed: number;
      broken: number;
      seenTimes: number[];
      replyTimes: number[];
      actionTimes: number[];
      reportTimes: number[];
      slaBreaches: number;
    }>();

    for (const msg of messages) {
      const agent = await resolveAgentNameById(ctx.db, msg.to);
      if (!agentStats.has(agent)) {
        agentStats.set(agent, {
          total: 0, closed: 0, broken: 0,
          seenTimes: [], replyTimes: [], actionTimes: [], reportTimes: [],
          slaBreaches: 0,
        });
      }
      const stats = agentStats.get(agent)!;
      stats.total++;

      const status = msg.statusCode ?? 0;

      if (status >= MessageStatus.REPORTED) stats.closed++;
      if (msg.loopBroken) stats.broken++;

      // Calculate stage durations
      if (msg.seenAt && msg.sentAt) {
        stats.seenTimes.push(msg.seenAt - msg.sentAt);
      }
      if (msg.repliedAt && msg.seenAt) {
        stats.replyTimes.push(msg.repliedAt - msg.seenAt);
      }
      if (msg.actedAt && msg.repliedAt) {
        stats.actionTimes.push(msg.actedAt - msg.repliedAt);
      }
      if (msg.reportedAt && msg.actedAt) {
        stats.reportTimes.push(msg.reportedAt - msg.actedAt);
      }

      // SLA breaches
      if (msg.expectedReplyBy && !msg.repliedAt && now > msg.expectedReplyBy) stats.slaBreaches++;
      if (msg.expectedActionBy && !msg.actedAt && now > msg.expectedActionBy) stats.slaBreaches++;
      if (msg.expectedReportBy && !msg.reportedAt && now > msg.expectedReportBy) stats.slaBreaches++;
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;

    let metricsWritten = 0;
    for (const [agent, stats] of agentStats) {
      // Upsert: check if metric already exists for this agent+period+key
      const existing = await ctx.db
        .query("loopMetrics")
        .withIndex("by_agent_period", (q) =>
          q.eq("agentName", agent).eq("period", "hourly").eq("periodKey", hourKey)
        )
        .first();

      const data = {
        agentName: agent,
        period: "hourly" as const,
        periodKey: hourKey,
        totalMessages: stats.total,
        loopsClosed: stats.closed,
        loopsBroken: stats.broken,
        avgSeenTimeMs: avg(stats.seenTimes),
        avgReplyTimeMs: avg(stats.replyTimes),
        avgActionTimeMs: avg(stats.actionTimes),
        avgReportTimeMs: avg(stats.reportTimes),
        slaBreaches: stats.slaBreaches,
        completionRate: stats.total > 0 ? stats.closed / stats.total : 0,
        timestamp: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, data);
      } else {
        await ctx.db.insert("loopMetrics", data);
      }
      metricsWritten++;
    }

    return { metricsWritten, period: hourKey };
  },
});

/**
 * Daily aggregation — CEO dashboard summary.
 * Rolls up all messages from the last 24 hours.
 */
export const aggregateDailyMetrics = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const dayKey = new Date(now).toISOString().slice(0, 10); // "2026-02-06"

    const messages = await ctx.db
      .query("agentMessages")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), oneDayAgo))
      .collect();

    // Aggregate across all agents
    let total = 0, closed = 0, broken = 0, slaBreaches = 0;
    const agentTotals = new Map<string, { total: number; closed: number }>();

    for (const msg of messages) {
      total++;
      const agent = await resolveAgentNameById(ctx.db, msg.to);
      if (!agentTotals.has(agent)) agentTotals.set(agent, { total: 0, closed: 0 });
      const at = agentTotals.get(agent)!;
      at.total++;

      const status = msg.statusCode ?? 0;
      if (status >= MessageStatus.REPORTED) { closed++; at.closed++; }
      if (msg.loopBroken) broken++;
      if (msg.expectedReplyBy && !msg.repliedAt && now > msg.expectedReplyBy) slaBreaches++;
      if (msg.expectedActionBy && !msg.actedAt && now > msg.expectedActionBy) slaBreaches++;
      if (msg.expectedReportBy && !msg.reportedAt && now > msg.expectedReportBy) slaBreaches++;
    }

    // Write per-agent daily metrics
    let metricsWritten = 0;
    for (const [agent, stats] of agentTotals) {
      const existing = await ctx.db
        .query("loopMetrics")
        .withIndex("by_agent_period", (q) =>
          q.eq("agentName", agent).eq("period", "daily").eq("periodKey", dayKey)
        )
        .first();

      const data = {
        agentName: agent,
        period: "daily" as const,
        periodKey: dayKey,
        totalMessages: stats.total,
        loopsClosed: stats.closed,
        loopsBroken: 0,
        slaBreaches: 0,
        completionRate: stats.total > 0 ? stats.closed / stats.total : 0,
        timestamp: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, data);
      } else {
        await ctx.db.insert("loopMetrics", data);
      }
      metricsWritten++;
    }

    return { metricsWritten, dayKey, summary: { total, closed, broken, slaBreaches } };
  },
});

/**
 * Query: Get loop metrics for dashboard.
 */
export const getLoopDashboard = query({
  args: {
    agentName: v.optional(v.string()),
    period: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 24;

    if (args.agentName) {
      return ctx.db
        .query("loopMetrics")
        .withIndex("by_agent_period", (q) => {
          let q2 = q.eq("agentName", args.agentName!);
          if (args.period) q2 = q2.eq("period", args.period);
          return q2;
        })
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("loopMetrics")
      .withIndex("by_period", (q) => {
        if (args.period) return q.eq("period", args.period);
        return q;
      })
      .order("desc")
      .take(limit);
  },
});

/**
 * Query: Get active loop alerts.
 */
export const getActiveAlerts = query({
  args: {
    agentName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    if (args.agentName) {
      return ctx.db
        .query("loopAlerts")
        .withIndex("by_agent", (q) =>
          q.eq("agentName", args.agentName!).eq("status", "active")
        )
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("loopAlerts")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(limit);
  },
});

// ============================================================
// AGT-336: CEO Dashboard Queries
// ============================================================

/**
 * getDailySummary — Aggregate loop stats for the CEO Dashboard header.
 *
 * Returns: totalActive, completedToday, brokenToday, avgCompletionTimeMs
 */
export const getDailySummary = query({
  handler: async (ctx) => {
    const now = Date.now();
    const todayKey = new Date(now).toISOString().slice(0, 10); // "2026-02-06"
    const startOfDay = new Date(todayKey + "T00:00:00Z").getTime();

    // Fetch all messages from the last 7 days to capture active loops
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const messages = await ctx.db
      .query("agentMessages")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), sevenDaysAgo))
      .collect();

    let totalActive = 0;
    let completedToday = 0;
    let brokenToday = 0;
    const completionTimes: number[] = [];

    for (const msg of messages) {
      const status = msg.statusCode ?? 0;

      // Active = in-flight (not yet reported and not broken)
      if (status < MessageStatus.REPORTED && !msg.loopBroken) {
        totalActive++;
      }

      // Completed today = reported today
      if (status >= MessageStatus.REPORTED && msg.reportedAt && msg.reportedAt >= startOfDay) {
        completedToday++;
        const sentAt = msg.sentAt ?? msg.timestamp;
        completionTimes.push(msg.reportedAt - sentAt);
      }

      // Broken today
      if (msg.loopBroken && msg.timestamp >= startOfDay) {
        brokenToday++;
      }
    }

    const avgCompletionTimeMs =
      completionTimes.length > 0
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
        : null;

    return {
      totalActive,
      completedToday,
      brokenToday,
      avgCompletionTimeMs,
      asOf: now,
    };
  },
});

/**
 * getAgentBreakdown — Per-agent loop performance for the Accountability Grid.
 *
 * Returns an array of { agentName, total, closed, broken, slaBreaches,
 *   avgReplyTimeMs, avgActionTimeMs, completionRate }
 * sorted by completionRate descending.
 */
export const getAgentBreakdown = query({
  args: {
    sinceDays: v.optional(v.number()), // Default 7
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const since = now - (args.sinceDays ?? 7) * 24 * 60 * 60 * 1000;

    const messages = await ctx.db
      .query("agentMessages")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), since))
      .collect();

    const agentMap = new Map<string, {
      total: number;
      closed: number;
      broken: number;
      slaBreaches: number;
      replyTimes: number[];
      actionTimes: number[];
    }>();

    for (const msg of messages) {
      const agent = await resolveAgentNameById(ctx.db, msg.to);
      if (!agentMap.has(agent)) {
        agentMap.set(agent, {
          total: 0, closed: 0, broken: 0, slaBreaches: 0,
          replyTimes: [], actionTimes: [],
        });
      }
      const s = agentMap.get(agent)!;
      s.total++;

      const status = msg.statusCode ?? 0;
      if (status >= MessageStatus.REPORTED) s.closed++;
      if (msg.loopBroken) s.broken++;

      // SLA breaches
      if (msg.expectedReplyBy && !msg.repliedAt && now > msg.expectedReplyBy) s.slaBreaches++;
      if (msg.expectedActionBy && !msg.actedAt && now > msg.expectedActionBy) s.slaBreaches++;
      if (msg.expectedReportBy && !msg.reportedAt && now > msg.expectedReportBy) s.slaBreaches++;

      // Stage durations
      if (msg.repliedAt && msg.seenAt) s.replyTimes.push(msg.repliedAt - msg.seenAt);
      if (msg.actedAt && msg.repliedAt) s.actionTimes.push(msg.actedAt - msg.repliedAt);
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

    return Array.from(agentMap.entries())
      .map(([agentName, s]) => ({
        agentName,
        total: s.total,
        closed: s.closed,
        broken: s.broken,
        slaBreaches: s.slaBreaches,
        avgReplyTimeMs: avg(s.replyTimes),
        avgActionTimeMs: avg(s.actionTimes),
        completionRate: s.total > 0 ? Math.round((s.closed / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate);
  },
});

/**
 * getUnresolved — Unresolved loop alerts with joined message details.
 *
 * Returns alerts enriched with the original agentMessage content,
 * sender/receiver names, and current status label.
 */
export const getUnresolved = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Fetch active + escalated alerts (both are unresolved)
    const activeAlerts = await ctx.db
      .query("loopAlerts")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(limit);

    const escalatedAlerts = await ctx.db
      .query("loopAlerts")
      .withIndex("by_status", (q) => q.eq("status", "escalated"))
      .order("desc")
      .take(limit);

    const allAlerts = [...activeAlerts, ...escalatedAlerts]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    // Join with agentMessages for context
    const results = [];
    for (const alert of allAlerts) {
      const message = await ctx.db.get(alert.messageId);
      if (!message) continue;

      const fromName = await resolveAgentNameById(ctx.db, message.from);
      const toName = await resolveAgentNameById(ctx.db, message.to);
      const currentStatus = message.statusCode ?? 0;

      results.push({
        alertId: alert._id,
        alertType: alert.alertType,
        severity: alert.severity,
        status: alert.status,
        escalatedTo: alert.escalatedTo ?? null,
        createdAt: alert.createdAt,
        // Joined message fields
        messageId: alert.messageId,
        fromAgent: fromName,
        toAgent: toName,
        content: message.content.length > 120
          ? message.content.substring(0, 120) + "..."
          : message.content,
        messageStatus: currentStatus,
        messageStatusLabel: StatusLabels[currentStatus as keyof typeof StatusLabels] ?? "unknown",
        sentAt: message.sentAt ?? message.timestamp,
        loopBroken: message.loopBroken ?? false,
        loopBrokenReason: message.loopBrokenReason ?? null,
      });
    }

    return results;
  },
});
