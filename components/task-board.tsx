"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { UserPlus, Check } from "lucide-react";

type TaskStatus = "backlog" | "todo" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high";

interface Task {
  id: string;
  _id?: Id<"tasks">;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  labels?: string[];
}

interface TaskBoardProps {
  tasks: Task[];
}

const columns: { status: TaskStatus; title: string }[] = [
  { status: "backlog", title: "Backlog" },
  { status: "todo", title: "Todo" },
  { status: "in_progress", title: "In Progress" },
  { status: "done", title: "Done" },
];

const priorityColors: Record<TaskPriority, string> = {
  high: "border-red-500/20 bg-red-500/10 text-red-500",
  medium: "border-yellow-500/20 bg-yellow-500/10 text-yellow-500",
  low: "border-blue-500/20 bg-blue-500/10 text-blue-500",
};

function TaskCard({ task }: { task: Task }) {
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const agents = useQuery(api.agents.list);
  const assignAgent = useMutation(api.tasks.assignAgent);

  const handleAssign = async (agentId: Id<"agents">, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!task._id) return;

    try {
      await assignAgent({
        taskId: task._id,
        assigneeId: agentId,
      });
      setShowAssignMenu(false);
    } catch (error) {
      console.error("Failed to assign task:", error);
    }
  };

  const handleAssignClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAssignMenu(!showAssignMenu);
  };

  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors cursor-pointer relative">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-zinc-50 line-clamp-2">{task.title}</h4>

            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.labels.map((label) => (
                  <Badge
                    key={label}
                    variant="outline"
                    className="text-xs border-zinc-700 bg-zinc-800/50 text-zinc-400"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Footer: Priority + Assignee + Assign Button */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={cn("text-xs", priorityColors[task.priority])}
            >
              {task.priority}
            </Badge>

            <div className="flex items-center gap-2">
              {task.assigneeAvatar && (
                <Avatar className="h-6 w-6 border border-zinc-800">
                  <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                    {task.assigneeAvatar}
                  </AvatarFallback>
                </Avatar>
              )}

              {task._id && (
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleAssignClick}
                    className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  >
                    <UserPlus className="h-3 w-3" />
                  </Button>

                  {showAssignMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowAssignMenu(false);
                        }}
                      />
                      <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-zinc-800 bg-zinc-900 shadow-lg">
                        <div className="max-h-48 overflow-y-auto py-1">
                          {agents?.map((agent) => (
                            <button
                              key={agent._id}
                              onClick={(e) => handleAssign(agent._id, e)}
                              className="flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-zinc-800 transition-colors text-zinc-300"
                            >
                              <span>{agent.name}</span>
                              {task.assigneeId === agent._id && (
                                <Check className="h-3 w-3 text-purple-400" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function TaskBoard({ tasks }: TaskBoardProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.status);
        return (
          <div key={column.status} className="space-y-4">
            {/* Column Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                {column.title}
              </h3>
              <Badge
                variant="outline"
                className="text-xs border-zinc-700 bg-zinc-800/50 text-zinc-500"
              >
                {columnTasks.length}
              </Badge>
            </div>

            {/* Task Cards */}
            <div className="space-y-3">
              {columnTasks.length > 0 ? (
                columnTasks.map((task) => <TaskCard key={task.id} task={task} />)
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center">
                  <p className="text-xs text-zinc-600">No tasks</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
