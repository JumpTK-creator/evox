"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function SyncDashboard() {
  const overview = useQuery(api.deviceSync.getSyncOverview);

  if (!overview) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-zinc-400">Loading sync status...</div>
      </div>
    );
  }

  const { devices, stats, timestamp } = overview;

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Device Sync Dashboard
          </h1>
          <p className="text-zinc-400">
            Cross-device agent synchronization status
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Total Agents"
            value={stats.totalAgents}
            color="blue"
          />
          <StatCard
            label="Active Agents"
            value={stats.activeAgents}
            color="green"
          />
          <StatCard
            label="Stale Agents"
            value={stats.staleAgents}
            color="red"
          />
        </div>

        {/* Devices */}
        <div className="space-y-6">
          {devices.map((device) => (
            <DeviceCard key={device.device} device={device} />
          ))}
        </div>

        {/* Timestamp */}
        <div className="mt-8 text-center text-sm text-zinc-500">
          Last updated: {new Date(timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "green" | "red";
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div
      className={`border rounded-lg p-4 ${colorClasses[color]}`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}

function DeviceCard({
  device,
}: {
  device: {
    device: string;
    agents: Array<{
      agent: string;
      status: string;
      currentTask?: string;
      isStale: boolean;
      lastHeartbeat: number;
    }>;
    activeCount: number;
    totalCount: number;
  };
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      {/* Device Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">
            {device.device === "mac-mini" ? "🖥️ Mac Mini" : "💻 MacBook"}
          </h2>
          <p className="text-sm text-zinc-400">{device.device}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-white">
            {device.activeCount}/{device.totalCount}
          </div>
          <div className="text-sm text-zinc-400">Active</div>
        </div>
      </div>

      {/* Agents */}
      <div className="space-y-3">
        {device.agents.map((agent) => (
          <AgentRow key={agent.agent} agent={agent} />
        ))}
      </div>
    </div>
  );
}

function AgentRow({
  agent,
}: {
  agent: {
    agent: string;
    status: string;
    currentTask?: string;
    isStale: boolean;
    lastHeartbeat: number;
  };
}) {
  const statusColors = {
    active: "bg-green-500",
    idle: "bg-yellow-500",
    offline: "bg-red-500",
  };

  const statusColor =
    statusColors[agent.status as keyof typeof statusColors] || "bg-zinc-500";

  const timeAgo = getTimeAgo(agent.lastHeartbeat);

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${
        agent.isStale
          ? "bg-zinc-800/50 border-zinc-700"
          : "bg-zinc-800 border-zinc-700"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Status Dot */}
        <div
          className={`w-3 h-3 rounded-full ${statusColor} ${
            agent.isStale ? "opacity-30" : ""
          }`}
        />

        {/* Agent Info */}
        <div>
          <div className="font-medium text-white">
            {agent.agent.toUpperCase()}
            {agent.isStale && (
              <span className="ml-2 text-xs text-red-400">(stale)</span>
            )}
          </div>
          <div className="text-sm text-zinc-400">
            {agent.currentTask || "Idle"}
          </div>
        </div>
      </div>

      {/* Last Heartbeat */}
      <div className="text-sm text-zinc-500">{timeAgo}</div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
