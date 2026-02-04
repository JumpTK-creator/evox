/**
 * AGT-249: Parallel Execution Helper
 *
 * Utility functions for agents to easily spawn parallel workers.
 * This is the high-level API that agents use to parallelize work.
 */

export interface SubTask {
  id: string;
  description: string;
  command: string;
  payload?: string;
  estimatedDuration?: number;
}

export interface ParallelPlanConfig {
  agent: string;
  taskId?: string;
  description: string;
  strategy: "by_files" | "by_components" | "by_operations" | "custom";
  subTasks: SubTask[];
  maxParallel?: number;
  timeout?: number;
}

export interface WorkerResult {
  workerId: string;
  status: "completed" | "failed";
  result?: string;
  error?: string;
  filesChanged?: string[];
  duration?: number;
}

export interface PlanProgress {
  planId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  completed: number;
  failed: number;
  total: number;
  duration?: number;
  workers?: WorkerResult[];
}

/**
 * Example: Parallel file processing
 *
 * ```typescript
 * const plan = await parallelizeFileOperation({
 *   agent: "sam",
 *   taskId: "AGT-249",
 *   description: "Lint 10 files in parallel",
 *   files: [
 *     "convex/schema.ts",
 *     "convex/dispatches.ts",
 *     // ... 8 more files
 *   ],
 *   operation: "lint",
 *   maxParallel: 5,
 * });
 * ```
 */
export async function parallelizeFileOperation(config: {
  agent: string;
  taskId?: string;
  description: string;
  files: string[];
  operation: "lint" | "format" | "test" | "refactor" | "migrate";
  maxParallel?: number;
  timeout?: number;
}) {
  const subTasks: SubTask[] = config.files.map((file, index) => ({
    id: `file-${index}`,
    description: `${config.operation} ${file}`,
    command: config.operation,
    payload: JSON.stringify({ file }),
    estimatedDuration: 2, // 2 minutes per file
  }));

  return {
    agent: config.agent,
    taskId: config.taskId,
    description: config.description,
    strategy: "by_files" as const,
    subTasks,
    maxParallel: config.maxParallel ?? 5,
    timeout: config.timeout ?? 30,
  };
}

/**
 * Example: Parallel component updates
 *
 * ```typescript
 * const plan = await parallelizeComponentWork({
 *   agent: "leo",
 *   taskId: "AGT-250",
 *   description: "Update theme across 5 components",
 *   components: [
 *     { name: "Navbar", file: "components/Navbar.tsx" },
 *     { name: "Footer", file: "components/Footer.tsx" },
 *     // ... more components
 *   ],
 *   operation: "update_theme",
 * });
 * ```
 */
export async function parallelizeComponentWork(config: {
  agent: string;
  taskId?: string;
  description: string;
  components: Array<{ name: string; file: string }>;
  operation: string;
  maxParallel?: number;
}) {
  const subTasks: SubTask[] = config.components.map((component, index) => ({
    id: `component-${index}`,
    description: `${config.operation} on ${component.name}`,
    command: config.operation,
    payload: JSON.stringify(component),
    estimatedDuration: 5,
  }));

  return {
    agent: config.agent,
    taskId: config.taskId,
    description: config.description,
    strategy: "by_components" as const,
    subTasks,
    maxParallel: config.maxParallel ?? 3,
    timeout: 45,
  };
}

/**
 * Example: Parallel operation pipeline
 *
 * ```typescript
 * const plan = await parallelizeOperations({
 *   agent: "quinn",
 *   taskId: "AGT-251",
 *   description: "Run lint, test, and build in parallel",
 *   operations: [
 *     { name: "lint", command: "npm run lint" },
 *     { name: "test", command: "npm run test" },
 *     { name: "build", command: "npm run build" },
 *   ],
 * });
 * ```
 */
export async function parallelizeOperations(config: {
  agent: string;
  taskId?: string;
  description: string;
  operations: Array<{ name: string; command: string }>;
}) {
  const subTasks: SubTask[] = config.operations.map((op, index) => ({
    id: `op-${index}`,
    description: op.name,
    command: op.command,
    estimatedDuration: 10,
  }));

  return {
    agent: config.agent,
    taskId: config.taskId,
    description: config.description,
    strategy: "by_operations" as const,
    subTasks,
    maxParallel: config.operations.length, // All ops in parallel
    timeout: 60,
  };
}

/**
 * Custom parallel plan builder.
 */
export function createCustomPlan(config: ParallelPlanConfig) {
  return config;
}

/**
 * Parse aggregated results from a completed plan.
 */
export function parseResults(aggregatedResults: string): WorkerResult[] {
  try {
    return JSON.parse(aggregatedResults);
  } catch {
    return [];
  }
}

/**
 * Check if plan succeeded (all workers completed successfully).
 */
export function isPlanSuccess(plan: PlanProgress): boolean {
  return plan.status === "completed" && plan.failed === 0;
}

/**
 * Get failed workers from plan results.
 */
export function getFailedWorkers(workers: WorkerResult[]): WorkerResult[] {
  return workers.filter((w) => w.status === "failed");
}

/**
 * Get completed workers from plan results.
 */
export function getCompletedWorkers(workers: WorkerResult[]): WorkerResult[] {
  return workers.filter((w) => w.status === "completed");
}

/**
 * Calculate total time saved by parallelization.
 * Compares sequential execution time vs parallel execution time.
 */
export function calculateTimeSaved(workers: WorkerResult[]): {
  sequentialTime: number;
  parallelTime: number;
  timeSaved: number;
  efficiency: number;
} {
  const durations = workers
    .filter((w) => w.duration)
    .map((w) => w.duration ?? 0);

  const sequentialTime = durations.reduce((sum, d) => sum + d, 0);
  const parallelTime = Math.max(...durations, 0);
  const timeSaved = sequentialTime - parallelTime;
  const efficiency = sequentialTime > 0 ? (timeSaved / sequentialTime) * 100 : 0;

  return {
    sequentialTime,
    parallelTime,
    timeSaved,
    efficiency,
  };
}
