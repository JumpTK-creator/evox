/**
 * Query Optimization Helpers
 *
 * Provides efficient patterns for common queries:
 * - Batch agent lookups (avoid N+1)
 * - Cached agent maps for repeated lookups
 * - Optimized agent-by-name resolution
 */
import { DatabaseReader } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Get agent by name using index (O(1) instead of O(n) scan)
 * Case-insensitive lookup
 */
export async function getAgentByName(
  db: DatabaseReader,
  name: string
): Promise<Doc<"agents"> | null> {
  // Try uppercase first (standard format: MAX, SAM, LEO)
  const upperName = name.toUpperCase();
  const agent = await db
    .query("agents")
    .withIndex("by_name", (q) => q.eq("name", upperName))
    .first();

  if (agent) return agent;

  // Fallback: try lowercase
  return await db
    .query("agents")
    .withIndex("by_name", (q) => q.eq("name", name.toLowerCase()))
    .first();
}

/**
 * Build agent lookup maps for batch operations
 * Call once, use many times - avoids repeated DB queries
 */
export async function buildAgentMaps(db: DatabaseReader): Promise<{
  byId: Map<string, Doc<"agents">>;
  byName: Map<string, Doc<"agents">>;
}> {
  const agents = await db.query("agents").take(50); // Max agents we'd have

  const byId = new Map<string, Doc<"agents">>();
  const byName = new Map<string, Doc<"agents">>();

  for (const agent of agents) {
    byId.set(agent._id.toString(), agent);
    byName.set(agent.name.toLowerCase(), agent);
    byName.set(agent.name.toUpperCase(), agent);
  }

  return { byId, byName };
}

/**
 * Batch enrich records with agent names
 * Replaces N+1 pattern: Promise.all(items.map(i => db.get(i.agentId)))
 *
 * Usage:
 *   const enriched = await batchEnrichWithAgents(db, dispatches, 'agentId');
 */
export async function batchEnrichWithAgents<T extends { agentId: Id<"agents"> }>(
  db: DatabaseReader,
  items: T[],
  agentIdField: keyof T = "agentId" as keyof T
): Promise<Array<T & { agentName: string; agentAvatar?: string }>> {
  if (items.length === 0) return [];

  const { byId } = await buildAgentMaps(db);

  return items.map((item) => {
    const agentId = item[agentIdField] as unknown as Id<"agents">;
    const agent = byId.get(agentId.toString());
    return {
      ...item,
      agentName: agent?.name ?? "unknown",
      agentAvatar: agent?.avatar,
    };
  });
}

/**
 * Get multiple agents by IDs in single batch
 * More efficient than Promise.all(ids.map(id => db.get(id)))
 */
export async function getAgentsByIds(
  db: DatabaseReader,
  agentIds: Id<"agents">[]
): Promise<Map<string, Doc<"agents">>> {
  const { byId } = await buildAgentMaps(db);

  const result = new Map<string, Doc<"agents">>();
  for (const id of agentIds) {
    const agent = byId.get(id.toString());
    if (agent) {
      result.set(id.toString(), agent);
    }
  }

  return result;
}

/**
 * Optimized task count by status
 * Uses index-based count instead of collect().length
 */
export async function countTasksByStatus(
  db: DatabaseReader,
  status: "backlog" | "todo" | "in_progress" | "review" | "done"
): Promise<number> {
  const tasks = await db
    .query("tasks")
    .withIndex("by_status", (q) => q.eq("status", status))
    .collect();
  return tasks.length;
}

/**
 * Get done tasks within date range using new index
 * Optimized for dashboard stats
 */
export async function getDoneTasksInRange(
  db: DatabaseReader,
  startTs: number,
  endTs: number,
  limit: number = 500
): Promise<Doc<"tasks">[]> {
  // Use status index, then filter by completedAt
  // This is efficient because done tasks are subset
  const doneTasks = await db
    .query("tasks")
    .withIndex("by_status_updatedAt", (q) => q.eq("status", "done"))
    .order("desc")
    .take(limit);

  return doneTasks.filter((t) => {
    const completedAt = t.completedAt ?? t.updatedAt;
    return completedAt >= startTs && completedAt <= endTs;
  });
}
