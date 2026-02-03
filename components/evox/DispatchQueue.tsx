"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface DispatchQueueProps {
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

/** Status colors */
const statusConfig: Record<string, { dot: string; text: string }> = {
  pending: { dot: "bg-yellow-500", text: "text-yellow-500" },
  running: { dot: "bg-blue-500 agent-pulse", text: "text-blue-500" },
  completed: { dot: "bg-green-500", text: "text-green-500" },
  failed: { dot: "bg-red-500", text: "text-red-500" },
};

/**
 * Phase 5: Dispatch Queue (OpenClaw integration)
 * Shows pending and running agent commands
 */
export function DispatchQueue({ className, collapsed = false, onToggle }: DispatchQueueProps) {
  // Real-time subscription to active dispatches (pending + running)
  const pending = useQuery(api.dispatches.listActive);

  const count = pending?.length ?? 0;

  // Header only mode when collapsed
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex h-10 w-full items-center justify-between border-t border-[#222222] bg-[#111111] px-3 text-[#888888] transition-colors hover:bg-[#1a1a1a]",
          className
        )}
      >
        <span className="flex items-center gap-2">
          <span>⚡</span>
          <span className="text-xs">Dispatch Queue</span>
        </span>
        {count > 0 && (
          <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-500">
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={cn("flex flex-col border-t border-[#222222] bg-[#111111]", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between border-b border-[#222222] px-3 py-2 transition-colors hover:bg-[#1a1a1a]"
      >
        <span className="flex items-center gap-2">
          <span>⚡</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#888888]">
            Dispatch Queue
          </span>
        </span>
        {count > 0 && (
          <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-500">
            {count}
          </span>
        )}
      </button>

      {/* Queue items */}
      {count === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-[#555555]">
          No pending dispatches
        </div>
      ) : (
        <div className="max-h-40 overflow-y-auto">
          {pending?.map((dispatch) => {
            const config = statusConfig[dispatch.status] ?? statusConfig.pending;
            const agentName = (dispatch.agentName ?? "?").toUpperCase();
            const waitTime = dispatch.createdAt
              ? formatDistanceToNow(dispatch.createdAt, { addSuffix: false })
              : "—";

            // Parse payload for display
            let payloadSummary = "";
            try {
              const payload = dispatch.payload ? JSON.parse(dispatch.payload) : null;
              payloadSummary = payload?.ticketId ?? payload?.linearIdentifier ?? "";
            } catch {
              payloadSummary = dispatch.payload?.slice(0, 20) ?? "";
            }

            return (
              <div
                key={dispatch._id}
                className="flex items-center gap-2 border-b border-[#222222] px-3 py-2 text-xs"
              >
                {/* Status dot */}
                <span className={cn("h-2 w-2 shrink-0 rounded-full", config.dot)} />

                {/* Agent */}
                <span className="w-10 shrink-0 truncate font-medium text-[#fafafa]">
                  {agentName}
                </span>

                {/* Command */}
                <span className="shrink-0 font-mono text-[#888888]">
                  {dispatch.command}
                </span>

                {/* Payload summary */}
                {payloadSummary && (
                  <span className="shrink-0 font-mono text-[#fafafa]">
                    {payloadSummary}
                  </span>
                )}

                {/* Status */}
                <span className={cn("shrink-0", config.text)}>
                  {dispatch.status}
                </span>

                {/* Spacer */}
                <span className="flex-1" />

                {/* Wait time */}
                <span className="shrink-0 text-[10px] text-[#555555]">
                  {waitTime}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
