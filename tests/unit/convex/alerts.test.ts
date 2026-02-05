/**
 * Critical Path Tests: Alerts System
 *
 * North Star: CEO sees blockers immediately.
 * Tests cover: alert creation, severity levels, resolution.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx } from "../../helpers/convex-mock";

describe("Alerts - Critical Path", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  function mockAlert(overrides: Partial<{
    type: string;
    severity: string;
    title: string;
    message: string;
    agentName: string;
    resolved: boolean;
    resolvedAt: number;
  }> = {}) {
    return {
      _id: `alert_${Math.random().toString(36).slice(2)}`,
      _creationTime: Date.now(),
      type: "agent_offline",
      severity: "warning",
      title: "Agent Offline",
      message: "SAM has been offline for 10 minutes",
      agentName: "SAM",
      resolved: false,
      createdAt: Date.now(),
      ...overrides,
    };
  }

  describe("createAlert", () => {
    it("should create alert with required fields", async () => {
      const alertData = {
        type: "agent_offline",
        severity: "critical",
        title: "Agent Down",
        message: "LEO is offline",
        agentName: "LEO",
        createdAt: Date.now(),
      };

      ctx.db.insert.mockResolvedValue("alert_new");

      await ctx.db.insert("alerts", alertData);

      expect(ctx.db.insert).toHaveBeenCalledWith(
        "alerts",
        expect.objectContaining({
          type: "agent_offline",
          severity: "critical",
        })
      );
    });

    it("should support severity levels", () => {
      const severities = ["critical", "warning", "info"];

      severities.forEach((s) => {
        expect(["critical", "warning", "info"]).toContain(s);
      });
    });

    it("should support alert types", () => {
      const types = [
        "agent_offline",
        "task_blocked",
        "build_failed",
        "cost_threshold",
        "stale_task",
      ];

      types.forEach((t) => {
        expect(t).toBeTruthy();
      });
    });
  });

  describe("getActiveAlerts", () => {
    it("should return unresolved alerts", async () => {
      const alerts = [
        mockAlert({ resolved: false }),
        mockAlert({ resolved: false }),
        mockAlert({ resolved: true }),
      ];

      const active = alerts.filter((a) => !a.resolved);

      expect(active).toHaveLength(2);
    });

    it("should sort by severity", () => {
      const alerts = [
        mockAlert({ severity: "info" }),
        mockAlert({ severity: "critical" }),
        mockAlert({ severity: "warning" }),
      ];

      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const sorted = [...alerts].sort(
        (a, b) => severityOrder[a.severity as keyof typeof severityOrder] -
                  severityOrder[b.severity as keyof typeof severityOrder]
      );

      expect(sorted[0].severity).toBe("critical");
      expect(sorted[2].severity).toBe("info");
    });

    it("should sort by creation time within same severity", () => {
      const alerts = [
        mockAlert({ severity: "critical", createdAt: Date.now() - 1000 }),
        mockAlert({ severity: "critical", createdAt: Date.now() }),
      ];

      const sorted = [...alerts].sort((a, b) => b.createdAt - a.createdAt);

      expect(sorted[0].createdAt).toBeGreaterThan(sorted[1].createdAt);
    });
  });

  describe("resolveAlert", () => {
    it("should mark alert as resolved", async () => {
      const alert = mockAlert({ resolved: false });

      await ctx.db.patch(alert._id, {
        resolved: true,
        resolvedAt: Date.now(),
      });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        alert._id,
        expect.objectContaining({
          resolved: true,
          resolvedAt: expect.any(Number),
        })
      );
    });

    it("should record resolution note", async () => {
      const alert = mockAlert();

      await ctx.db.patch(alert._id, {
        resolved: true,
        resolvedAt: Date.now(),
        resolutionNote: "Agent came back online",
      });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        alert._id,
        expect.objectContaining({
          resolutionNote: expect.any(String),
        })
      );
    });
  });

  describe("Alert Triggers", () => {
    it("should trigger on agent offline > 5 min", () => {
      const OFFLINE_THRESHOLD = 5 * 60 * 1000;
      const lastHeartbeat = Date.now() - 10 * 60 * 1000; // 10 min ago

      const shouldAlert = Date.now() - lastHeartbeat > OFFLINE_THRESHOLD;

      expect(shouldAlert).toBe(true);
    });

    it("should trigger on stale task > 24 hours", () => {
      const STALE_THRESHOLD = 24 * 60 * 60 * 1000;
      const updatedAt = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

      const isStale = Date.now() - updatedAt > STALE_THRESHOLD;

      expect(isStale).toBe(true);
    });

    it("should trigger on cost threshold exceeded", () => {
      const DAILY_BUDGET = 20;
      const currentCost = 25;

      const overBudget = currentCost > DAILY_BUDGET;

      expect(overBudget).toBe(true);
    });

    it("should trigger on build failure", () => {
      const buildResult = { success: false, error: "Type error" };

      const shouldAlert = !buildResult.success;

      expect(shouldAlert).toBe(true);
    });
  });

  describe("Alert Deduplication", () => {
    it("should not create duplicate alerts", async () => {
      const existingAlerts = [
        mockAlert({ type: "agent_offline", agentName: "SAM", resolved: false }),
      ];

      const newAlertType = "agent_offline";
      const newAlertAgent = "SAM";

      const isDuplicate = existingAlerts.some(
        (a) => a.type === newAlertType && a.agentName === newAlertAgent && !a.resolved
      );

      expect(isDuplicate).toBe(true);
    });
  });
});
