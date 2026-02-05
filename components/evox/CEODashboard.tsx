"use client";

/**
 * AGT-324: CEO Dashboard v0.3 — Elon-Grade Redesign
 *
 * Principles:
 * - LEAN: Every pixel earns its place
 * - 3-SECOND RULE: Full status in 3 seconds
 * - SIGNAL > NOISE: Only what matters
 * - ACTIONABLE: Every element leads to action
 *
 * Layout: Metrics → Alerts → Team Strip → Activity+Commits | Comms
 * NO agent details, NO terminals, NO per-agent metrics (those live in Agents tab)
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { startOfDay, endOfDay, formatDistanceToNow, subDays } from "date-fns";
import { AgentCommunicationFeed } from "./AgentCommunicationFeed";

interface CEODashboardProps {
  className?: string;
}

type AgentDoc = {
  _id: string;
  name: string;
  avatar: string;
  status: string;
  lastHeartbeat?: number;
  lastSeen?: number;
};

type TaskDoc = {
  _id: string;
  status: string;
  title: string;
  linearIdentifier?: string;
  priority?: string;
  agentName?: string;
  updatedAt: number;
  completedAt?: number;
  createdAt: number;
};

type PerformanceMetric = {
  agentName: string;
  totalTasksCompleted: number;
  totalTasksFailed: number;
  totalCost: number;
  avgDurationMinutes?: number;
};

type ActivityEvent = {
  _id: string;
  agentName: string;
  description: string;
  timestamp: number;
  category?: string;
};

type GitCommit = {
  _id: string;
  shortHash: string;
  message: string;
  agentName?: string;
  linkedTicketId?: string;
  url?: string;
  pushedAt: number;
  branch: string;
};

/** Sparkline — compact 7-day trend */
function Sparkline({ data, color = "#22c55e" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 60, h = 20, pad = 1;
  const points = data.map((val, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (w - pad * 2);
    const y = h - pad - ((val - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="inline-block ml-2">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Metric Card — 4 cards only: Velocity, Cost, Team, Today */
function MetricCard({ title, value, unit = "", subtitle, sparklineData, sparklineColor, color = "emerald" }: {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  color?: "emerald" | "blue" | "yellow" | "red";
}) {
  const colorMap = { emerald: "text-emerald-400", blue: "text-blue-400", yellow: "text-yellow-400", red: "text-red-400" };
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-3 sm:p-4 min-h-[80px]">
      <div className="flex items-center justify-between">
        <div className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-white/40">{title}</div>
        {sparklineData && <Sparkline data={sparklineData} color={sparklineColor || "#3b82f6"} />}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={cn("text-2xl sm:text-3xl font-bold tabular-nums", colorMap[color])}>{value}</span>
        {unit && <span className="text-sm sm:text-base text-white/50">{unit}</span>}
      </div>
      {subtitle && <div className="mt-1 text-[11px] sm:text-xs text-white/50">{subtitle}</div>}
    </div>
  );
}


/** Activity Item */
function ActivityItem({ event }: { event: ActivityEvent }) {
  return (
    <div className="flex items-start gap-2 py-1.5 px-1">
      <span className="text-[11px] text-white/40 shrink-0 w-10 tabular-nums">
        {formatDistanceToNow(event.timestamp, { addSuffix: false })}
      </span>
      <span className="font-semibold text-blue-400 uppercase shrink-0 text-[11px]">{event.agentName}</span>
      <span className="text-[11px] text-white/60 truncate flex-1">{event.description.slice(0, 60)}</span>
    </div>
  );
}

/** Git Commit Item — mobile-optimized */
function GitCommitItem({ commit }: { commit: GitCommit }) {
  const msg = commit.message.split('\n')[0].slice(0, 50);
  const hasMore = commit.message.length > 50 || commit.message.includes('\n');
  return (
    <a href={commit.url || "#"} target="_blank" rel="noopener noreferrer"
      className="flex items-start gap-1.5 sm:gap-2 text-[11px] hover:bg-white/5 rounded px-1 py-0.5 -mx-1 transition-colors">
      <span className="text-white/30 shrink-0 w-10 hidden sm:inline">{formatDistanceToNow(commit.pushedAt, { addSuffix: false })}</span>
      <code className="text-emerald-400 font-mono shrink-0">{commit.shortHash}</code>
      <span className="font-medium text-purple-400 uppercase shrink-0 text-[10px]">{commit.agentName || "—"}</span>
      <span className="text-white/60 truncate flex-1">{msg}{hasMore ? "…" : ""}</span>
      {commit.linkedTicketId && <span className="text-blue-400 shrink-0 hidden sm:inline">{commit.linkedTicketId}</span>}
    </a>
  );
}

/** CEO Dashboard v0.3 — Lean, Elon-grade */
export function CEODashboard({ className }: CEODashboardProps) {
  const now = new Date().getTime();
  const todayStart = startOfDay(new Date()).getTime();
  const todayEnd = endOfDay(new Date()).getTime();
  const day24h = 24 * 60 * 60 * 1000;

  // Queries — only what CEO needs
  const agents = useQuery(api.agents.list) as AgentDoc[] | undefined;
  const tasks = useQuery(api.tasks.list, { limit: 500 }) as TaskDoc[] | undefined;
  const dashboardStats = useQuery(api.dashboard.getStats, { startTs: todayStart, endTs: todayEnd });
  const recentActivity = useQuery(api.activityEvents.list, { limit: 5 }) as ActivityEvent[] | undefined;
  const recentCommits = useQuery(api.gitActivity.getRecent, { limit: 5 }) as GitCommit[] | undefined;
  const today = new Date().toISOString().split('T')[0];
  const performance = useQuery(api.performanceMetrics.getAllAgentsMetrics, { date: today }) as PerformanceMetric[] | undefined;

  // Velocity trend (7 days)
  const velocityTrend = useMemo(() => {
    if (!tasks) return [];
    const trend: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(subDays(new Date(), i)).getTime();
      const dayEnd = dayStart + day24h;
      trend.push(tasks.filter(t =>
        t.status?.toLowerCase() === "done" && t.completedAt && t.completedAt >= dayStart && t.completedAt < dayEnd
      ).length);
    }
    return trend;
  }, [tasks]);

  // Core metrics — 4 only
  const metrics = useMemo(() => {
    if (!agents || !tasks || !dashboardStats) {
      return { velocity: 0, costPerDay: 0, activeAgents: 0, totalAgents: 0, teamHealth: 0 };
    }
    const activeAgents = agents.filter(a => {
      const lastSeen = a.lastSeen || a.lastHeartbeat || 0;
      const status = a.status?.toLowerCase() || "offline";
      return (status === "online" || status === "busy") && (now - lastSeen < 5 * 60 * 1000);
    }).length;
    const totalAgents = agents.length;
    const teamHealth = totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : 0;
    const velocity = dashboardStats.taskCounts?.done || 0;
    const costPerDay = performance?.reduce((sum, p) => sum + (p.totalCost || 0), 0) || 0;
    return { velocity, costPerDay, activeAgents, totalAgents, teamHealth };
  }, [agents, tasks, performance, dashboardStats, now]);

  // Top performer
  const topPerformer = useMemo(() => {
    if (!agents || !performance) return null;
    let best: { name: string; avatar: string; tasks: number } | null = null;
    for (const agent of agents) {
      const perf = performance.find(p => p.agentName.toLowerCase() === agent.name.toLowerCase());
      const t = perf?.totalTasksCompleted || 0;
      if (t > 0 && (!best || t > best.tasks)) {
        best = { name: agent.name, avatar: agent.avatar, tasks: t };
      }
    }
    return best;
  }, [agents, performance]);

  // Agent status strip
  const agentStrip = useMemo(() => {
    if (!agents) return [];
    return agents.map(a => {
      const status = a.status?.toLowerCase() || "offline";
      const lastSeen = a.lastSeen || a.lastHeartbeat || 0;
      const isActive = (status === "online" || status === "busy") && (now - lastSeen < 5 * 60 * 1000);
      return { name: a.name, status: isActive ? status : "offline" };
    });
  }, [agents, now]);

  // Alerts — critical only
  const alerts = useMemo(() => {
    const items: Array<{ icon: string; text: string; severity: "critical" | "warning" | "info" }> = [];
    if (!agents || !tasks) return items;

    const offlineAgents = agents.filter(a => {
      const lastSeen = a.lastSeen || a.lastHeartbeat || 0;
      const status = a.status?.toLowerCase() || "offline";
      return status === "offline" || (now - lastSeen > 15 * 60 * 1000);
    });
    if (offlineAgents.length > 0) {
      const names = offlineAgents.map(a => a.name.toUpperCase()).join(", ");
      items.push({
        icon: "⚠️",
        text: `${offlineAgents.length} offline: ${names}`,
        severity: offlineAgents.length > 2 ? "critical" : "warning",
      });
    }

    const blockedUrgent = tasks.filter(t =>
      t.priority?.toLowerCase() === "urgent" &&
      (t.status?.toLowerCase() === "backlog" || t.status?.toLowerCase() === "todo")
    );
    if (blockedUrgent.length > 0) {
      items.push({ icon: "🚨", text: `${blockedUrgent.length} urgent task${blockedUrgent.length > 1 ? "s" : ""} blocked`, severity: "critical" });
    }

    const staleInProgress = tasks.filter(t =>
      (t.status?.toLowerCase() === "in_progress" || t.status?.toLowerCase() === "review") &&
      (now - t.updatedAt > 24 * 60 * 60 * 1000)
    );
    if (staleInProgress.length > 0) {
      items.push({ icon: "⏰", text: `${staleInProgress.length} stale (24h+)`, severity: "warning" });
    }

    if (items.length === 0) {
      items.push({ icon: "✅", text: "All systems operational", severity: "info" });
    }
    return items;
  }, [agents, tasks, now]);

  // Today's progress
  const todayProgress = useMemo(() => {
    if (!dashboardStats) return { completed: 0, inProgress: 0, queued: 0 };
    return {
      completed: dashboardStats.taskCounts?.done || 0,
      inProgress: (dashboardStats.taskCounts?.inProgress || 0) + (dashboardStats.taskCounts?.review || 0),
      queued: (dashboardStats.taskCounts?.backlog || 0) + (dashboardStats.taskCounts?.todo || 0),
    };
  }, [dashboardStats]);

  // Active work — what each agent is doing right now
  const activeWork = useMemo(() => {
    if (!agents || !tasks) return [];
    return agents.map(agent => {
      const inProgress = tasks.find(t =>
        t.agentName?.toLowerCase() === agent.name.toLowerCase() &&
        (t.status?.toLowerCase() === "in_progress" || t.status?.toLowerCase() === "review")
      );
      if (!inProgress) return null;
      const label = inProgress.linearIdentifier
        ? `${inProgress.linearIdentifier}: ${inProgress.title}`
        : inProgress.title;
      return { name: agent.name, task: label.slice(0, 60) };
    }).filter(Boolean) as { name: string; task: string }[];
  }, [agents, tasks]);

  const dotColors: Record<string, string> = {
    online: "bg-green-500",
    busy: "bg-yellow-500",
    idle: "bg-zinc-500",
    offline: "bg-red-500",
  };

  // Has real issues (not just "all clear")
  const hasIssues = alerts.some(a => a.severity !== "info");

  return (
    <div className={cn("flex flex-col h-full overflow-y-auto p-3 sm:p-4 gap-3", className)}>

      {/* Alert Top Bar — compact single-line, only when issues exist */}
      {hasIssues && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 overflow-x-auto">
          {alerts.filter(a => a.severity !== "info").map((alert, i) => (
            <span key={i} className={cn(
              "flex items-center gap-1.5 text-xs font-medium shrink-0",
              alert.severity === "critical" ? "text-red-400" : "text-yellow-400"
            )}>
              <span>{alert.icon}</span>
              <span>{alert.text}</span>
            </span>
          ))}
        </div>
      )}

      {/* Row 1: 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <MetricCard
          title="Velocity"
          value={metrics.velocity}
          subtitle="Tasks today"
          color="blue"
          sparklineData={velocityTrend}
          sparklineColor="#3b82f6"
        />
        <MetricCard
          title="Cost"
          value={`$${metrics.costPerDay.toFixed(2)}`}
          subtitle="Spend today"
          color={metrics.costPerDay < 5 ? "emerald" : metrics.costPerDay < 20 ? "yellow" : "red"}
        />
        <MetricCard
          title="Team"
          value={metrics.teamHealth}
          unit="%"
          subtitle={`${metrics.activeAgents}/${metrics.totalAgents} online`}
          color={metrics.teamHealth > 75 ? "emerald" : metrics.teamHealth > 50 ? "yellow" : "red"}
        />
        <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-3 sm:p-4 min-h-[80px] flex flex-col justify-center">
          <div className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-white/40 mb-1.5">Today</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xl font-bold text-emerald-400 tabular-nums">{todayProgress.completed}</div>
              <div className="text-[9px] uppercase text-white/30">Done</div>
            </div>
            <div>
              <div className="text-xl font-bold text-blue-400 tabular-nums">{todayProgress.inProgress}</div>
              <div className="text-[9px] uppercase text-white/30">WIP</div>
            </div>
            <div>
              <div className="text-xl font-bold text-yellow-400 tabular-nums">{todayProgress.queued}</div>
              <div className="text-[9px] uppercase text-white/30">Queue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Team Strip */}
      <div className="rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2.5">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 shrink-0">Team</span>
          {agentStrip.map(a => (
            <div key={a.name} className="flex items-center gap-1 sm:gap-1.5 shrink-0" title={`${a.name} — ${a.status}`}>
              <span className={cn("h-2 w-2 rounded-full shrink-0", dotColors[a.status] || dotColors.offline)} />
              <span className={cn("text-[10px] sm:text-[11px] font-medium uppercase", a.status !== "offline" ? "text-white/70" : "text-white/30")}>
                {a.name}
              </span>
            </div>
          ))}
          {topPerformer && (
            <>
              <span className="text-white/10 shrink-0 hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs">{topPerformer.avatar || "⭐"}</span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-400 uppercase">{topPerformer.name}</span>
                <span className="text-[10px] text-white/40">{topPerformer.tasks} tasks</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 4: Active Work — what agents are doing right now */}
      {activeWork.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2.5 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Active Work</div>
          {activeWork.map(w => (
            <div key={w.name} className="flex items-center gap-2 text-[11px]">
              <span className="font-semibold text-blue-400 uppercase shrink-0 w-12">{w.name}</span>
              <span className="text-white/20 shrink-0">&rarr;</span>
              <span className="text-white/60 truncate">{w.task}</span>
            </div>
          ))}
        </div>
      )}

      {/* Row 4: Activity + Commits | Comms — 2 column on desktop, stacked on mobile */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3" style={{ minHeight: 200 }}>
        {/* Left: Activity + Commits */}
        <div className="flex flex-col gap-3">
          {/* Live Activity */}
          <div className="flex-1 flex flex-col min-h-[120px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Live Activity</div>
            <div className="flex-1 overflow-y-auto rounded border border-white/5 bg-zinc-900/30 p-2 space-y-0.5">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map(event => <ActivityItem key={event._id} event={event} />)
              ) : (
                <div className="text-[11px] text-white/30 text-center py-4">No recent activity</div>
              )}
            </div>
          </div>

          {/* Recent Commits */}
          <div className="flex flex-col">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Recent Commits</div>
            <div className="rounded border border-white/5 bg-zinc-900/30 p-2 space-y-0.5">
              {recentCommits && recentCommits.length > 0 ? (
                recentCommits.map(c => <GitCommitItem key={c._id} commit={c} />)
              ) : (
                <div className="text-[11px] text-white/30 text-center py-2">No recent commits</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Agent Comms */}
        <div className="flex flex-col min-h-[120px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Agent Comms</div>
          <div className="flex-1 overflow-y-auto rounded border border-white/5 bg-zinc-900/30 p-2">
            <AgentCommunicationFeed limit={8} compact />
          </div>
        </div>
      </div>
    </div>
  );
}
