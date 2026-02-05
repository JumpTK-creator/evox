"use client";

/**
 * EVOX Dashboard v0.2 - Lean & Clean
 * Uses HTTP endpoint directly for simplicity
 */

import { useEffect, useState } from "react";

interface Agent {
  name: string;
  computedStatus: string;
}

interface Activity {
  agentName?: string;
  eventType?: string;
  description?: string;
  title?: string;
  timestamp: number;
}

interface Status {
  agents: Agent[];
  recentActivity: Activity[];
}

export default function V2Dashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("https://gregarious-elk-556.convex.site/status");
        const data = await res.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError("Failed to load status");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading EVOX...</div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-red-500">{error || "No data"}</div>
      </div>
    );
  }

  const agents = status.agents || [];
  const activities = status.recentActivity || [];
  const onlineCount = agents.filter((a) => a.computedStatus === "online" || a.computedStatus === "busy").length;
  const totalCount = agents.length;

  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">EVOX</h1>
        <span className="text-zinc-500 text-sm">v0.2</span>
      </header>

      {/* Agent Status */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {agents.slice(0, 6).map((agent, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full ${
                agent.computedStatus === "online" ? "bg-green-500" :
                agent.computedStatus === "busy" ? "bg-yellow-500" :
                "bg-red-500"
              }`}
              title={agent.name}
            />
          ))}
          <span className="text-zinc-400 text-sm ml-2">
            {onlineCount}/{totalCount} online
          </span>
        </div>
        <div className="flex gap-2 text-xs text-zinc-500">
          {agents.slice(0, 6).map((agent, i) => (
            <span key={i} className="w-5 text-center">{agent.name?.slice(0, 3)}</span>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{onlineCount}</div>
          <div className="text-zinc-500 text-sm">Online</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{activities.length}</div>
          <div className="text-zinc-500 text-sm">Activities</div>
        </div>
      </section>

      {/* Alerts */}
      {onlineCount < totalCount && (
        <section className="mb-6">
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
            <div className="text-red-400 font-semibold">
              ⚠️ {totalCount - onlineCount} agent(s) offline
            </div>
          </div>
        </section>
      )}

      {/* Live Activity */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Live Activity
        </h2>
        <div className="space-y-2">
          {activities.slice(0, 8).map((activity, i) => (
            <div
              key={i}
              className="bg-zinc-900 rounded-xl p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-blue-400">
                  {activity.agentName || "System"}
                </span>
                <span className="text-zinc-500 text-xs">
                  {formatTime(activity.timestamp)}
                </span>
              </div>
              <div className="text-zinc-300 text-sm line-clamp-2">
                {activity.description || activity.title || "Activity"}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-zinc-800 text-center text-zinc-600 text-xs">
        EVOX v0.2 • Auto-refresh 5s
      </footer>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h`;
}
