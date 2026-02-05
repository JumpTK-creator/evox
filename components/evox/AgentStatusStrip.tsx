"use client";

/**
 * v0.3-MINIMAL: Agent Status Strip
 * Left panel — vertical list of agents with live status.
 * Mobile: horizontal scroll strip on top.
 *
 * Data: api.agents.list (full doc with lastSeen, statusReason)
 * Reuses: AgentStatusIndicator for status dots
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  AgentStatusIndicator,
  getStatusLabel,
} from "@/components/evox/AgentStatusIndicator";
import { formatDistanceToNow } from "date-fns";

/** Agent order: MAX → SAM → LEO → QUINN */
const AGENT_ORDER = ["max", "sam", "leo", "quinn"];

const ROLE_LABELS: Record<string, string> = {
  pm: "PM",
  backend: "Backend",
  frontend: "Frontend",
  qa: "QA",
  design: "Design",
};

interface AgentStatusStripProps {
  className?: string;
  /** Callback when an agent is clicked (for terminal tab switching) */
  onAgentClick?: (agentName: string) => void;
  /** Currently selected agent name (for highlight) */
  selectedAgent?: string;
}

export function AgentStatusStrip({
  className,
  onAgentClick,
  selectedAgent,
}: AgentStatusStripProps) {
  const agents = useQuery(api.agents.list);

  // Sort agents in canonical order
  const sorted = agents
    ? [...agents].sort((a, b) => {
        const i = AGENT_ORDER.indexOf(a.name.toLowerCase());
        const j = AGENT_ORDER.indexOf(b.name.toLowerCase());
        if (i === -1 && j === -1) return a.name.localeCompare(b.name);
        if (i === -1) return 1;
        if (j === -1) return -1;
        return i - j;
      })
    : [];

  if (!agents) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <span className="text-xs text-zinc-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Desktop: vertical list */}
      <div className="hidden md:flex flex-col gap-1 p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 px-2 mb-1">
          Agents
        </div>
        {sorted.map((agent) => {
          const name = agent.name.toLowerCase();
          const isSelected = selectedAgent === name;
          const status = agent.status?.toLowerCase() || "offline";
          const isActive = status === "online" || status === "busy";

          return (
            <button
              key={agent._id}
              type="button"
              onClick={() => onAgentClick?.(name)}
              className={cn(
                "flex items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-all w-full",
                "hover:bg-white/[0.04]",
                isSelected && "bg-white/[0.06] ring-1 ring-white/10"
              )}
            >
              <AgentStatusIndicator
                status={status}
                showPulse={isActive}
                size="md"
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-white uppercase">
                    {agent.name}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {ROLE_LABELS[agent.role] || agent.role}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  {getStatusLabel(status)}
                </div>
                {agent.statusReason && isActive && (
                  <div className="text-[10px] text-zinc-600 truncate mt-0.5">
                    {agent.statusReason}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile: horizontal scroll strip */}
      <div className="flex md:hidden items-center gap-2 px-3 py-2.5 overflow-x-auto scrollbar-hide">
        {sorted.map((agent) => {
          const name = agent.name.toLowerCase();
          const isSelected = selectedAgent === name;
          const status = agent.status?.toLowerCase() || "offline";
          const isActive = status === "online" || status === "busy";

          return (
            <button
              key={agent._id}
              type="button"
              onClick={() => onAgentClick?.(name)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 shrink-0 transition-all min-h-[44px]",
                "border border-white/5",
                isSelected
                  ? "bg-white/[0.06] border-white/10"
                  : "hover:bg-white/[0.03]"
              )}
            >
              <AgentStatusIndicator
                status={status}
                showPulse={isActive}
                size="sm"
              />
              <div>
                <div className="text-xs font-semibold text-white uppercase">
                  {agent.name}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {getStatusLabel(status)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
