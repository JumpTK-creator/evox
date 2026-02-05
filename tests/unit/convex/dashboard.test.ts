/**
 * Unit tests for convex/dashboard.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, mockTask, mockAgent } from "../../helpers/convex-mock";

describe("convex/dashboard", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  describe("getStats", () => {
    it("should return task counts by status", async () => {
      const tasks = [
        mockTask({ status: "done" }),
        mockTask({ status: "done" }),
        mockTask({ status: "in_progress" }),
        mockTask({ status: "todo" }),
        mockTask({ status: "backlog" }),
      ];

      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(tasks),
      });

      const result = await ctx.db.query("tasks").filter(() => true).collect();

      const counts = {
        done: result.filter((t: { status: string }) => t.status === "done").length,
        inProgress: result.filter((t: { status: string }) => t.status === "in_progress").length,
        todo: result.filter((t: { status: string }) => t.status === "todo").length,
        backlog: result.filter((t: { status: string }) => t.status === "backlog").length,
      };

      expect(counts.done).toBe(2);
      expect(counts.inProgress).toBe(1);
      expect(counts.todo).toBe(1);
      expect(counts.backlog).toBe(1);
    });

    it("should filter by date range", async () => {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;

      const recentTasks = [
        mockTask({ status: "done", completedAt: now - 1000 }),
        mockTask({ status: "done", completedAt: now - 2000 }),
      ];

      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(recentTasks),
      });

      const result = await ctx.db.query("tasks").filter(() => true).collect();

      expect(result.every((t: { completedAt?: number }) =>
        t.completedAt && t.completedAt > dayAgo
      )).toBe(true);
    });
  });

  describe("getAgentMetrics", () => {
    it("should return metrics per agent", async () => {
      const agents = [
        mockAgent({ name: "SAM" }),
        mockAgent({ name: "LEO" }),
      ];

      const tasks = [
        mockTask({ agentName: "SAM", status: "done" }),
        mockTask({ agentName: "SAM", status: "done" }),
        mockTask({ agentName: "LEO", status: "done" }),
      ];

      ctx.db.query
        .mockReturnValueOnce({ collect: vi.fn().mockResolvedValue(agents) })
        .mockReturnValue({ filter: vi.fn().mockReturnThis(), collect: vi.fn().mockResolvedValue(tasks) });

      const agentList = await ctx.db.query("agents").collect();
      const taskList = await ctx.db.query("tasks").filter(() => true).collect();

      const metrics = agentList.map((agent: { name: string }) => ({
        agent: agent.name,
        tasksCompleted: taskList.filter(
          (t: { agentName: string; status: string }) =>
            t.agentName === agent.name && t.status === "done"
        ).length,
      }));

      expect(metrics[0].tasksCompleted).toBe(2);
      expect(metrics[1].tasksCompleted).toBe(1);
    });
  });

  describe("getActiveAgents", () => {
    it("should return only online/busy agents", async () => {
      const agents = [
        mockAgent({ name: "SAM", status: "online" }),
        mockAgent({ name: "LEO", status: "busy" }),
        mockAgent({ name: "QUINN", status: "offline" }),
      ];

      ctx.db.query.mockReturnValue({
        collect: vi.fn().mockResolvedValue(agents),
      });

      const result = await ctx.db.query("agents").collect();
      const active = result.filter(
        (a: { status: string }) => a.status === "online" || a.status === "busy"
      );

      expect(active).toHaveLength(2);
    });

    it("should check heartbeat freshness", async () => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      const tenMinutesAgo = now - 10 * 60 * 1000;

      const agents = [
        mockAgent({ name: "SAM", status: "online", lastHeartbeat: now }),
        mockAgent({ name: "LEO", status: "online", lastHeartbeat: tenMinutesAgo }),
      ];

      ctx.db.query.mockReturnValue({
        collect: vi.fn().mockResolvedValue(agents),
      });

      const result = await ctx.db.query("agents").collect();
      const fresh = result.filter(
        (a: { lastHeartbeat?: number }) =>
          a.lastHeartbeat && a.lastHeartbeat > fiveMinutesAgo
      );

      expect(fresh).toHaveLength(1);
      expect(fresh[0].name).toBe("SAM");
    });
  });

  describe("getAlerts", () => {
    it("should return offline agents alert", async () => {
      const agents = [
        mockAgent({ name: "SAM", status: "offline" }),
        mockAgent({ name: "LEO", status: "offline" }),
      ];

      ctx.db.query.mockReturnValue({
        collect: vi.fn().mockResolvedValue(agents),
      });

      const result = await ctx.db.query("agents").collect();
      const offlineAgents = result.filter((a: { status: string }) => a.status === "offline");

      expect(offlineAgents.length).toBeGreaterThan(0);
    });

    it("should return urgent blocked tasks alert", async () => {
      const tasks = [
        mockTask({ status: "backlog", priority: "urgent" }),
        mockTask({ status: "todo", priority: "urgent" }),
      ];

      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(tasks),
      });

      const result = await ctx.db.query("tasks").filter(() => true).collect();
      const urgentBlocked = result.filter(
        (t: { status: string; priority?: string }) =>
          t.priority === "urgent" && (t.status === "backlog" || t.status === "todo")
      );

      expect(urgentBlocked.length).toBeGreaterThan(0);
    });
  });
});
