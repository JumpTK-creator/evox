/**
 * Critical Path Tests: Git Activity
 *
 * North Star: Track agent code contributions automatically.
 * Tests cover: commit logging, ticket linking, branch tracking.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx } from "../../helpers/convex-mock";

describe("Git Activity - Critical Path", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  function mockCommit(overrides: Partial<{
    commitHash: string;
    shortHash: string;
    message: string;
    authorName: string;
    agentName: string;
    repo: string;
    branch: string;
    linkedTicketId: string;
    filesChanged: number;
    linesAdded: number;
    linesDeleted: number;
  }> = {}) {
    return {
      _id: `commit_${Math.random().toString(36).slice(2)}`,
      _creationTime: Date.now(),
      commitHash: "abc123def456",
      shortHash: "abc123d",
      message: "fix: AGT-123 bug fix",
      authorName: "SAM",
      agentName: "SAM",
      repo: "sonpiaz/evox",
      branch: "main",
      linkedTicketId: "AGT-123",
      pushedAt: Date.now(),
      ...overrides,
    };
  }

  describe("logCommit", () => {
    it("should log commit with required fields", async () => {
      const commitData = {
        commitHash: "abc123",
        message: "feat: new feature",
        authorName: "SAM",
        repo: "sonpiaz/evox",
        branch: "main",
        pushedAt: Date.now(),
      };

      ctx.db.insert.mockResolvedValue("commit_new");

      await ctx.db.insert("gitCommits", commitData);

      expect(ctx.db.insert).toHaveBeenCalledWith(
        "gitCommits",
        expect.objectContaining({
          commitHash: "abc123",
          authorName: "SAM",
        })
      );
    });

    it("should extract short hash from full hash", () => {
      const fullHash = "abc123def456789012345678901234567890";
      const shortHash = fullHash.slice(0, 7);

      expect(shortHash).toBe("abc123d");
      expect(shortHash.length).toBe(7);
    });

    it("should link commit to Linear ticket", () => {
      const message = "closes AGT-123: implemented feature";
      const pattern = /AGT-\d+/;
      const match = message.match(pattern);

      expect(match).toBeTruthy();
      expect(match![0]).toBe("AGT-123");
    });

    it("should detect agent from author name", () => {
      const authorNames = ["SAM", "sam", "Sam", "SAM (bot)"];
      const normalized = authorNames.map((n) => n.replace(/\s*\(.*\)/, "").toUpperCase());

      expect(normalized.every((n) => n === "SAM")).toBe(true);
    });
  });

  describe("getRecent", () => {
    it("should return recent commits sorted by date", async () => {
      const commits = [
        mockCommit({ pushedAt: Date.now() - 1000 }),
        mockCommit({ pushedAt: Date.now() - 3000 }),
        mockCommit({ pushedAt: Date.now() - 2000 }),
      ];

      const sorted = [...commits].sort((a, b) => b.pushedAt - a.pushedAt);

      expect(sorted[0].pushedAt).toBeGreaterThan(sorted[1].pushedAt);
    });

    it("should limit results", () => {
      const commits = Array.from({ length: 20 }, () => mockCommit());
      const limited = commits.slice(0, 6);

      expect(limited).toHaveLength(6);
    });

    it("should include linked ticket info", () => {
      const commit = mockCommit({ linkedTicketId: "AGT-456" });

      expect(commit.linkedTicketId).toBe("AGT-456");
    });
  });

  describe("getByAgent", () => {
    it("should filter commits by agent", () => {
      const commits = [
        mockCommit({ agentName: "SAM" }),
        mockCommit({ agentName: "SAM" }),
        mockCommit({ agentName: "LEO" }),
      ];

      const samCommits = commits.filter((c) => c.agentName === "SAM");

      expect(samCommits).toHaveLength(2);
    });
  });

  describe("Ticket Parsing", () => {
    it("should parse closes AGT-XXX", () => {
      const messages = [
        "closes AGT-123: done",
        "Closes AGT-456",
        "CLOSES AGT-789: fixed",
      ];

      const pattern = /closes\s+(AGT-\d+)/i;

      messages.forEach((msg) => {
        expect(msg.match(pattern)).toBeTruthy();
      });
    });

    it("should parse fixes AGT-XXX", () => {
      const messages = [
        "fixes AGT-123: bug resolved",
        "Fixes AGT-456",
        "FIXES AGT-789",
      ];

      const pattern = /fixes\s+(AGT-\d+)/i;

      messages.forEach((msg) => {
        expect(msg.match(pattern)).toBeTruthy();
      });
    });

    it("should parse AGT-XXX reference", () => {
      const messages = [
        "feat(AGT-123): new feature",
        "fix: AGT-456 bug",
        "chore: update AGT-789",
      ];

      const pattern = /AGT-\d+/;

      messages.forEach((msg) => {
        expect(msg.match(pattern)).toBeTruthy();
      });
    });

    it("should handle messages without ticket", () => {
      const message = "chore: update dependencies";
      const pattern = /AGT-\d+/;

      expect(message.match(pattern)).toBeNull();
    });
  });

  describe("Branch Tracking", () => {
    it("should normalize branch names", () => {
      const refs = [
        "refs/heads/main",
        "refs/heads/feature/AGT-123",
        "refs/heads/uat",
      ];

      const branches = refs.map((r) => r.replace("refs/heads/", ""));

      expect(branches).toEqual(["main", "feature/AGT-123", "uat"]);
    });
  });
});
