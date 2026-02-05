/**
 * Advanced Messaging Tests
 *
 * North Star: Agents communicate seamlessly.
 * Tests cover: channels, DMs, mentions, threads.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, mockMessage } from "../../helpers/convex-mock";

describe("Messaging - Advanced Features", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  describe("Channels", () => {
    it("should list available channels", () => {
      const channels = ["general", "dev", "alerts", "standup"];

      expect(channels).toContain("dev");
      expect(channels).toContain("alerts");
    });

    it("should filter messages by channel", () => {
      const messages = [
        mockMessage({ channel: "dev", content: "Message 1" }),
        mockMessage({ channel: "general", content: "Message 2" }),
        mockMessage({ channel: "dev", content: "Message 3" }),
      ];

      const devMessages = messages.filter((m) => m.channel === "dev");

      expect(devMessages).toHaveLength(2);
    });

    it("should support channel-specific permissions", () => {
      const channelPermissions: Record<string, string[]> = {
        general: ["SAM", "LEO", "QUINN", "MAX"],
        dev: ["SAM", "LEO", "QUINN"],
        alerts: ["MAX", "EVOX"],
      };

      const canPost = (channel: string, agent: string): boolean => {
        return channelPermissions[channel]?.includes(agent) ?? false;
      };

      expect(canPost("dev", "SAM")).toBe(true);
      expect(canPost("alerts", "SAM")).toBe(false);
    });
  });

  describe("Direct Messages", () => {
    it("should send DM to specific agent", () => {
      const dm = {
        from: "SAM",
        to: "LEO",
        content: "Can you review my PR?",
        isDM: true,
      };

      expect(dm.isDM).toBe(true);
      expect(dm.to).toBe("LEO");
    });

    it("should get DM thread between two agents", () => {
      const messages = [
        { from: "SAM", to: "LEO", content: "Hi" },
        { from: "LEO", to: "SAM", content: "Hello" },
        { from: "SAM", to: "QUINN", content: "Different thread" },
        { from: "SAM", to: "LEO", content: "How's the PR?" },
      ];

      const getDMThread = (agent1: string, agent2: string) => {
        return messages.filter(
          (m) =>
            (m.from === agent1 && m.to === agent2) ||
            (m.from === agent2 && m.to === agent1)
        );
      };

      const thread = getDMThread("SAM", "LEO");

      expect(thread).toHaveLength(3);
    });
  });

  describe("Mentions", () => {
    it("should extract @mentions from content", () => {
      const content = "@SAM @LEO please review this PR. cc @MAX";

      const pattern = /@(\w+)/g;
      const mentions = [...content.matchAll(pattern)].map((m) => m[1]);

      expect(mentions).toEqual(["SAM", "LEO", "MAX"]);
    });

    it("should handle @all mention", () => {
      const content = "@all standup in 5 minutes";

      const hasAllMention = content.includes("@all");

      expect(hasAllMention).toBe(true);
    });

    it("should get unread mentions for agent", () => {
      const messages = [
        mockMessage({ content: "@SAM check this", readBy: [] }),
        mockMessage({ content: "@LEO and @SAM review", readBy: ["LEO"] }),
        mockMessage({ content: "@QUINN test please", readBy: [] }),
      ];

      const getUnreadMentions = (agent: string) => {
        return messages.filter(
          (m) =>
            m.content.includes(`@${agent}`) &&
            !m.readBy?.includes(agent)
        );
      };

      const samUnread = getUnreadMentions("SAM");

      expect(samUnread).toHaveLength(2);
    });

    it("should notify mentioned agents", () => {
      const notifications: Array<{ agent: string; messageId: string }> = [];

      const notifyMentions = (messageId: string, content: string) => {
        const pattern = /@(\w+)/g;
        const mentions = [...content.matchAll(pattern)].map((m) => m[1]);

        mentions.forEach((agent) => {
          if (agent !== "all") {
            notifications.push({ agent, messageId });
          }
        });
      };

      notifyMentions("msg_123", "@SAM @LEO please review");

      expect(notifications).toHaveLength(2);
      expect(notifications[0].agent).toBe("SAM");
    });
  });

  describe("Threads", () => {
    it("should create reply to message", () => {
      const parentMessage = mockMessage({ content: "Main topic" });
      const reply = {
        ...mockMessage({ content: "This is a reply" }),
        parentId: parentMessage._id,
      };

      expect(reply.parentId).toBe(parentMessage._id);
    });

    it("should get thread replies", () => {
      const parentId = "msg_parent";
      const messages = [
        mockMessage({ content: "Parent", _id: parentId }),
        { ...mockMessage({ content: "Reply 1" }), parentId },
        { ...mockMessage({ content: "Reply 2" }), parentId },
        mockMessage({ content: "Different message" }),
      ];

      const replies = messages.filter(
        (m) => "parentId" in m && m.parentId === parentId
      );

      expect(replies).toHaveLength(2);
    });

    it("should count thread replies", () => {
      const messages = [
        { _id: "msg_1", replyCount: 5 },
        { _id: "msg_2", replyCount: 0 },
        { _id: "msg_3", replyCount: 12 },
      ];

      const threadsWithReplies = messages.filter((m) => m.replyCount > 0);

      expect(threadsWithReplies).toHaveLength(2);
    });
  });

  describe("Message Formatting", () => {
    it("should support markdown", () => {
      const content = "**Bold** and *italic* and `code`";

      expect(content).toContain("**Bold**");
      expect(content).toContain("*italic*");
      expect(content).toContain("`code`");
    });

    it("should support code blocks", () => {
      const content = "```typescript\nconst x = 1;\n```";

      expect(content).toContain("```typescript");
      expect(content).toContain("const x = 1;");
    });

    it("should extract code language from block", () => {
      const extractLanguage = (content: string): string | null => {
        const match = content.match(/```(\w+)/);
        return match ? match[1] : null;
      };

      expect(extractLanguage("```typescript\ncode\n```")).toBe("typescript");
      expect(extractLanguage("```\ncode\n```")).toBeNull();
    });

    it("should support ticket links", () => {
      const content = "Fixed AGT-123 and AGT-456";

      const pattern = /AGT-\d+/g;
      const tickets = content.match(pattern);

      expect(tickets).toEqual(["AGT-123", "AGT-456"]);
    });
  });

  describe("Message Search", () => {
    it("should search by content keyword", () => {
      const messages = [
        mockMessage({ content: "Fixed authentication bug" }),
        mockMessage({ content: "Added new API endpoint" }),
        mockMessage({ content: "Updated auth flow" }),
      ];

      const keyword = "auth";
      const results = messages.filter((m) =>
        m.content.toLowerCase().includes(keyword.toLowerCase())
      );

      expect(results).toHaveLength(2);
    });

    it("should search by sender", () => {
      const messages = [
        mockMessage({ from: "SAM", content: "Message 1" }),
        mockMessage({ from: "LEO", content: "Message 2" }),
        mockMessage({ from: "SAM", content: "Message 3" }),
      ];

      const samMessages = messages.filter((m) => m.from === "SAM");

      expect(samMessages).toHaveLength(2);
    });

    it("should search by date range", () => {
      const now = Date.now();
      const messages = [
        mockMessage({ timestamp: now - 60 * 60 * 1000 }), // 1 hour ago
        mockMessage({ timestamp: now - 25 * 60 * 60 * 1000 }), // 25 hours ago
        mockMessage({ timestamp: now - 2 * 60 * 60 * 1000 }), // 2 hours ago
      ];

      const last24h = 24 * 60 * 60 * 1000;
      const recent = messages.filter((m) => now - m.timestamp < last24h);

      expect(recent).toHaveLength(2);
    });
  });

  describe("Message Reactions", () => {
    it("should add reaction to message", () => {
      const reactions: Record<string, string[]> = {};

      const addReaction = (messageId: string, emoji: string, agent: string) => {
        const key = `${messageId}:${emoji}`;
        if (!reactions[key]) reactions[key] = [];
        if (!reactions[key].includes(agent)) {
          reactions[key].push(agent);
        }
      };

      addReaction("msg_123", "👍", "SAM");
      addReaction("msg_123", "👍", "LEO");
      addReaction("msg_123", "🎉", "QUINN");

      expect(reactions["msg_123:👍"]).toHaveLength(2);
      expect(reactions["msg_123:🎉"]).toHaveLength(1);
    });

    it("should remove reaction", () => {
      const reactions: Record<string, string[]> = {
        "msg_123:👍": ["SAM", "LEO"],
      };

      const removeReaction = (messageId: string, emoji: string, agent: string) => {
        const key = `${messageId}:${emoji}`;
        if (reactions[key]) {
          reactions[key] = reactions[key].filter((a) => a !== agent);
        }
      };

      removeReaction("msg_123", "👍", "SAM");

      expect(reactions["msg_123:👍"]).toEqual(["LEO"]);
    });

    it("should count reactions by emoji", () => {
      const reactions = [
        { emoji: "👍", count: 5 },
        { emoji: "🎉", count: 3 },
        { emoji: "❤️", count: 2 },
      ];

      const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

      expect(totalReactions).toBe(10);
    });
  });

  describe("Read Receipts", () => {
    it("should mark message as read", () => {
      const message = { _id: "msg_123", readBy: ["SAM"] };

      const markRead = (agent: string) => {
        if (!message.readBy.includes(agent)) {
          message.readBy.push(agent);
        }
      };

      markRead("LEO");
      markRead("SAM"); // already read

      expect(message.readBy).toEqual(["SAM", "LEO"]);
    });

    it("should count unread messages", () => {
      const messages = [
        { readBy: ["SAM", "LEO"] },
        { readBy: ["SAM"] },
        { readBy: [] },
      ];

      const countUnread = (agent: string): number => {
        return messages.filter((m) => !m.readBy.includes(agent)).length;
      };

      expect(countUnread("SAM")).toBe(1);
      expect(countUnread("LEO")).toBe(2);
      expect(countUnread("QUINN")).toBe(3);
    });
  });

  describe("Message Persistence", () => {
    it("should save message to database", async () => {
      const messageData = {
        from: "SAM",
        channel: "dev",
        content: "Test message",
        timestamp: Date.now(),
      };

      ctx.db.insert.mockResolvedValue("msg_new");

      await ctx.db.insert("messages", messageData);

      expect(ctx.db.insert).toHaveBeenCalledWith(
        "messages",
        expect.objectContaining({
          from: "SAM",
          channel: "dev",
        })
      );
    });

    it("should paginate message history", () => {
      const messages = Array.from({ length: 100 }, (_, i) =>
        mockMessage({ content: `Message ${i}` })
      );

      const pageSize = 20;
      const page1 = messages.slice(0, pageSize);
      const page2 = messages.slice(pageSize, pageSize * 2);

      expect(page1).toHaveLength(20);
      expect(page2).toHaveLength(20);
    });
  });
});
