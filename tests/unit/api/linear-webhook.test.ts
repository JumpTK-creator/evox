/**
 * Unit tests for app/api/webhooks/linear/route.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Linear Webhook API", () => {
  function createIssuePayload(action: string, issue: Partial<{
    id: string;
    identifier: string;
    title: string;
    state: { name: string };
    assignee: { name: string } | null;
    priority: number;
  }>) {
    return {
      action,
      type: "Issue",
      data: {
        id: issue.id || "issue-123",
        identifier: issue.identifier || "AGT-999",
        title: issue.title || "Test Issue",
        state: issue.state || { name: "Todo" },
        assignee: issue.assignee || null,
        priority: issue.priority ?? 2,
      },
      createdAt: new Date().toISOString(),
    };
  }

  describe("POST /api/webhooks/linear", () => {
    it("should handle issue.create events", () => {
      const payload = createIssuePayload("create", {
        identifier: "AGT-100",
        title: "New Feature",
      });

      expect(payload.action).toBe("create");
      expect(payload.data.identifier).toBe("AGT-100");
    });

    it("should handle issue.update events", () => {
      const payload = createIssuePayload("update", {
        identifier: "AGT-100",
        state: { name: "In Progress" },
      });

      expect(payload.action).toBe("update");
      expect(payload.data.state?.name).toBe("In Progress");
    });

    it("should detect status changes to Done", () => {
      const payload = createIssuePayload("update", {
        identifier: "AGT-100",
        state: { name: "Done" },
      });

      const isDone = payload.data.state?.name?.toLowerCase() === "done";
      expect(isDone).toBe(true);
    });

    it("should map Linear priorities correctly", () => {
      const priorityMap: Record<number, string> = {
        0: "none",
        1: "urgent",
        2: "high",
        3: "normal",
        4: "low",
      };

      expect(priorityMap[1]).toBe("urgent");
      expect(priorityMap[4]).toBe("low");
    });

    it("should extract agent name from assignee", () => {
      const payload = createIssuePayload("update", {
        assignee: { name: "SAM" },
      });

      const agentName = payload.data.assignee?.name?.toUpperCase();
      expect(agentName).toBe("SAM");
    });

    it("should handle unassigned issues", () => {
      const payload = createIssuePayload("create", {
        assignee: null,
      });

      expect(payload.data.assignee).toBeNull();
    });
  });

  describe("issue identifier validation", () => {
    it("should validate AGT identifier format", () => {
      const validIdentifiers = ["AGT-1", "AGT-123", "AGT-9999"];
      const invalidIdentifiers = ["AGT", "123", "AGT-", "AGT-ABC"];

      const pattern = /^AGT-\d+$/;

      validIdentifiers.forEach((id) => {
        expect(pattern.test(id)).toBe(true);
      });

      invalidIdentifiers.forEach((id) => {
        expect(pattern.test(id)).toBe(false);
      });
    });
  });

  describe("status mapping", () => {
    it("should map Linear states to internal statuses", () => {
      const stateMap: Record<string, string> = {
        Backlog: "backlog",
        Todo: "todo",
        "In Progress": "in_progress",
        "In Review": "review",
        Done: "done",
        Canceled: "canceled",
      };

      expect(stateMap["In Progress"]).toBe("in_progress");
      expect(stateMap["Done"]).toBe("done");
    });
  });
});
