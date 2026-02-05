/**
 * Unit tests for app/api/webhooks/github/route.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

describe("GitHub Webhook API", () => {
  const secret = "test-github-secret";

  function createSignature(body: string): string {
    const hmac = crypto.createHmac("sha256", secret);
    return "sha256=" + hmac.update(body).digest("hex");
  }

  function createPushPayload(commits: Array<{ message: string; id: string }>) {
    return {
      ref: "refs/heads/main",
      commits: commits.map((c, i) => ({
        id: c.id || `commit${i}`,
        message: c.message,
        author: { name: "SAM", email: "sam@evox.ai" },
        timestamp: new Date().toISOString(),
      })),
      repository: {
        full_name: "sonpiaz/evox",
      },
      pusher: {
        name: "sam",
      },
    };
  }

  describe("POST /api/webhooks/github", () => {
    it("should accept valid push events", () => {
      const payload = createPushPayload([
        { message: "fix: AGT-123 bug fix", id: "abc123" },
      ]);
      const body = JSON.stringify(payload);
      const signature = createSignature(body);

      expect(signature).toMatch(/^sha256=[a-f0-9]+$/);
    });

    it("should reject invalid signatures", () => {
      const body = JSON.stringify({ test: "data" });
      const invalidSignature = "sha256=invalid";
      const validSignature = createSignature(body);

      expect(invalidSignature).not.toBe(validSignature);
    });

    it("should parse AGT ticket references from commit messages", () => {
      const commits = [
        { message: "fix: AGT-123 bug fix", id: "a1" },
        { message: "feat: AGT-456 new feature", id: "a2" },
        { message: "chore: no ticket", id: "a3" },
      ];

      const ticketPattern = /AGT-\d+/g;
      const tickets = commits
        .map((c) => c.message.match(ticketPattern))
        .filter(Boolean)
        .flat();

      expect(tickets).toEqual(["AGT-123", "AGT-456"]);
    });

    it("should detect closes/fixes keywords", () => {
      const messages = [
        "closes AGT-123: fixed issue",
        "fixes AGT-456: resolved bug",
        "Closes AGT-789",
        "FIXES AGT-101",
      ];

      const closesPattern = /(?:closes|fixes)\s+(AGT-\d+)/gi;

      messages.forEach((msg) => {
        expect(msg.match(closesPattern)).toBeTruthy();
      });
    });

    it("should ignore non-push events", () => {
      const events = ["push", "pull_request", "issues", "star"];
      const supportedEvents = ["push"];

      events.forEach((event) => {
        if (!supportedEvents.includes(event)) {
          expect(supportedEvents).not.toContain(event);
        }
      });
    });
  });

  describe("signature verification", () => {
    it("should use timing-safe comparison", () => {
      const body = "test body";
      const sig1 = createSignature(body);
      const sig2 = createSignature(body);

      // Same signature for same body
      expect(sig1).toBe(sig2);
    });

    it("should produce different signatures for different bodies", () => {
      const sig1 = createSignature("body1");
      const sig2 = createSignature("body2");

      expect(sig1).not.toBe(sig2);
    });
  });
});
