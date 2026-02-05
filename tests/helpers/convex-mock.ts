/**
 * Convex testing utilities
 * Provides mocks for Convex queries, mutations, and actions
 */
import { vi } from "vitest";

// Mock Convex context
export function createMockCtx() {
  return {
    db: {
      get: vi.fn(),
      query: vi.fn(() => ({
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        first: vi.fn(),
        collect: vi.fn().mockResolvedValue([]),
        take: vi.fn().mockResolvedValue([]),
        withIndex: vi.fn().mockReturnThis(),
      })),
      insert: vi.fn().mockResolvedValue("mock_id"),
      patch: vi.fn(),
      delete: vi.fn(),
      replace: vi.fn(),
    },
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue(null),
    },
    scheduler: {
      runAfter: vi.fn(),
      runAt: vi.fn(),
    },
    storage: {
      getUrl: vi.fn(),
      store: vi.fn(),
    },
  };
}

// Mock action context with fetch
export function createMockActionCtx() {
  return {
    ...createMockCtx(),
    runQuery: vi.fn(),
    runMutation: vi.fn(),
    runAction: vi.fn(),
  };
}

// Helper to create mock documents
export function mockDoc<T extends Record<string, unknown>>(
  table: string,
  data: Partial<T>
): T & { _id: string; _creationTime: number } {
  return {
    _id: `${table}_${Math.random().toString(36).slice(2)}`,
    _creationTime: Date.now(),
    ...data,
  } as T & { _id: string; _creationTime: number };
}

// Mock agent document
export function mockAgent(overrides: Partial<{
  name: string;
  role: string;
  status: string;
  avatar: string;
}> = {}) {
  return mockDoc("agents", {
    name: "SAM",
    role: "backend",
    status: "online",
    avatar: "🤖",
    lastHeartbeat: Date.now(),
    ...overrides,
  });
}

// Mock task document
export function mockTask(overrides: Partial<{
  title: string;
  status: string;
  agentName: string;
  linearIdentifier: string;
}> = {}) {
  return mockDoc("tasks", {
    title: "Test Task",
    status: "todo",
    agentName: "SAM",
    linearIdentifier: "AGT-999",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });
}

// Mock message document
export function mockMessage(overrides: Partial<{
  fromAgent: string;
  toAgent: string;
  content: string;
  type: string;
}> = {}) {
  return mockDoc("messages", {
    fromAgent: "sam",
    toAgent: "leo",
    content: "Test message",
    type: "dm",
    createdAt: Date.now(),
    read: false,
    ...overrides,
  });
}
