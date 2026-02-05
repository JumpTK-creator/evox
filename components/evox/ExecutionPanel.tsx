"use client";

/**
 * AGT-93: Execution UI — Run button + real-time logs viewer
 *
 * Components:
 * 1. Run Button → calls startExecution action
 * 2. Agent Selector → dropdown to choose agent
 * 3. Execution Log Viewer → real-time scrolling log
 * 4. Execution Status Badge → running/done/failed/stopped
 * 5. Execution History → list past executions
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Play, Square, Terminal, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface ExecutionPanelProps {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  taskPriority?: string;
  taskLabels?: string[];
  className?: string;
}

type ExecutionStatus = "running" | "done" | "failed" | "stopped";

type LogEntry = {
  _id: Id<"engineLogs">;
  executionId: Id<"executions">;
  timestamp: number;
  step: number;
  type: "system" | "thinking" | "tool_call" | "tool_result" | "message" | "error" | "commit";
  content: string;
  metadata?: string;
};

type Execution = {
  _id: Id<"executions">;
  taskId: string;
  agentId: Id<"agents">;
  agentName: string;
  status: ExecutionStatus;
  currentStep: number;
  maxSteps: number;
  tokensUsed: number;
  filesChanged: string[];
  startedAt: number;
  completedAt?: number;
  commitSha?: string;
  error?: string;
  model: string;
  repo: string;
  branch: string;
};

type Agent = {
  _id: Id<"agents">;
  name: string;
  role: string;
  avatar: string;
  status: string;
};

/** Status badge with appropriate colors */
function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  const config: Record<ExecutionStatus, { color: string; icon: React.ReactNode; label: string }> = {
    running: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Loader2 className="h-3 w-3 animate-spin" />, label: "Running" },
    done: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: <CheckCircle className="h-3 w-3" />, label: "Done" },
    failed: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <XCircle className="h-3 w-3" />, label: "Failed" },
    stopped: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Square className="h-3 w-3" />, label: "Stopped" },
  };

  const { color, icon, label } = config[status] || config.failed;

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1", color)}>
      {icon}
      {label}
    </Badge>
  );
}

/** Log entry with color coding by type */
function LogEntryRow({ log }: { log: LogEntry }) {
  const typeColors: Record<string, string> = {
    system: "text-blue-400",
    thinking: "text-purple-400",
    tool_call: "text-yellow-400",
    tool_result: "text-cyan-400",
    message: "text-white",
    error: "text-red-400",
    commit: "text-green-400",
  };

  const typeIcons: Record<string, string> = {
    system: "⚙️",
    thinking: "🤔",
    tool_call: "🔧",
    tool_result: "📦",
    message: "💬",
    error: "❌",
    commit: "📤",
  };

  return (
    <div className="flex items-start gap-2 py-1 px-2 hover:bg-white/5 rounded text-xs font-mono">
      <span className="text-zinc-500 shrink-0 w-8 text-right">{log.step}</span>
      <span className="shrink-0">{typeIcons[log.type] || "•"}</span>
      <span className={cn("flex-1 break-words whitespace-pre-wrap", typeColors[log.type] || "text-white")}>
        {log.content}
      </span>
    </div>
  );
}

/** Execution log viewer with auto-scroll */
function ExecutionLogViewer({ executionId }: { executionId: Id<"executions"> | null }) {
  const logs = useQuery(
    api.execution.queries.getExecutionLogs,
    executionId ? { executionId, limit: 200 } : "skip"
  ) as LogEntry[] | undefined;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  if (!executionId) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
        <Terminal className="h-5 w-5 mr-2 opacity-50" />
        Select an execution to view logs
      </div>
    );
  }

  if (logs === undefined) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading logs...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
        No logs yet
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="h-64 overflow-y-auto bg-zinc-950 rounded border border-zinc-800"
    >
      {logs.map((log) => (
        <LogEntryRow key={log._id} log={log} />
      ))}
    </div>
  );
}

