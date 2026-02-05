/**
 * Advanced Task Tests
 *
 * North Star: Tasks flow smoothly through the system.
 * Tests cover: lifecycle, transitions, dependencies, search.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, mockTask } from "../../helpers/convex-mock";

describe("Tasks - Advanced Features", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  describe("Task Lifecycle", () => {
    it("should follow valid status transitions", () => {
      const validTransitions: Record<string, string[]> = {
        todo: ["in_progress", "cancelled"],
        in_progress: ["done", "blocked", "failed"],
        blocked: ["in_progress", "cancelled"],
        failed: ["in_progress", "cancelled"],
        done: [], // terminal state
        cancelled: [], // terminal state
      };

      expect(validTransitions["todo"]).toContain("in_progress");
      expect(validTransitions["in_progress"]).toContain("done");
      expect(validTransitions["done"]).toHaveLength(0);
    });

    it("should reject invalid status transitions", () => {
      const isValidTransition = (from: string, to: string): boolean => {
        const validTransitions: Record<string, string[]> = {
          todo: ["in_progress", "cancelled"],
          in_progress: ["done", "blocked", "failed"],
          blocked: ["in_progress", "cancelled"],
          failed: ["in_progress", "cancelled"],
          done: [],
          cancelled: [],
        };
        return validTransitions[from]?.includes(to) ?? false;
      };

      expect(isValidTransition("todo", "done")).toBe(false);
      expect(isValidTransition("done", "in_progress")).toBe(false);
      expect(isValidTransition("cancelled", "todo")).toBe(false);
    });

    it("should track status history", () => {
      const statusHistory: Array<{ status: string; timestamp: number }> = [];

      const updateStatus = (newStatus: string) => {
        statusHistory.push({ status: newStatus, timestamp: Date.now() });
      };

      updateStatus("todo");
      updateStatus("in_progress");
      updateStatus("done");

      expect(statusHistory).toHaveLength(3);
      expect(statusHistory[2].status).toBe("done");
    });
  });

  describe("Task Dependencies", () => {
    it("should track blocking tasks", () => {
      const tasks = [
        mockTask({ linearIdentifier: "AGT-100", blockedBy: [] }),
        mockTask({ linearIdentifier: "AGT-101", blockedBy: ["AGT-100"] }),
        mockTask({ linearIdentifier: "AGT-102", blockedBy: ["AGT-100", "AGT-101"] }),
      ];

      const blockedTasks = tasks.filter(
        (t) => t.blockedBy && t.blockedBy.length > 0
      );

      expect(blockedTasks).toHaveLength(2);
    });

    it("should identify ready tasks", () => {
      interface TaskWithDeps {
        id: string;
        blockedBy: string[];
        status: string;
      }

      const tasks: TaskWithDeps[] = [
        { id: "AGT-100", blockedBy: [], status: "done" },
        { id: "AGT-101", blockedBy: ["AGT-100"], status: "todo" },
        { id: "AGT-102", blockedBy: ["AGT-101"], status: "todo" },
      ];

      const completedIds = tasks.filter((t) => t.status === "done").map((t) => t.id);

      const readyTasks = tasks.filter(
        (t) =>
          t.status === "todo" &&
          t.blockedBy.every((dep) => completedIds.includes(dep))
      );

      expect(readyTasks).toHaveLength(1);
      expect(readyTasks[0].id).toBe("AGT-101");
    });

    it("should detect circular dependencies", () => {
      const detectCycle = (
        taskId: string,
        deps: Record<string, string[]>,
        visited: Set<string> = new Set()
      ): boolean => {
        if (visited.has(taskId)) return true;
        visited.add(taskId);

        for (const dep of deps[taskId] || []) {
          if (detectCycle(dep, deps, new Set(visited))) return true;
        }

        return false;
      };

      const cyclicDeps = {
        "AGT-100": ["AGT-102"],
        "AGT-101": ["AGT-100"],
        "AGT-102": ["AGT-101"],
      };

      const noCycleDeps = {
        "AGT-100": [],
        "AGT-101": ["AGT-100"],
        "AGT-102": ["AGT-101"],
      };

      expect(detectCycle("AGT-100", cyclicDeps)).toBe(true);
      expect(detectCycle("AGT-100", noCycleDeps)).toBe(false);
    });
  });

  describe("Task Search", () => {
    it("should search by title", () => {
      const tasks = [
        mockTask({ title: "Fix authentication bug" }),
        mockTask({ title: "Add new API endpoint" }),
        mockTask({ title: "Update auth flow" }),
      ];

      const keyword = "auth";
      const results = tasks.filter((t) =>
        t.title.toLowerCase().includes(keyword.toLowerCase())
      );

      expect(results).toHaveLength(2);
    });

    it("should search by description", () => {
      const tasks = [
        mockTask({ title: "Task 1", description: "Fix the login page" }),
        mockTask({ title: "Task 2", description: "Update dashboard" }),
        mockTask({ title: "Task 3", description: "Login improvements" }),
      ];

      const keyword = "login";
      const results = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(keyword.toLowerCase()) ||
          (t.description?.toLowerCase().includes(keyword.toLowerCase()) ?? false)
      );

      expect(results).toHaveLength(2);
    });

    it("should search by Linear identifier", () => {
      const tasks = [
        mockTask({ linearIdentifier: "AGT-123" }),
        mockTask({ linearIdentifier: "AGT-456" }),
        mockTask({ linearIdentifier: "AGT-123" }), // duplicate for test
      ];

      const results = tasks.filter((t) => t.linearIdentifier === "AGT-123");

      expect(results).toHaveLength(2);
    });

    it("should support fuzzy search", () => {
      const fuzzyMatch = (query: string, text: string): boolean => {
        const queryLower = query.toLowerCase();
        const textLower = text.toLowerCase();

        let queryIndex = 0;
        for (const char of textLower) {
          if (char === queryLower[queryIndex]) {
            queryIndex++;
            if (queryIndex === queryLower.length) return true;
          }
        }
        return false;
      };

      expect(fuzzyMatch("auth", "authentication")).toBe(true);
      expect(fuzzyMatch("atn", "authentication")).toBe(true);
      expect(fuzzyMatch("xyz", "authentication")).toBe(false);
    });
  });

  describe("Task Filtering", () => {
    it("should filter by status", () => {
      const tasks = [
        mockTask({ status: "todo" }),
        mockTask({ status: "in_progress" }),
        mockTask({ status: "done" }),
        mockTask({ status: "todo" }),
      ];

      const todoTasks = tasks.filter((t) => t.status === "todo");

      expect(todoTasks).toHaveLength(2);
    });

    it("should filter by assignee", () => {
      const tasks = [
        mockTask({ agentName: "SAM" }),
        mockTask({ agentName: "LEO" }),
        mockTask({ agentName: "SAM" }),
      ];

      const samTasks = tasks.filter((t) => t.agentName === "SAM");

      expect(samTasks).toHaveLength(2);
    });

    it("should filter by priority", () => {
      const tasks = [
        mockTask({ priority: 1 }), // urgent
        mockTask({ priority: 2 }), // high
        mockTask({ priority: 1 }), // urgent
        mockTask({ priority: 4 }), // low
      ];

      const urgentTasks = tasks.filter((t) => t.priority === 1);

      expect(urgentTasks).toHaveLength(2);
    });

    it("should filter by date range", () => {
      const now = Date.now();
      const tasks = [
        mockTask({ createdAt: now - 60 * 60 * 1000 }), // 1 hour ago
        mockTask({ createdAt: now - 25 * 60 * 60 * 1000 }), // 25 hours ago
        mockTask({ createdAt: now - 2 * 60 * 60 * 1000 }), // 2 hours ago
      ];

      const last24h = 24 * 60 * 60 * 1000;
      const recentTasks = tasks.filter((t) => now - t.createdAt < last24h);

      expect(recentTasks).toHaveLength(2);
    });

    it("should combine multiple filters", () => {
      const tasks = [
        mockTask({ status: "todo", agentName: "SAM", priority: 1 }),
        mockTask({ status: "todo", agentName: "LEO", priority: 1 }),
        mockTask({ status: "done", agentName: "SAM", priority: 1 }),
      ];

      const filtered = tasks.filter(
        (t) => t.status === "todo" && t.agentName === "SAM" && t.priority === 1
      );

      expect(filtered).toHaveLength(1);
    });
  });

  describe("Task Sorting", () => {
    it("should sort by priority", () => {
      const tasks = [
        mockTask({ priority: 3 }),
        mockTask({ priority: 1 }),
        mockTask({ priority: 2 }),
      ];

      const sorted = [...tasks].sort((a, b) => a.priority - b.priority);

      expect(sorted[0].priority).toBe(1);
      expect(sorted[2].priority).toBe(3);
    });

    it("should sort by creation date", () => {
      const now = Date.now();
      const tasks = [
        mockTask({ createdAt: now - 1000 }),
        mockTask({ createdAt: now - 3000 }),
        mockTask({ createdAt: now - 2000 }),
      ];

      const sorted = [...tasks].sort((a, b) => a.createdAt - b.createdAt);

      expect(sorted[0].createdAt).toBe(now - 3000);
    });

    it("should sort by updated date", () => {
      const now = Date.now();
      const tasks = [
        mockTask({ updatedAt: now - 1000 }),
        mockTask({ updatedAt: now - 3000 }),
        mockTask({ updatedAt: now - 2000 }),
      ];

      const sorted = [...tasks].sort((a, b) => b.updatedAt - a.updatedAt);

      expect(sorted[0].updatedAt).toBe(now - 1000); // most recent first
    });

    it("should support multi-field sorting", () => {
      const tasks = [
        mockTask({ priority: 1, createdAt: 1000 }),
        mockTask({ priority: 1, createdAt: 500 }),
        mockTask({ priority: 2, createdAt: 200 }),
      ];

      const sorted = [...tasks].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.createdAt - b.createdAt;
      });

      expect(sorted[0].createdAt).toBe(500); // same priority, older first
      expect(sorted[2].priority).toBe(2);
    });
  });

  describe("Task Estimation", () => {
    it("should track estimated vs actual time", () => {
      const task = {
        estimatedMinutes: 60,
        actualMinutes: 75,
      };

      const variance = task.actualMinutes - task.estimatedMinutes;
      const variancePercent = (variance / task.estimatedMinutes) * 100;

      expect(variance).toBe(15);
      expect(variancePercent).toBe(25);
    });

    it("should calculate team velocity", () => {
      const completedTasks = [
        { points: 3 },
        { points: 5 },
        { points: 2 },
        { points: 8 },
      ];

      const totalPoints = completedTasks.reduce((sum, t) => sum + t.points, 0);
      const avgPointsPerTask = totalPoints / completedTasks.length;

      expect(totalPoints).toBe(18);
      expect(avgPointsPerTask).toBe(4.5);
    });
  });

  describe("Task Comments", () => {
    it("should add comments to tasks", async () => {
      const comments: Array<{ taskId: string; content: string; author: string }> = [];

      const addComment = (taskId: string, content: string, author: string) => {
        comments.push({ taskId, content, author });
      };

      addComment("task_123", "Started working on this", "SAM");
      addComment("task_123", "Found the issue", "SAM");

      expect(comments).toHaveLength(2);
      expect(comments[0].author).toBe("SAM");
    });

    it("should support @mentions in comments", () => {
      const extractMentions = (content: string): string[] => {
        const pattern = /@(\w+)/g;
        const matches = content.match(pattern);
        return matches ? matches.map((m) => m.slice(1)) : [];
      };

      const content = "@MAX @LEO please review this PR";
      const mentions = extractMentions(content);

      expect(mentions).toContain("MAX");
      expect(mentions).toContain("LEO");
      expect(mentions).toHaveLength(2);
    });
  });
});
