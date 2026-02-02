"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { NotificationPanel, type NotificationGroupByAgent, type DashboardNotification } from "@/components/notification-panel";
import { cn } from "@/lib/utils";

/** AGT-116: Bell with badge = total unread across all agents. Panel grouped by agent. */
interface NotificationBellProps {
  totalUnread: number;
  byAgent: NotificationGroupByAgent[];
  onMarkAllReadForAgent?: (agentId: string) => void;
  onNotificationClick?: (notificationId: string, taskSummary?: DashboardNotification["taskSummary"]) => void;
}

export function NotificationBell({
  totalUnread = 0,
  byAgent = [],
  onMarkAllReadForAgent,
  onNotificationClick,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-zinc-500 transition-colors hover:bg-[#222] hover:text-zinc-50"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {totalUnread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div ref={panelRef} className="absolute right-0 top-full z-50 mt-2">
          <NotificationPanel
            byAgent={byAgent}
            onMarkAllReadForAgent={onMarkAllReadForAgent}
            onNotificationClick={(id, taskSummary) => {
              onNotificationClick?.(id, taskSummary);
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