/** Execution history list */
function ExecutionHistory({
  executions,
  selectedId,
  onSelect,
}: {
  executions: Execution[] | undefined;
  selectedId: Id<"executions"> | null;
  onSelect: (id: Id<"executions">) => void;
}) {
  if (!executions || executions.length === 0) {
    return (
      <div className="text-center text-zinc-500 text-sm py-4">
        No executions yet
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {executions.map((exec) => (
        <button
          key={exec._id}
          onClick={() => onSelect(exec._id)}
          className={cn(
            "w-full text-left px-3 py-2 rounded border transition-colors",
            selectedId === exec._id
              ? "bg-blue-500/20 border-blue-500/30"
              : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">{exec.agentName}</span>
            <ExecutionStatusBadge status={exec.status} />
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(exec.startedAt, { addSuffix: true })}
            <span className="text-zinc-600">•</span>
            Step {exec.currentStep}/{exec.maxSteps}
            {exec.tokensUsed > 0 && (
              <>
                <span className="text-zinc-600">•</span>
                {exec.tokensUsed.toLocaleString()} tokens
              </>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/** Main Execution Panel */
export function ExecutionPanel({
  taskId,
  taskTitle,
  taskDescription,
  taskPriority,
  taskLabels,
  className,
}: ExecutionPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<string>("sam");
  const [selectedExecution, setSelectedExecution] = useState<Id<"executions"> | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Queries
  const agents = useQuery(api.agents.list) as Agent[] | undefined;
  const executions = useQuery(api.execution.queries.listExecutions, { limit: 10 }) as Execution[] | undefined;
  const currentExecution = useQuery(
    api.execution.queries.getExecution,
    selectedExecution ? { executionId: selectedExecution } : "skip"
  ) as Execution | null | undefined;

  // Actions/Mutations
  const startExecution = useAction(api.execution.engine.startExecution);
  const stopExecution = useMutation(api.execution.mutations.stopExecution);

  // Filter executions for this task
  const taskExecutions = executions?.filter((e) => e.taskId === taskId);

  // Auto-select latest execution when it starts
  useEffect(() => {
    if (taskExecutions && taskExecutions.length > 0 && !selectedExecution) {
      setSelectedExecution(taskExecutions[0]._id);
    }
  }, [taskExecutions, selectedExecution]);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const result = await startExecution({
        taskId,
        agentName: selectedAgent,
        taskTitle,
        taskDescription,
        taskPriority,
        taskLabels,
      });
      if (result.executionId) {
        setSelectedExecution(result.executionId as Id<"executions">);
      }
    } catch (error) {
      console.error("Failed to start execution:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    if (!selectedExecution) return;
    try {
      await stopExecution({ executionId: selectedExecution });
    } catch (error) {
      console.error("Failed to stop execution:", error);
    }
  };

  const isRunning = currentExecution?.status === "running";

  return (
    <Card className={cn("bg-zinc-900 border-zinc-800 p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Execution Engine</h3>
        </div>
        {currentExecution && <ExecutionStatusBadge status={currentExecution.status} />}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        {/* Agent Selector */}
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          disabled={isRunning || isStarting}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {agents?.map((agent) => (
            <option key={agent._id} value={agent.name.toLowerCase()}>
              {agent.avatar} {agent.name} ({agent.role})
            </option>
          ))}
        </select>

        {/* Run/Stop Button */}
        {isRunning ? (
          <Button
            onClick={handleStop}
            variant="outline"
            className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        ) : (
          <Button
            onClick={handleStart}
            disabled={isStarting}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isStarting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run
          </Button>
        )}
      </div>

      {/* Current Execution Stats */}
      {currentExecution && (
        <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
          <div className="bg-zinc-800 rounded p-2">
            <div className="text-zinc-500">Agent</div>
            <div className="text-white font-medium">{currentExecution.agentName}</div>
          </div>
          <div className="bg-zinc-800 rounded p-2">
            <div className="text-zinc-500">Step</div>
            <div className="text-white font-medium">{currentExecution.currentStep}/{currentExecution.maxSteps}</div>
          </div>
          <div className="bg-zinc-800 rounded p-2">
            <div className="text-zinc-500">Tokens</div>
            <div className="text-white font-medium">{currentExecution.tokensUsed.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-800 rounded p-2">
            <div className="text-zinc-500">Files</div>
            <div className="text-white font-medium">{currentExecution.filesChanged.length}</div>
          </div>
        </div>
      )}

      {/* Log Viewer */}
      <div className="mb-4">
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Execution Logs
        </div>
        <ExecutionLogViewer executionId={selectedExecution} />
      </div>

      {/* Execution History */}
      {taskExecutions && taskExecutions.length > 0 && (
        <div>
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            History
          </div>
          <ExecutionHistory
            executions={taskExecutions}
            selectedId={selectedExecution}
            onSelect={setSelectedExecution}
          />
        </div>
      )}
    </Card>
  );
}
