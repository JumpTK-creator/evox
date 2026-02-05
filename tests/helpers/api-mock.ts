/**
 * API testing utilities
 * Mocks for Next.js API routes and external services
 */
import { vi } from "vitest";

// Mock NextRequest
export function createMockRequest(options: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  url?: string;
} = {}) {
  const { method = "GET", body, headers = {}, url = "http://localhost:3000/api/test" } = options;

  return {
    method,
    url,
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    formData: vi.fn(),
  };
}

// Mock Convex HTTP client
export function createMockConvexClient() {
  return {
    query: vi.fn(),
    mutation: vi.fn(),
    action: vi.fn(),
  };
}

// Mock Linear client
export function createMockLinearClient() {
  return {
    issue: vi.fn().mockResolvedValue({
      id: "test-issue-id",
      identifier: "AGT-999",
      title: "Test Issue",
      state: { name: "Todo" },
    }),
    createComment: vi.fn().mockResolvedValue({ id: "comment-id" }),
    updateIssue: vi.fn().mockResolvedValue({ id: "test-issue-id" }),
    issues: vi.fn().mockResolvedValue({
      nodes: [],
    }),
  };
}

// Verify webhook signature helper
export function createGitHubWebhookPayload(event: string, payload: unknown) {
  const body = JSON.stringify(payload);
  const crypto = require("crypto");
  const secret = process.env.GITHUB_WEBHOOK_SECRET || "test-secret";
  const signature = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");

  return {
    body,
    headers: {
      "x-github-event": event,
      "x-hub-signature-256": signature,
      "content-type": "application/json",
    },
  };
}

// Mock fetch responses
export function mockFetchResponse(data: unknown, options: { status?: number; ok?: boolean } = {}) {
  const { status = 200, ok = true } = options;
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}
