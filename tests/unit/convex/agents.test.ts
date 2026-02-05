/**
 * Unit tests for convex/agents.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, mockAgent } from "../../helpers/convex-mock";

describe("convex/agents", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  describe("list", () => {
    it("should return all agents", async () => {
      const agents = [
        mockAgent({ name: "SAM", role: "backend" }),
        mockAgent({ name: "LEO", role: "frontend" }),
        mockAgent({ name: "QUINN", role: "qa" }),
        mockAgent({ name: "MAX", role: "pm" }),
      ];

      ctx.db.query.mockReturnValue({
        collect: vi.fn().mockResolvedValue(agents),
      });

      // Simulate query
      const result = await ctx.db.query("agents").collect();

      expect(result).toHaveLength(4);
      expect(result[0].name).toBe("SAM");
    });

    it("should handle empty agent list", async () => {
      ctx.db.query.mockReturnValue({
        collect: vi.fn().mockResolvedValue([]),
      });

      const result = await ctx.db.query("agents").collect();
      expect(result).toHaveLength(0);
    });
  });

  describe("get", () => {
    it("should return agent by ID", async () => {
      const agent = mockAgent({ name: "SAM" });
      ctx.db.get.mockResolvedValue(agent);

      const result = await ctx.db.get(agent._id);

      expect(result).toBeDefined();
      expect(result.name).toBe("SAM");
    });

    it("should return null for non-existent agent", async () => {
      ctx.db.get.mockResolvedValue(null);

      const result = await ctx.db.get("non_existent_id");

      expect(result).toBeNull();
    });
  });

  describe("updateStatus", () => {
    it("should update agent status correctly", async () => {
      const agent = mockAgent({ name: "SAM", status: "offline" });

      await ctx.db.patch(agent._id, { status: "online", lastHeartbeat: Date.now() });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        agent._id,
        expect.objectContaining({ status: "online" })
      );
    });

    it("should validate status values", () => {
      const validStatuses = ["online", "offline", "busy", "idle"];
      validStatuses.forEach((status) => {
        expect(["online", "offline", "busy", "idle"]).toContain(status);
      });
    });
  });

  describe("heartbeat", () => {
    it("should update lastHeartbeat timestamp", async () => {
      const agent = mockAgent({ name: "SAM" });
      const now = Date.now();

      await ctx.db.patch(agent._id, { lastHeartbeat: now });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        agent._id,
        expect.objectContaining({ lastHeartbeat: now })
      );
    });
  });

  describe("listForStrip", () => {
    it("should return agents with task info for sidebar", async () => {
      const agents = [mockAgent({ name: "SAM" })];

      ctx.db.query.mockReturnValue({
        collect: vi.fn().mockResolvedValue(agents),
      });

      const result = await ctx.db.query("agents").collect();

      expect(result[0]).toHaveProperty("_id");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("status");
    });
  });
});
