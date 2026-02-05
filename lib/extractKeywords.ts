/**
 * AGT-XXX: Extract keywords from agent message content
 * Used for agent communication visualization with keywords + summaries
 */

export interface ExtractedKeywords {
  ticketIds: string[];
  actions: string[];
  components: string[];
  all: string[];
}

// Action keywords to detect
const ACTION_PATTERNS: Record<string, RegExp> = {
  review: /\b(review(?:ing|ed)?|QA|check(?:ing|ed)?)\b/i,
  fix: /\b(fix(?:ing|ed)?|bug(?:fix)?|patch(?:ing|ed)?)\b/i,
  deploy: /\b(deploy(?:ing|ed)?|push(?:ing|ed)?|release)\b/i,
  test: /\b(test(?:ing|ed)?|testing)\b/i,
  build: /\b(build(?:ing)?|compile|bundl(?:e|ing))\b/i,
  blocked: /\b(block(?:ed|er)?|stuck|waiting)\b/i,
  complete: /\b(done|complete(?:d)?|finish(?:ed)?|shipped)\b/i,
  create: /\b(creat(?:e|ing|ed)|add(?:ed|ing)?|implement(?:ing|ed)?)\b/i,
  update: /\b(updat(?:e|ing|ed)|chang(?:e|ing|ed)|modif(?:y|ied))\b/i,
  assign: /\b(assign(?:ed|ing)?|handoff|delegat(?:e|ed|ing))\b/i,
};

// Component/area keywords
const COMPONENT_PATTERNS: Record<string, RegExp> = {
  backend: /\b(backend|api|server|convex|database|db)\b/i,
  frontend: /\b(frontend|ui|component|react|css|style)\b/i,
  auth: /\b(auth(?:entication)?|login|session|token)\b/i,
  dashboard: /\b(dashboard|metrics|widget|chart)\b/i,
  agent: /\b(agent|bot|automation)\b/i,
  webhook: /\b(webhook|hook|trigger)\b/i,
  git: /\b(git|commit|branch|merge|pr|pull.?request)\b/i,
};

// Ticket ID pattern (AGT-XXX, TASK-XXX, etc.)
const TICKET_PATTERN = /\b(AGT|TASK|BUG|FEAT)-\d+\b/gi;

/**
 * Extract keywords from message content
 */
export function extractKeywords(content: string): ExtractedKeywords {
  const ticketIds: string[] = [];
  const actions: string[] = [];
  const components: string[] = [];

  // Extract ticket IDs
  const ticketMatches = content.match(TICKET_PATTERN);
  if (ticketMatches) {
    ticketIds.push(...[...new Set(ticketMatches.map(t => t.toUpperCase()))]);
  }

  // Extract actions
  for (const [action, pattern] of Object.entries(ACTION_PATTERNS)) {
    if (pattern.test(content)) {
      actions.push(action);
    }
  }

  // Extract components
  for (const [component, pattern] of Object.entries(COMPONENT_PATTERNS)) {
    if (pattern.test(content)) {
      components.push(component);
    }
  }

  // Combine all unique keywords
  const all = [...new Set([...ticketIds, ...actions, ...components])];

  return { ticketIds, actions, components, all };
}

/**
 * Generate a short summary from message content
 * Returns a 3-5 word summary of what the agent is doing
 */
export function generateSummary(content: string): string {
  const lower = content.toLowerCase();

  // Pattern-based summaries
  if (/complete(?:d)?|done|finish(?:ed)?|shipped/i.test(content)) {
    const ticket = content.match(TICKET_PATTERN)?.[0];
    return ticket ? `Done: ${ticket}` : "Task completed";
  }

  if (/block(?:ed)?|stuck|waiting/i.test(content)) {
    const reason = content.match(/block(?:ed)?\s+(?:on|by)\s+(\w+)/i)?.[1];
    return reason ? `Blocked: ${reason}` : "Blocked on task";
  }

  if (/review(?:ing)?|QA/i.test(content)) {
    const ticket = content.match(TICKET_PATTERN)?.[0];
    return ticket ? `Reviewing ${ticket}` : "Code review";
  }

  if (/fix(?:ing)?|bug/i.test(content)) {
    const ticket = content.match(TICKET_PATTERN)?.[0];
    return ticket ? `Fixing ${ticket}` : "Fixing bug";
  }

  if (/deploy(?:ing)?|push(?:ing)?/i.test(content)) {
    return "Deploying changes";
  }

  if (/work(?:ing)?\s+on/i.test(content)) {
    const ticket = content.match(TICKET_PATTERN)?.[0];
    return ticket ? `Working on ${ticket}` : "Working on task";
  }

  if (/creat(?:e|ing)|add(?:ing)?|implement/i.test(content)) {
    const ticket = content.match(TICKET_PATTERN)?.[0];
    return ticket ? `Building ${ticket}` : "Creating feature";
  }

  if (/assign(?:ed)?/i.test(content)) {
    return "Assigning task";
  }

  if (/test(?:ing)?/i.test(content)) {
    return "Running tests";
  }

  // Fallback: first few words truncated
  const words = content.split(/\s+/).slice(0, 4);
  const summary = words.join(" ");
  return summary.length > 25 ? summary.slice(0, 22) + "..." : summary;
}

/**
 * Format keywords as hashtags for display
 */
export function formatAsHashtags(keywords: string[], limit = 4): string[] {
  return keywords.slice(0, limit).map(k => `#${k}`);
}
