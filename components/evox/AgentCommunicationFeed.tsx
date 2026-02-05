"use client";

/**
 * AGT-XXX: Agent Communication Feed with Keywords
 *
 * Shows recent agent-to-agent messages with:
 * - Extracted keywords (ticket IDs, actions, components)
 * - Short summaries of what each agent is doing
 * - Mobile-responsive layout
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { extractKeywords, generateSummary, formatAsHashtags } from "@/lib/extractKeywords";

interface AgentCommunicationFeedProps {
  limit?: number;
  className?: string;
  compact?: boolean;
}

type Message = {
  _id: string;
  fromAgent: string;
  toAgent?: string;
  content: string;
  type?: string;
  createdAt?: number;
  _creationTime?: number;
  fromAgentName?: string;
  fromAgentAvatar?: string;
};

/**
 * Single message item with keywords
 */
function MessageItem({ message, compact }: { message: Message; compact?: boolean }) {
  const content = message.content || "";
  const keywords = extractKeywords(content);
  const summary = generateSummary(content);
  const hashtags = formatAsHashtags(keywords.all, 3);
  const timestamp = message.createdAt || message._creationTime || Date.now();

  const fromName = (message.fromAgentName || message.fromAgent || "?").toUpperCase();
  const toName = message.toAgent ? message.toAgent.toUpperCase() : null;
  const avatar = message.fromAgentAvatar || "?";

  if (compact) {
    return (
      <div className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
        <span className="text-sm shrink-0">{avatar}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-[10px]">
            <span className="font-semibold text-blue-400">{fromName}</span>
            {toName && (
              <>
                <span className="text-white/30">→</span>
                <span className="font-medium text-white/60">{toName}</span>
              </>
            )}
            <span className="text-white/20 ml-auto">
              {formatDistanceToNow(timestamp, { addSuffix: false })}
            </span>
          </div>
          <p className="text-[11px] text-white/70 truncate">{summary}</p>
          {hashtags.length > 0 && (
            <div className="flex gap-1 mt-0.5">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] text-cyan-400/70 bg-cyan-500/10 px-1 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded border border-white/10 bg-zinc-900/50 p-3 hover:border-white/20 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{avatar}</span>
          <span className="text-xs font-semibold text-white uppercase">{fromName}</span>
          {toName && (
            <>
              <span className="text-white/30">→</span>
              <span className="text-xs font-medium text-white/70 uppercase">{toName}</span>
            </>
          )}
        </div>
        <span className="text-[10px] text-white/30">
          {formatDistanceToNow(timestamp, { addSuffix: false })}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-white/80 mb-2">{summary}</p>

      {/* Keywords */}
      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {hashtags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Agent Communication Feed component
 */
export function AgentCommunicationFeed({
  limit = 10,
  className,
  compact = false,
}: AgentCommunicationFeedProps) {
  const messages = useQuery(api.messaging.listRecent, { limit }) as Message[] | undefined;

  if (!messages) {
    return (
      <div className={cn("flex items-center justify-center py-4", className)}>
        <span className="animate-pulse text-xs text-white/40">Loading messages...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={cn("text-center py-4", className)}>
        <span className="text-2xl mb-2 block">📡</span>
        <p className="text-xs text-white/40">No recent messages</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {compact ? (
        <div className="space-y-0">
          {messages.map((msg) => (
            <MessageItem key={msg._id} message={msg} compact />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <MessageItem key={msg._id} message={msg} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Agent status card with keywords (for mobile grid view)
 */
export function AgentStatusCard({
  name,
  avatar,
  status,
  summary,
  keywords,
}: {
  name: string;
  avatar: string;
  status: "online" | "busy" | "idle" | "offline";
  summary: string;
  keywords: string[];
}) {
  const statusIcons = {
    online: "🟢",
    busy: "🔄",
    idle: "⏳",
    offline: "⭕",
  };

  const statusColors = {
    online: "border-green-500/30",
    busy: "border-yellow-500/30",
    idle: "border-zinc-500/30",
    offline: "border-red-500/30",
  };

  return (
    <div
      className={cn(
        "rounded border bg-zinc-900/50 p-3",
        statusColors[status]
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{avatar}</span>
        <span className="text-xs font-bold text-white uppercase">{name}</span>
        <span className="text-xs ml-auto">{statusIcons[status]}</span>
      </div>
      <p className="text-[11px] text-white/70 mb-1 truncate">{summary}</p>
      <div className="flex flex-wrap gap-1">
        {keywords.slice(0, 3).map((k) => (
          <span
            key={k}
            className="text-[9px] text-cyan-400/70 bg-cyan-500/10 px-1 rounded"
          >
            #{k}
          </span>
        ))}
      </div>
    </div>
  );
}
