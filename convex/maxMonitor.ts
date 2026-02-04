import { internalAction, internalMutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";

// AGT-223: Max Autonomous Monitor
// Background monitoring, self-check, agent sync, inter-agent coordination

const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const HEARTBEAT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Main monitoring check - runs every 15 minutes
 * Checks: agent health, task progress, stuck tasks, errors
 */
export const check = internalAction({
  handler: async (ctx) => {
    const now = Date.now();
    const report: MonitorReport = {
      timestamp: now,
      agents: [],
      stuckTasks: [],
      issues: [],
      summary: "",
    };

    // 1. Check all agents
    const agents = await ctx.runQuery(api.agents.list);
    for (const agent of agents) {
      const agentStatus: AgentStatus = {
        name: agent.name,
        status: agent.status,
        lastSeen: agent.lastSeen ?? 0,
        currentTask: agent.currentTask ? "working" : "idle",
        isHealthy: true,
      };

      // Check if agent heartbeat is stale
      if (agent.lastSeen && now - agent.lastSeen > HEARTBEAT_TIMEOUT_MS) {
        agentStatus.isHealthy = false;
        report.issues.push({
          type: "heartbeat_timeout",
          severity: "warning",
          agentName: agent.name,
          message: `${agent.name} heartbeat stale (${Math.round((now - agent.lastSeen) / 60000)}min ago)`,
        });
      }

      report.agents.push(agentStatus);
    }

    // 2. Check for stuck tasks (in_progress for too long)
    const tasks = await ctx.runQuery(api.tasks.list, {});
    const inProgressTasks = tasks.filter((t: any) => t.status === "in_progress");

    for (const task of inProgressTasks) {
      const taskAge = now - (task.updatedAt || task.createdAt);
      if (taskAge > STUCK_THRESHOLD_MS) {
        report.stuckTasks.push({
          taskId: task.linearIdentifier || task._id,
          title: task.title,
          assignee: task.agentName || "unassigned",
          stuckDuration: Math.round(taskAge / 60000),
        });
        report.issues.push({
          type: "stuck_task",
          severity: taskAge > STUCK_THRESHOLD_MS * 2 ? "critical" : "warning",
          taskId: task.linearIdentifier,
          message: `${task.linearIdentifier} stuck for ${Math.round(taskAge / 60000)} minutes`,
        });
      }
    }

    // 3. Check for escalated/blocked tasks
    const escalatedTasks = await ctx.runQuery(api.automation.getEscalatedTasks);
    if (escalatedTasks.length > 0) {
      for (const task of escalatedTasks) {
        report.issues.push({
          type: "escalated_task",
          severity: "critical",
          taskId: task.linearIdentifier,
          message: `${task.linearIdentifier} escalated: ${task.lastError || "needs attention"}`,
        });
      }
    }

    // 4. Check for pending approvals
    const pendingApprovals = await ctx.runQuery(api.approval.getPendingApprovals, { limit: 10 });
    if (pendingApprovals.length > 0) {
      report.issues.push({
        type: "pending_approval",
        severity: "info",
        message: `${pendingApprovals.length} task(s) pending approval`,
      });
    }

    // 5. Generate summary
    const healthyAgents = report.agents.filter((a) => a.isHealthy).length;
    const criticalIssues = report.issues.filter((i) => i.severity === "critical").length;
    const warnings = report.issues.filter((i) => i.severity === "warning").length;

    report.summary = `Agents: ${healthyAgents}/${report.agents.length} healthy | ` +
      `Tasks: ${inProgressTasks.length} in progress, ${report.stuckTasks.length} stuck | ` +
      `Issues: ${criticalIssues} critical, ${warnings} warning`;

    // 6. Store report
    await ctx.runMutation(internal.maxMonitor.storeReport, { report });

    // 7. Alert if critical issues
    if (criticalIssues > 0) {
      await ctx.runMutation(internal.maxMonitor.triggerAlert, {
        title: "Max Monitor: Critical Issues Detected",
        message: report.summary + "\n\n" + report.issues
          .filter((i) => i.severity === "critical")
          .map((i) => `- ${i.message}`)
          .join("\n"),
      });
    }

    return report;
  },
});

/**
 * Store monitor report in activity log
 */
export const storeReport = internalMutation({
  args: {},
  handler: async (ctx, { report }: { report: MonitorReport }) => {
    const max = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", "MAX"))
      .first();

    if (!max) return;

    await ctx.db.insert("activityEvents", {
      agentId: max._id,
      agentName: "max",
      category: "system",
      eventType: "monitor_report",
      title: `Monitor check: ${report.issues.length} issues`,
      description: report.summary,
      metadata: {
        source: "max_monitor",
        issueCount: report.issues.length,
        stuckTaskCount: report.stuckTasks.length,
      },
      timestamp: report.timestamp,
    });
  },
});

/**
 * Trigger alert for critical issues
 */
export const triggerAlert = internalMutation({
  args: {},
  handler: async (ctx, { title, message }: { title: string; message: string }) => {
    // Create alert in alerts table
    await ctx.db.insert("alerts", {
      type: "agent_stuck",
      severity: "critical",
      channel: "telegram",
      title,
      message,
      status: "pending",
      createdAt: Date.now(),
    });

    // Trigger Telegram notification
    await ctx.scheduler.runAfter(0, internal.alerts.sendTelegramAlert, {
      title,
      message,
    });
  },
});

/**
 * Get recent monitor reports
 */
export const getRecentReports = query({
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(100);

    return events.filter(
      (e) =>
        e.eventType === "monitor_report" &&
        e.timestamp > oneDayAgo
    );
  },
});

/**
 * Get agent sync status for inter-agent communication
 */
export const getAgentSyncStatus = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const now = Date.now();

    return agents.map((agent) => ({
      name: agent.name,
      status: agent.status,
      lastSeen: agent.lastSeen,
      isOnline: agent.lastSeen ? now - agent.lastSeen < HEARTBEAT_TIMEOUT_MS : false,
      currentTask: agent.currentTask,
    }));
  },
});

// Types
interface AgentStatus {
  name: string;
  status: string;
  lastSeen: number;
  currentTask: string;
  isHealthy: boolean;
}

interface StuckTask {
  taskId: string;
  title: string;
  assignee: string;
  stuckDuration: number;
}

interface Issue {
  type: string;
  severity: "info" | "warning" | "critical";
  agentName?: string;
  taskId?: string;
  message: string;
}

interface MonitorReport {
  timestamp: number;
  agents: AgentStatus[];
  stuckTasks: StuckTask[];
  issues: Issue[];
  summary: string;
}
