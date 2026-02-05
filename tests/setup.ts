/**
 * Global test setup for Vitest
 */
import { beforeAll, afterAll, afterEach, vi } from "vitest";

// Mock environment variables
process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
process.env.LINEAR_API_KEY = "test-linear-key";
process.env.GITHUB_WEBHOOK_SECRET = "test-github-secret";

// Global mocks
beforeAll(() => {
  // Mock fetch for API tests
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// Custom matchers
expect.extend({
  toBeValidId(received: string) {
    const pass = typeof received === "string" && received.length > 0;
    return {
      pass,
      message: () => `expected ${received} to be a valid ID`,
    };
  },
});
