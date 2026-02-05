"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { AgentStatusIndicator } from "@/components/evox/AgentStatusIndicator";

type AgentStatus = "online" | "idle" | "offline" | "busy";

const roleLabels: Record<string, string> = {
  pm: "PM",
  backend: "Backend",
  frontend: "Frontend",
  qa: "QA",
  design: "Design",
};

interface AgentListItemProps {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  avatar: string;
  isSelected?: boolean;
  onClick?: () => void;
}


export function AgentListItem({ name, role, status, avatar, isSelected, onClick }: AgentListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-14 w-full items-center gap-3 border-b border-[#1a1a1a] px-4 py-3 text-left transition-colors",
        isSelected
          ? "border-l-2 border-l-white bg-[#222] text-zinc-50"
          : "hover:bg-[#1a1a1a] text-zinc-400"
      )}
    >
      <AgentStatusIndicator status={status} size="sm" />
      <Avatar className="h-5 w-5 shrink-0 border border-[#222]">
        <AvatarFallback className="bg-[#111] text-[10px] text-zinc-400">{avatar}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-50">{name}</p>
      </div>
      <span className="shrink-0 rounded-[10px] border border-[#222] bg-[#111] px-2 py-0.5 text-[11px] text-[#888]">
        {roleLabels[role] ?? role}
      </span>
    </button>
  );
}
