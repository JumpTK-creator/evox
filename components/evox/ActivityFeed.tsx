"use client";

import { useState, useEffect, useRef } from "react";
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
 * No polling - Convex pushes updates instantly via WebSocket
 */
export function ActivityFeed({ limit = 20, className }: ActivityFeedProps) {
  // Track seen event IDs to detect new arrivals
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const mountTimeRef = useRef<number>(Date.now());

  // Real-time subscription to activity events - Convex handles WebSocket
  const events = useQuery(api.activityEvents.list, { limit });

  // Detect new events arriving in real-time
  useEffect(() => {
    if (!events) return;

    const currentIds = new Set((events as ActivityEvent[]).map(e => e._id));
    const freshIds = new Set<string>();

    // Find events that arrived after component mounted
    (events as ActivityEvent[]).forEach(event => {
      if (!seenIdsRef.current.has(event._id) && (event.timestamp ?? 0) > mountTimeRef.current - 5000) {
        freshIds.add(event._id);
      }
    });

    // Update seen IDs
    seenIdsRef.current = currentIds;

    // Animate new items
    if (freshIds.size > 0) {
      setNewIds(freshIds);
      // Clear animation after 2 seconds
      const timer = setTimeout(() => setNewIds(new Set()), 2000);
      return () => clearTimeout(timer);
    }
  }, [events]);

  if (!events || events.length === 0) {
    return (
      <div className={cn("py-8 text-center text-sm text-zinc-500", className)}>
        <span className="text-2xl mb-2 block">📡</span>
        No recent activity
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {(events as ActivityEvent[]).map((event) => {
        const eventType = event.eventType ?? "updated";
        const config = eventConfig[eventType] ?? { icon: "•", color: "text-zinc-500" };
        const verb = eventVerbs[eventType] ?? eventType;
        const agentName = (event.agentName ?? "unknown").toUpperCase();
        const ticketId = event.linearIdentifier ?? "";
        const metadata = event.metadata;
        const isNew = newIds.has(event._id);

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
            className={cn(
              // 44px min touch target for mobile
              "flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 border-b border-zinc-800 px-3 sm:px-4 py-3 min-h-[44px]",
              "transition-all duration-300 hover:bg-zinc-900 touch-manipulation",
              // Real-time highlight for new events
              isNew && "bg-blue-500/10 animate-pulse ring-1 ring-blue-500/30"
            )}
          >
            {/* Live indicator for new events */}
            {isNew && (
              <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500 animate-ping" />
            )}

            {/* Icon */}
            <span className="shrink-0 text-sm sm:text-base">{config.icon}</span>

            {/* Agent name */}
            <span className="w-10 sm:w-12 shrink-0 truncate text-xs sm:text-sm font-semibold text-zinc-50">
              {agentName}
            </span>

            {/* Action verb */}
            <span className={cn("shrink-0 text-xs sm:text-sm", config.color)}>
              {verb}
            </span>

            {/* Ticket ID */}
            {ticketId && (
              <span className="shrink-0 font-mono text-xs sm:text-sm text-zinc-50">
                {ticketId}
              </span>
            )}

            {/* Action detail (e.g., → In Progress) */}
            {actionDetail && (
              <span className="shrink-0 text-xs sm:text-sm text-zinc-500">
                {actionDetail}
              </span>
            )}

            {/* Spacer */}
            <span className="hidden sm:block flex-1" />

            {/* Timestamp */}
            <span className="shrink-0 text-[10px] sm:text-xs text-zinc-600 ml-auto sm:ml-0 tabular-nums">
              {formatDistanceToNow(event.timestamp ?? Date.now(), { addSuffix: false })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
