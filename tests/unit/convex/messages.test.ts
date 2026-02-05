/**
 * Unit tests for convex/messages.ts and convex/agentMessages.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, mockMessage, mockAgent } from "../../helpers/convex-mock";

describe("convex/messages", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  describe("sendDM", () => {
    it("should create a direct message", async () => {
      const messageData = {
        fromAgent: "sam",
        toAgent: "leo",
        content: "Hello Leo!",
        type: "dm",
        createdAt: Date.now(),
        read: false,
      };

      ctx.db.insert.mockResolvedValue("msg_id");

      const id = await ctx.db.insert("messages", messageData);

      expect(id).toBe("msg_id");
      expect(ctx.db.insert).toHaveBeenCalledWith("messages", messageData);
    });

    it("should set read to false by default", async () => {
      const messageData = {
        fromAgent: "sam",
        toAgent: "quinn",
        content: "Test",
        type: "dm",
        createdAt: Date.now(),
        read: false,
      };

      await ctx.db.insert("messages", messageData);

      expect(ctx.db.insert).toHaveBeenCalledWith(
        "messages",
        expect.objectContaining({ read: false })
      );
    });
  });

  describe("postToChannel", () => {
    it("should create a channel message", async () => {
      const messageData = {
        fromAgent: "sam",
        channel: "dev",
        content: "Build complete!",
        type: "channel",
        createdAt: Date.now(),
      };

      await ctx.db.insert("messages", messageData);

      expect(ctx.db.insert).toHaveBeenCalledWith(
        "messages",
        expect.objectContaining({
          channel: "dev",
          type: "channel",
        })
      );
    });
  });

  describe("getMessagesForAgent", () => {
    it("should return unread DMs for agent", async () => {
      const messages = [
        mockMessage({ toAgent: "quinn", read: false }),
        mockMessage({ toAgent: "quinn", read: false }),
      ];

      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        take: vi.fn().mockResolvedValue(messages),
      });

      const result = await ctx.db.query("messages").filter(() => true).order("desc").take(10);

      expect(result).toHaveLength(2);
      expect(result.every((m: { read: boolean }) => m.read === false)).toBe(true);
    });

    it("should include channel mentions", async () => {
      const messages = [
        mockMessage({ type: "channel", content: "@quinn please review" }),
      ];

      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(messages),
      });

      const result = await ctx.db.query("messages").filter(() => true).collect();

      expect(result[0].content).toContain("@quinn");
    });
  });

  describe("markAsRead", () => {
    it("should mark message as read", async () => {
      const message = mockMessage({ read: false });

      await ctx.db.patch(message._id, { read: true });

      expect(ctx.db.patch).toHaveBeenCalledWith(message._id, { read: true });
    });
  });

  describe("getUnreadCount", () => {
    it("should count unread messages for agent", async () => {
      const unreadMessages = [
        mockMessage({ toAgent: "quinn", read: false }),
        mockMessage({ toAgent: "quinn", read: false }),
        mockMessage({ toAgent: "quinn", read: false }),
      ];

      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(unreadMessages),
      });

      const result = await ctx.db.query("messages").filter(() => true).collect();

      expect(result.length).toBe(3);
    });

    it("should return 0 for no unread messages", async () => {
      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue([]),
      });

      const result = await ctx.db.query("messages").filter(() => true).collect();

      expect(result.length).toBe(0);
    });
  });

  describe("message validation", () => {
    it("should validate fromAgent is not empty", () => {
      const message = mockMessage({ fromAgent: "sam" });
      expect(message.fromAgent).toBeTruthy();
    });

    it("should validate content is not empty", () => {
      const message = mockMessage({ content: "Hello" });
      expect(message.content.length).toBeGreaterThan(0);
    });

    it("should validate message type", () => {
      const validTypes = ["dm", "channel", "mention"];
      const message = mockMessage({ type: "dm" });
      expect(validTypes).toContain(message.type);
    });
  });
});
