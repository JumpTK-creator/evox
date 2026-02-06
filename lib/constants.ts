/**
 * Shared constants — Single Source of Truth (CLAUDE.md Rule 3)
 *
 * NEVER hardcode agent lists in individual files.
 * Import from here instead.
 */

/** Agent display order: MAX → SAM → LEO → QUINN */
export const AGENT_ORDER = ["max", "sam", "leo", "quinn"] as const;

/** Sort a list of objects with a `name` field by AGENT_ORDER */
export function sortAgents<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const i = AGENT_ORDER.indexOf(a.name.toLowerCase() as (typeof AGENT_ORDER)[number]);
    const j = AGENT_ORDER.indexOf(b.name.toLowerCase() as (typeof AGENT_ORDER)[number]);
    if (i === -1 && j === -1) return a.name.localeCompare(b.name);
    if (i === -1) return 1;
    if (j === -1) return -1;
    return i - j;
  });
}

/** Role display labels */
export const ROLE_LABELS: Record<string, string> = {
  pm: "PM",
  backend: "Backend",
  frontend: "Frontend",
  qa: "QA",
  design: "Design",
};
