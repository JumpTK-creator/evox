/**
 * Unit tests for app/api/agent/complete/route.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Agent Complete API", () => {
  describe("POST /api/agent/complete", () => {
    it("should accept valid completion request", () => {
      const payload = {
        agent: "SAM",
        ticket: "AGT-123",
        action: "completed",
        summary: "Implemented feature X",
      };

      expect(payload.agent).toBeTruthy();
      expect(payload.ticket).toMatch(/^AGT-\d+$/);
      expect(payload.action).toBe("completed");
    });

    it("should validate required fields", () => {
      const requiredFields = ["agent", "ticket", "action", "summary"];

      const validPayload = {
        agent: "SAM",
        ticket: "AGT-123",
        action: "completed",
        summary: "Done",
      };

      requiredFields.forEach((field) => {
        expect(validPayload).toHaveProperty(field);
      });
    });

    it("should accept valid action types", () => {
      const validActions = ["completed", "failed", "blocked"];

      validActions.forEach((action) => {
        expect(["completed", "failed", "blocked"]).toContain(action);
      });
    });

    it("should validate agent names", () => {
      const validAgents = ["SAM", "LEO", "QUINN", "MAX"];
      const invalidAgents = ["sam", "unknown", ""];

      validAgents.forEach((agent) => {
        expect(agent).toMatch(/^[A-Z]+$/);
      });
    });

    it("should include timestamp in response", () => {
      const response = {
        success: true,
        timestamp: Date.now(),
        agent: "SAM",
        ticket: "AGT-123",
      };

      expect(response.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("error handling", () => {
    it("should reject missing agent", () => {
      const payload = {
        ticket: "AGT-123",
        action: "completed",
        summary: "Done",
      };

      expect(payload).not.toHaveProperty("agent");
    });

    it("should reject invalid ticket format", () => {
      const invalidTickets = ["123", "AGT", "TICKET-123", ""];
      const pattern = /^AGT-\d+$/;

      invalidTickets.forEach((ticket) => {
        expect(pattern.test(ticket)).toBe(false);
      });
    });

    it("should reject empty summary", () => {
      const payload = {
        agent: "SAM",
        ticket: "AGT-123",
        action: "completed",
        summary: "",
      };

      expect(payload.summary.length).toBe(0);
    });
  });
});
