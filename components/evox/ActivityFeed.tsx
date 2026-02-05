"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  limit?: number;
  className?: string;
}

/** Activity event type */
type ActivityEvent = {
  _id: string;
  eventType?: string;
  agentName?: string;
  linearIdentifier?: string;
  timestamp?: number;
  metadata?: { toStatus?: string; assignedTo?: string };
};

/** Event type icons and colors */
const eventConfig: Record<string, { icon: string; color: string }> = {
  created: { icon: "🟢", color: "text-green-500" },
  status_change: { icon: "🔵", color: "text-blue-500" },
  moved: { icon: "🔵", color: "text-blue-500" },
  completed: { icon: "✅", color: "text-emerald-500" },
  assigned: { icon: "👤", color: "text-gray-400" },
  updated: { icon: "📝", color: "text-yellow-500" },
  commented: { icon: "💬", color: "text-purple-400" },
  push: { icon: "📤", color: "text-orange-400" },
  pr_merged: { icon: "🔀", color: "text-purple-500" },
  deploy_success: { icon: "🚀", color: "text-green-400" },
  sync_completed: { icon: "🔄", color: "text-blue-400" },
};

const eventVerbs: Record<string, string> = {
  created: "created",
  status_change: "moved",
  moved: "moved",
  completed: "completed",
  assigned: "assigned",
  updated: "updated",
  commented: "commented on",
  push: "pushed",
  pr_merged: "merged",
  deploy_success: "deployed",
  sync_completed: "synced",
};

/**
 * Phase 5: Real-time Activity Feed (Linear-style)
 * Subscribes to Convex activityEvents with real-time updates
 */
export function ActivityFeed({ limit = 20, className }: ActivityFeedProps) {
  // Capture current time once on mount for stable comparison
  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  // Real-time subscription to activity events
  const events = useQuery(api.activityEvents.list, { limit });

  if (!events || events.length === 0) {
    return (
      <div className={cn("py-4 text-center text-xs text-[#555555]", className)}>
        No recent activity
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {(events as ActivityEvent[]).map((event) => {
        const eventType = event.eventType ?? "updated";
        const config = eventConfig[eventType] ?? { icon: "•", color: "text-[#888888]" };
        const verb = eventVerbs[eventType] ?? eventType;
        const agentName = (event.agentName ?? "unknown").toUpperCase();
        const ticketId = event.linearIdentifier ?? "";
        const metadata = event.metadata;

        // Build action string
        let actionDetail = "";
        if (eventType === "status_change" || eventType === "moved") {
          const toStatus = metadata?.toStatus?.replace("_", " ") ?? "";
          if (toStatus) actionDetail = ` → ${toStatus}`;
        } else if (eventType === "assigned") {
          const assignedTo = metadata?.assignedTo?.toUpperCase() ?? "";
          if (assignedTo) actionDetail = ` → ${assignedTo}`;
        }

        return (
          <div
            key={event._id}
            className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 border-b border-[#222222] px-2 sm:px-3 py-2 transition-colors hover:bg-[#1a1a1a]"
          >
            {/* Icon */}
            <span className="shrink-0 text-xs sm:text-sm">{config.icon}</span>

            {/* Agent name */}
            <span className="w-8 sm:w-10 shrink-0 truncate text-[10px] sm:text-xs font-medium text-[#fafafa]">
              {agentName}
            </span>

            {/* Action verb */}
            <span className={cn("shrink-0 text-[10px] sm:text-xs", config.color)}>
              {verb}
            </span>

            {/* Ticket ID */}
            {ticketId && (
              <span className="shrink-0 font-mono text-[10px] sm:text-xs text-[#fafafa]">
                {ticketId}
              </span>
            )}

            {/* Action detail (e.g., → In Progress) */}
            {actionDetail && (
              <span className="shrink-0 text-[10px] sm:text-xs text-[#888888]">
                {actionDetail}
              </span>
            )}

            {/* Spacer */}
            <span className="hidden sm:block flex-1" />

            {/* Timestamp */}
            <span className="shrink-0 text-[9px] sm:text-[10px] text-[#555555] ml-auto sm:ml-0">
              {formatDistanceToNow(event.timestamp ?? now, { addSuffix: false })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
