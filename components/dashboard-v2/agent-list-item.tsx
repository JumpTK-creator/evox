"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AgentStatus = "online" | "idle" | "offline" | "busy";

const statusDotColors: Record<AgentStatus, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-gray-500",
  offline: "bg-gray-500",
};

const roleLabels: Record<string, string> = {
  pm: "PM",
  backend: "Backend",
  frontend: "Frontend",
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
  const normalizedStatus = (status?.toLowerCase?.() ?? "offline") as AgentStatus;
  const dotColor = statusDotColors[normalizedStatus] ?? statusDotColors.offline;

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
      <span className={cn("h-2 w-2 shrink-0 rounded-full border border-[#0a0a0a]", dotColor)} />
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
