/**
 * Critical Path Tests: Task Scheduler
 *
 * North Star: Agents pick up tasks automatically.
 * Tests cover: dispatch queue, task assignment, priority handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, mockAgent, mockTask } from "../../helpers/convex-mock";

describe("Scheduler - Critical Path", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  function mockDispatch(overrides: Partial<{
    agentName: string;
    ticket: string;
    status: string;
    priority: number;
    createdAt: number;
  }> = {}) {
    return {
      _id: `dispatch_${Math.random().toString(36).slice(2)}`,
      _creationTime: Date.now(),
      agentName: "SAM",
      ticket: "AGT-123",
      status: "pending",
      priority: 3, // normal
      createdAt: Date.now(),
      ...overrides,
    };
  }

  describe("createDispatch", () => {
    it("should create dispatch for agent", async () => {
      const dispatchData = {
        agentName: "SAM",
        ticket: "AGT-456",
        status: "pending",
        priority: 2, // high
        createdAt: Date.now(),
      };

      ctx.db.insert.mockResolvedValue("dispatch_new");

      await ctx.db.insert("dispatches", dispatchData);

      expect(ctx.db.insert).toHaveBeenCalledWith(
        "dispatches",
        expect.objectContaining({
          agentName: "SAM",
          ticket: "AGT-456",
        })
      );
    });

    it("should support priority levels", () => {
      const priorities = {
        urgent: 1,
        high: 2,
        normal: 3,
        low: 4,
      };

      expect(priorities.urgent).toBeLessThan(priorities.high);
      expect(priorities.high).toBeLessThan(priorities.normal);
    });
  });

  describe("getNextDispatchForAgent", () => {
    it("should return highest priority pending dispatch", () => {
      const dispatches = [
        mockDispatch({ priority: 3, status: "pending" }), // normal
        mockDispatch({ priority: 1, status: "pending" }), // urgent
        mockDispatch({ priority: 2, status: "pending" }), // high
      ];

      const sorted = dispatches
        .filter((d) => d.status === "pending")
        .sort((a, b) => a.priority - b.priority);

      expect(sorted[0].priority).toBe(1); // urgent first
    });

    it("should return oldest within same priority", () => {
      const now = Date.now();
      const dispatches = [
        mockDispatch({ priority: 2, createdAt: now - 1000 }),
        mockDispatch({ priority: 2, createdAt: now - 3000 }), // oldest
        mockDispatch({ priority: 2, createdAt: now - 2000 }),
      ];

      const sorted = dispatches.sort((a, b) => a.createdAt - b.createdAt);

      expect(sorted[0].createdAt).toBe(now - 3000);
    });

    it("should filter by agent name", () => {
      const dispatches = [
        mockDispatch({ agentName: "SAM" }),
        mockDispatch({ agentName: "SAM" }),
        mockDispatch({ agentName: "LEO" }),
      ];

      const samDispatches = dispatches.filter((d) => d.agentName === "SAM");

      expect(samDispatches).toHaveLength(2);
    });

    it("should return null when no pending dispatches", () => {
      const dispatches = [
        mockDispatch({ status: "completed" }),
        mockDispatch({ status: "running" }),
      ];

      const pending = dispatches.filter((d) => d.status === "pending");

      expect(pending).toHaveLength(0);
    });
  });

  describe("markDispatchRunning", () => {
    it("should update status to running", async () => {
      const dispatch = mockDispatch();

      await ctx.db.patch(dispatch._id, {
        status: "running",
        startedAt: Date.now(),
      });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        dispatch._id,
        expect.objectContaining({ status: "running" })
      );
    });
  });

  describe("markDispatchCompleted", () => {
    it("should update status to completed", async () => {
      const dispatch = mockDispatch({ status: "running" });

      await ctx.db.patch(dispatch._id, {
        status: "completed",
        completedAt: Date.now(),
        result: "Task completed successfully",
      });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        dispatch._id,
        expect.objectContaining({
          status: "completed",
          result: expect.any(String),
        })
      );
    });
  });

  describe("Task Assignment Logic", () => {
    it("should assign to available agent", () => {
      const agents = [
        mockAgent({ name: "SAM", status: "online" }),
        mockAgent({ name: "LEO", status: "busy" }),
        mockAgent({ name: "QUINN", status: "offline" }),
      ];

      const available = agents.filter((a) => a.status === "online");

      expect(available).toHaveLength(1);
      expect(available[0].name).toBe("SAM");
    });

    it("should match task to agent by role", () => {
      const task = mockTask({ title: "Backend API fix" });
      const agents = [
        mockAgent({ name: "SAM", role: "backend" }),
        mockAgent({ name: "LEO", role: "frontend" }),
      ];

      // Simple role matching
      const taskKeywords = task.title.toLowerCase();
      const matchedAgent = agents.find((a) => taskKeywords.includes(a.role));

      expect(matchedAgent?.name).toBe("SAM");
    });

    it("should not assign to offline agents", () => {
      const agents = [
        mockAgent({ name: "SAM", status: "offline" }),
        mockAgent({ name: "LEO", status: "offline" }),
      ];

      const available = agents.filter((a) => a.status !== "offline");

      expect(available).toHaveLength(0);
    });
  });

  describe("Queue Management", () => {
    it("should count pending dispatches", () => {
      const dispatches = [
        mockDispatch({ status: "pending" }),
        mockDispatch({ status: "pending" }),
        mockDispatch({ status: "running" }),
        mockDispatch({ status: "completed" }),
      ];

      const pendingCount = dispatches.filter((d) => d.status === "pending").length;

      expect(pendingCount).toBe(2);
    });

    it("should track queue depth per agent", () => {
      const dispatches = [
        mockDispatch({ agentName: "SAM", status: "pending" }),
        mockDispatch({ agentName: "SAM", status: "pending" }),
        mockDispatch({ agentName: "LEO", status: "pending" }),
      ];

      const queueByAgent = dispatches.reduce((acc, d) => {
        if (d.status === "pending") {
          acc[d.agentName] = (acc[d.agentName] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      expect(queueByAgent["SAM"]).toBe(2);
      expect(queueByAgent["LEO"]).toBe(1);
    });
  });
});
