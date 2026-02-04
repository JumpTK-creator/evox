import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// AGT-252: Agent Templates for Auto-Recruitment

/**
 * Agent templates define the "DNA" for spawning new agents.
 * Based on Genius DNA framework: von Neumann, Feynman, Musk, Shannon
 */

export const templates = {
  backend: {
    role: "backend",
    namePrefix: "SAM",
    basePrompt: `You are a backend engineer. Build the Convex database layer.
Territory: convex/, scripts/, lib/evox/
DO NOT touch: app/, components/`,
    skills: ["convex", "typescript", "api", "schema", "database"],
    territory: ["convex/", "scripts/", "lib/evox/"],
    geniusDNA: ["von_neumann", "shannon"], // Speed + Efficiency
  },
  frontend: {
    role: "frontend",
    namePrefix: "LEO",
    basePrompt: `You are a frontend engineer. Build the Next.js UI components.
Territory: app/, components/
DO NOT touch: convex/, scripts/`,
    skills: ["nextjs", "react", "tailwind", "typescript", "ui"],
    territory: ["app/", "components/"],
    geniusDNA: ["feynman", "musk"], // Simplicity + 10x thinking
  },
  qa: {
    role: "qa",
    namePrefix: "QUINN",
    basePrompt: `You are a QA engineer. Test code, find bugs, ensure quality.
Territory: *.test.ts, e2e/, code review
You CAN read all files to understand context.`,
    skills: ["testing", "playwright", "code-review", "bug-hunting"],
    territory: ["**/*.test.ts", "e2e/"],
    geniusDNA: ["von_neumann", "feynman"], // Precision + Clarity
  },
  pm: {
    role: "pm",
    namePrefix: "MAX",
    basePrompt: `You are a PM. Plan, dispatch, coordinate, track progress.
You do NOT write code. You manage the team.`,
    skills: ["planning", "linear", "coordination", "estimation"],
    territory: ["docs/", "DISPATCH.md"],
    geniusDNA: ["musk", "von_neumann"], // Ambition + Speed
  },
  devops: {
    role: "devops",
    namePrefix: "ALEX",
    basePrompt: `You are a DevOps engineer. CI/CD, deployment, infrastructure.
Territory: .github/, vercel.json, deployment configs`,
    skills: ["ci-cd", "docker", "vercel", "github-actions"],
    territory: [".github/", "vercel.json"],
    geniusDNA: ["shannon", "musk"], // Efficiency + Automation
  },
  content: {
    role: "content",
    namePrefix: "ELLA",
    basePrompt: `You are a content creator. Write posts, documentation, communications.
Territory: docs/, content/, social media`,
    skills: ["writing", "social-media", "storytelling", "documentation"],
    territory: ["docs/", "content/"],
    geniusDNA: ["feynman", "shannon"], // Clarity + Signal
  },
};

// Get template by role
export const getTemplate = query({
  args: { role: v.string() },
  handler: async (_, { role }) => {
    return templates[role as keyof typeof templates] || null;
  },
});

// List all templates
export const listTemplates = query({
  handler: async () => {
    return Object.entries(templates).map(([key, value]) => ({
      id: key,
      ...value,
    }));
  },
});

// Generate next agent name for a role
export const generateAgentName = query({
  args: { role: v.string() },
  handler: async (ctx, { role }) => {
    const template = templates[role as keyof typeof templates];
    if (!template) return null;

    // Count existing agents with this prefix
    const existingAgents = await ctx.db
      .query("agents")
      .filter((q) =>
        q.or(
          q.eq(q.field("name"), template.namePrefix),
          q.eq(q.field("name"), `${template.namePrefix}-2`),
          q.eq(q.field("name"), `${template.namePrefix}-3`),
          q.eq(q.field("name"), `${template.namePrefix}-4`),
          q.eq(q.field("name"), `${template.namePrefix}-5`)
        )
      )
      .collect();

    const count = existingAgents.length;
    if (count === 0) return template.namePrefix;
    return `${template.namePrefix}-${count + 1}`;
  },
});

// Auto-spawn new agent based on conditions
export const autoSpawn = mutation({
  args: {
    role: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, { role, reason }) => {
    const template = templates[role as keyof typeof templates];
    if (!template) {
      throw new Error(`Unknown role: ${role}`);
    }

    // Generate name
    const existingAgents = await ctx.db
      .query("agents")
      .filter((q) => q.eq(q.field("role"), role))
      .collect();

    const count = existingAgents.length;
    const name = count === 0 ? template.namePrefix : `${template.namePrefix}-${count + 1}`;

    // Get learnings from successful agents of same role
    const learnings = await ctx.db
      .query("learnings")
      .order("desc")
      .take(20);

    const relevantLearnings = learnings
      .filter((l) => l.tags?.includes(role) || l.agent?.toLowerCase() === template.namePrefix.toLowerCase())
      .slice(0, 5);

    // Build enhanced prompt with learnings
    let enhancedPrompt = template.basePrompt;
    if (relevantLearnings.length > 0) {
      enhancedPrompt += "\n\n## Learnings from Team\n";
      relevantLearnings.forEach((l) => {
        enhancedPrompt += `- ${l.summary}\n`;
      });
    }

    // Create agent
    const agentId = await ctx.db.insert("agents", {
      name: name.toUpperCase(),
      role: template.role,
      status: "idle",
      currentTask: null,
      skills: template.skills,
      territory: template.territory,
      geniusDNA: template.geniusDNA,
      basePrompt: enhancedPrompt,
      spawnedAt: Date.now(),
      spawnReason: reason,
    });

    // Log activity
    await ctx.db.insert("activityEvents", {
      agentId,
      agentName: name.toLowerCase(),
      eventType: "agent_spawned",
      title: `${name} joined the team`,
      description: `Auto-spawned: ${reason}`,
      category: "system",
      timestamp: Date.now(),
    });

    return {
      success: true,
      agentId,
      name,
      role: template.role,
      reason,
    };
  },
});

// Check if we need more agents (cron job calls this)
export const checkSpawnNeeded = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const dispatches = await ctx.db
      .query("dispatches")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const recommendations: Array<{ role: string; reason: string }> = [];

    // Rule 1: Backlog > 20 tickets per role
    const backlogByRole: Record<string, number> = {};
    dispatches.forEach((d) => {
      const role = d.command?.includes("backend") ? "backend" :
                   d.command?.includes("frontend") ? "frontend" : "general";
      backlogByRole[role] = (backlogByRole[role] || 0) + 1;
    });

    Object.entries(backlogByRole).forEach(([role, count]) => {
      if (count > 10) {
        recommendations.push({
          role,
          reason: `High backlog: ${count} pending tasks`,
        });
      }
    });

    // Rule 2: All agents of a role are busy
    const busyByRole: Record<string, number> = {};
    const totalByRole: Record<string, number> = {};

    agents.forEach((a) => {
      const role = a.role || "general";
      totalByRole[role] = (totalByRole[role] || 0) + 1;
      if (a.status === "busy" || a.status === "working") {
        busyByRole[role] = (busyByRole[role] || 0) + 1;
      }
    });

    Object.entries(totalByRole).forEach(([role, total]) => {
      const busy = busyByRole[role] || 0;
      if (busy === total && total > 0) {
        recommendations.push({
          role,
          reason: `All ${total} ${role} agents busy`,
        });
      }
    });

    return {
      currentAgents: agents.length,
      pendingDispatches: dispatches.length,
      recommendations,
    };
  },
});
