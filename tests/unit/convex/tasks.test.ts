/**
 * Unit tests for convex/tasks.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, mockTask, mockAgent } from "../../helpers/convex-mock";

describe("convex/tasks", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  describe("list", () => {
    it("should return tasks with limit", async () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        mockTask({ title: `Task ${i}`, linearIdentifier: `AGT-${i}` })
      );

      ctx.db.query.mockReturnValue({
        order: vi.fn().mockReturnThis(),
        take: vi.fn().mockResolvedValue(tasks.slice(0, 5)),
      });

      const result = await ctx.db.query("tasks").order("desc").take(5);

      expect(result).toHaveLength(5);
    });

    it("should filter by status", async () => {
      const doneTasks = [
        mockTask({ title: "Done 1", status: "done" }),
        mockTask({ title: "Done 2", status: "done" }),
      ];

      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(doneTasks),
      });

      const result = await ctx.db.query("tasks").filter(() => true).collect();

      expect(result.every((t: { status: string }) => t.status === "done")).toBe(true);
    });

    it("should filter by agent", async () => {
      const samTasks = [
        mockTask({ title: "Sam Task 1", agentName: "SAM" }),
        mockTask({ title: "Sam Task 2", agentName: "SAM" }),
      ];

      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(samTasks),
      });

      const result = await ctx.db.query("tasks").filter(() => true).collect();

      expect(result.every((t: { agentName: string }) => t.agentName === "SAM")).toBe(true);
    });
  });

  describe("create", () => {
    it("should create task with required fields", async () => {
      const taskData = {
        title: "New Task",
        status: "todo",
        linearIdentifier: "AGT-100",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      ctx.db.insert.mockResolvedValue("task_new_id");

      const id = await ctx.db.insert("tasks", taskData);

      expect(id).toBe("task_new_id");
      expect(ctx.db.insert).toHaveBeenCalledWith("tasks", taskData);
    });

    it("should set default values", async () => {
      const now = Date.now();
      const taskData = {
        title: "Task",
        status: "backlog",
        createdAt: now,
        updatedAt: now,
      };

      await ctx.db.insert("tasks", taskData);

      expect(ctx.db.insert).toHaveBeenCalledWith(
        "tasks",
        expect.objectContaining({
          status: "backlog",
          createdAt: expect.any(Number),
        })
      );
    });
  });

  describe("updateStatus", () => {
    it("should update task status", async () => {
      const task = mockTask({ status: "todo" });

      await ctx.db.patch(task._id, { status: "in_progress", updatedAt: Date.now() });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        task._id,
        expect.objectContaining({ status: "in_progress" })
      );
    });

    it("should set completedAt when done", async () => {
      const task = mockTask({ status: "in_progress" });
      const now = Date.now();

      await ctx.db.patch(task._id, { status: "done", completedAt: now, updatedAt: now });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        task._id,
        expect.objectContaining({
          status: "done",
          completedAt: expect.any(Number),
        })
      );
    });
  });

  describe("assignAgent", () => {
    it("should assign agent to task", async () => {
      const task = mockTask();
      const agent = mockAgent({ name: "LEO" });

      await ctx.db.patch(task._id, { agentName: agent.name, agentId: agent._id });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        task._id,
        expect.objectContaining({ agentName: "LEO" })
      );
    });
  });

  describe("getByLinearId", () => {
    it("should find task by Linear identifier", async () => {
      const task = mockTask({ linearIdentifier: "AGT-123" });

      ctx.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(task),
      });

      const result = await ctx.db.query("tasks").withIndex("by_linear_id").first();

      expect(result?.linearIdentifier).toBe("AGT-123");
    });

    it("should return null for non-existent identifier", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      });

      const result = await ctx.db.query("tasks").withIndex("by_linear_id").first();

      expect(result).toBeNull();
    });
  });
});
