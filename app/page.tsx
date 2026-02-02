"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TopBar } from "@/components/dashboard-v2/top-bar";
import { MissionQueue } from "@/components/dashboard-v2/mission-queue";
import { SettingsModal } from "@/components/dashboard-v2/settings-modal";
import { ActivityPage } from "@/components/dashboard-v2/activity-page";
import { AgentStrip } from "@/components/dashboard-v2/agent-strip";
import { AgentDetailSlidePanel } from "@/components/dashboard-v2/agent-detail-slide-panel";
import { TaskDetailSlidePanel } from "@/components/dashboard-v2/task-detail-slide-panel";
import type { KanbanTask } from "@/components/dashboard-v2/task-card";
import type { NotificationGroupByAgent } from "@/components/notification-panel";
import type { DateFilterMode } from "@/components/dashboard-v2/date-filter";
import { cn } from "@/lib/utils";

/** AGT-170: Top nav MISSION QUEUE | ACTIVITY only (Agents tab removed) */
type MainTab = "queue" | "activity";

export default function Home() {
  const [mainTab, setMainTab] = useState<MainTab>("queue");
  const [date, setDate] = useState(new Date());
  const [dateMode, setDateMode] = useState<DateFilterMode>("day");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"agents"> | null>(null);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);

  const agents = useQuery(api.agents.list);
  const dashboardStats = useQuery(api.dashboard.getStats);
  const dashboardNotifications = useQuery(api.notifications.listAllForDashboard);
  const markAllAsReadForAgent = useMutation(api.notifications.markAllAsRead);
  const markNotificationAsRead = useMutation(api.notifications.markAsRead);

  const agentsList = useMemo(() => {
    if (!Array.isArray(agents) || agents.length === 0) return [];
    return agents as { _id: Id<"agents">; name: string; role: string; status: string; avatar: string; lastSeen?: number }[];
  }, [agents]);

  const activeCount = useMemo(
    () => agentsList.filter((a) => ["online", "busy"].includes((a.status ?? "").toLowerCase())).length,
    [agentsList]
  );

  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) return null;
    return agentsList.find((a) => a._id === selectedAgentId) ?? null;
  }, [selectedAgentId, agentsList]);

  const taskCounts = dashboardStats?.taskCounts ?? { backlog: 0, todo: 0, inProgress: 0, review: 0, done: 0 };
  const notificationTotalUnread = dashboardNotifications?.totalUnread ?? 0;
  const notificationByAgent = (dashboardNotifications?.byAgent ?? []) as NotificationGroupByAgent[];
  const inProgressCount = (taskCounts.inProgress ?? 0) + (taskCounts.review ?? 0);
  const doneCount = taskCounts.done ?? 0;
  const totalTaskCount =
    (taskCounts.backlog ?? 0) + (taskCounts.todo ?? 0) + (taskCounts.inProgress ?? 0) + (taskCounts.review ?? 0) + doneCount;

  const TABS: { id: MainTab; label: string }[] = [
    { id: "queue", label: "Mission Queue" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a]">
      <TopBar
        agentsActive={activeCount}
        tasksInQueue={taskCounts.todo ?? 0}
        inProgress={inProgressCount}
        doneToday={doneCount}
        totalTasks={totalTaskCount}
        onSettingsClick={() => setSettingsOpen(true)}
        notificationTotalUnread={notificationTotalUnread}
        notificationByAgent={notificationByAgent}
        onMarkAllReadForAgent={(agentId) => markAllAsReadForAgent({ agent: agentId as Id<"agents"> })}
        onNotificationClick={(notificationId, taskSummary) => {
          markNotificationAsRead({ id: notificationId as Id<"notifications"> });
          if (taskSummary?.id) {
            setSelectedTask({
              id: taskSummary.id,
              title: taskSummary.title ?? "",
              status: (taskSummary.status as KanbanTask["status"]) ?? "todo",
              priority: (taskSummary.priority as KanbanTask["priority"]) ?? "medium",
              linearIdentifier: taskSummary.linearIdentifier,
              linearUrl: taskSummary.linearUrl,
            });
          }
        }}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <nav className="flex shrink-0 border-b border-[#222] px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMainTab(tab.id)}
            className={cn(
              "px-4 py-3 text-[11px] font-medium uppercase tracking-wide",
              mainTab === tab.id
                ? "border-b-2 border-zinc-50 text-zinc-50"
                : "text-zinc-500 hover:text-zinc-400"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {mainTab === "queue" && (
          <>
            <AgentStrip onAgentClick={(id) => setSelectedAgentId(id)} />
            <MissionQueue
              date={date}
              dateMode={dateMode}
              onDateModeChange={setDateMode}
              onDateChange={setDate}
              onTaskClick={(t) => setSelectedTask(t)}
              onAssigneeClick={(id) => setSelectedAgentId(id as Id<"agents">)}
            />
          </>
        )}
        {mainTab === "activity" && <ActivityPage />}
      </div>

      <AgentDetailSlidePanel
        open={!!selectedAgentId && !!selectedAgent}
        agentId={selectedAgentId}
        name={selectedAgent?.name ?? ""}
        role={selectedAgent?.role ?? ""}
        status={selectedAgent?.status ?? ""}
        avatar={selectedAgent?.avatar ?? ""}
        onClose={() => setSelectedAgentId(null)}
      />

      <TaskDetailSlidePanel
        open={!!selectedTask}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
