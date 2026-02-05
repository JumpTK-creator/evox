"use client";

/**
 * AGT-281: System Health Widget for CEO Dashboard
 *
 * Shows at-a-glance health metrics:
 * - Errors (24h)
 * - Self-healed count
 * - Retry success rate
 * - Active blockers (circuit breaker tripped)
 * - Average recovery time
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

interface SystemHealthWidgetProps {
  className?: string;
}

type RecoveryStatus = {
  name: string;
  status: string;
  isHealthy: boolean;
  restartCount: number;
  consecutiveFailures: number;
  circuitBreakerTripped: boolean;
  recoveryBackoffLevel: number;
  lastRestartAt: number | null;
};

type RecoveryEvent = {
  id: string;
  agentName: string;
  eventType: string;
  title: string;
  description: string;
  timestamp: number;
};

export function SystemHealthWidget({ className }: SystemHealthWidgetProps) {
  const recoveryStatus = useQuery(api.recovery.getRecoveryStatus) as RecoveryStatus[] | undefined;
  const recoveryEvents = useQuery(api.recovery.getRecoveryEvents, { limit: 50 }) as RecoveryEvent[] | undefined;

  const metrics = useMemo(() => {
    if (!recoveryStatus || !recoveryEvents) {
      return null;
    }

    const now = Date.now();
    const day24h = 24 * 60 * 60 * 1000;
    const events24h = recoveryEvents.filter(e => e.timestamp > now - day24h);

    // Count errors (any auto_restart or recovery_failure events)
    const errors24h = events24h.filter(e =>
      e.eventType === "auto_restart" || e.eventType === "recovery_failure"
    ).length;

    // Count self-healed (recovery_success events)
    const selfHealed = events24h.filter(e => e.eventType === "recovery_success").length;

    // Calculate retry success rate
    const totalRetries = events24h.filter(e => e.eventType === "auto_restart").length;
    const successfulRetries = events24h.filter(e => e.eventType === "recovery_success").length;
    const retrySuccessRate = totalRetries > 0
      ? Math.round((successfulRetries / totalRetries) * 100)
      : 100;

    // Active blockers (agents with circuit breaker tripped)
    const blockers = recoveryStatus.filter(r => r.circuitBreakerTripped);

    // Calculate average recovery time (from restart to success)
    let avgRecoveryMinutes = 0;
    const restartEvents = events24h.filter(e => e.eventType === "auto_restart");
    const successEvents = events24h.filter(e => e.eventType === "recovery_success");

    if (restartEvents.length > 0 && successEvents.length > 0) {
      // Match restart to subsequent success by agent
      const recoveryTimes: number[] = [];
      for (const success of successEvents) {
        const restart = restartEvents.find(r =>
          r.agentName === success.agentName && r.timestamp < success.timestamp
        );
        if (restart) {
          recoveryTimes.push((success.timestamp - restart.timestamp) / 60000);
        }
      }
      if (recoveryTimes.length > 0) {
        avgRecoveryMinutes = Math.round(
          recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
        );
      }
    }

    return {
      errors24h,
      selfHealed,
      retrySuccessRate,
      blockers,
      avgRecoveryMinutes,
    };
  }, [recoveryStatus, recoveryEvents]);

  if (!metrics) {
    return (
      <div className={cn("rounded border border-white/10 bg-zinc-900/50 p-3", className)}>
        <div className="text-[9px] font-medium uppercase tracking-wider text-white/30 mb-2">
          System Health
        </div>
        <div className="text-xs text-white/30 animate-pulse">Loading...</div>
      </div>
    );
  }

  const isHealthy = metrics.errors24h === 0 && metrics.blockers.length === 0;
  const hasIssues = metrics.errors24h > 0 || metrics.blockers.length > 0;

  return (
    <div className={cn(
      "rounded border bg-zinc-900/50 p-3",
      isHealthy ? "border-emerald-500/30" : hasIssues ? "border-yellow-500/30" : "border-white/10",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[9px] font-medium uppercase tracking-wider text-white/30">
          System Health
        </div>
        <span className={cn(
          "text-xs",
          isHealthy ? "text-emerald-400" : "text-yellow-400"
        )}>
          {isHealthy ? "✓ Healthy" : "⚠ Issues"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {/* Errors (24h) */}
        <div className="flex justify-between">
          <span className="text-white/40">Errors (24h)</span>
          <span className={cn(
            "font-medium",
            metrics.errors24h === 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {metrics.errors24h}
          </span>
        </div>

        {/* Self-healed */}
        <div className="flex justify-between">
          <span className="text-white/40">Self-healed</span>
          <span className="text-emerald-400 font-medium">{metrics.selfHealed}</span>
        </div>

        {/* Retry success rate */}
        <div className="flex justify-between">
          <span className="text-white/40">Retry success</span>
          <span className={cn(
            "font-medium",
            metrics.retrySuccessRate >= 80 ? "text-emerald-400" :
            metrics.retrySuccessRate >= 50 ? "text-yellow-400" : "text-red-400"
          )}>
            {metrics.retrySuccessRate}%
          </span>
        </div>

        {/* Average recovery time */}
        <div className="flex justify-between">
          <span className="text-white/40">Avg recovery</span>
          <span className="text-white font-medium">
            {metrics.avgRecoveryMinutes > 0 ? `${metrics.avgRecoveryMinutes}m` : "—"}
          </span>
        </div>
      </div>

      {/* Active blockers */}
      {metrics.blockers.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="text-[9px] text-red-400 uppercase tracking-wider mb-1">
            Active Blockers ({metrics.blockers.length})
          </div>
          {metrics.blockers.map(blocker => (
            <div key={blocker.name} className="text-[10px] text-white/60">
              • {blocker.name} — circuit breaker tripped
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
