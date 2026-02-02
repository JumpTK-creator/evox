/**
 * Webhook Handlers (AGT-128: Max Visibility Pipeline)
 *
 * GitHub push → Parse AGT-XX → Linear comment
 * Vercel deploy → Match commit → Linear comment / P0 bug ticket
 */
import { v } from "convex/values";
import { mutation, action, internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Regex to match ticket IDs like "AGT-123", "closes AGT-45", etc.
const TICKET_REGEX = /\b(AGT-\d+)\b/gi;

// Regex to detect "closes AGT-XX" pattern (task completion)
const CLOSES_REGEX = /closes\s+(AGT-\d+)/gi;

// Map GitHub usernames to agent names (for skill tracking)
const GITHUB_TO_AGENT: Record<string, string> = {
  "sonpiaz": "max",      // Son's GitHub → Max (PM)
  "sam-agent": "sam",    // SAM's commits
  "leo-agent": "leo",    // LEO's commits
  // Add more mappings as needed
};

/**
 * Store webhook event in database (internal)
 */
export const storeWebhookEvent = internalMutation({
  args: {
    source: v.union(v.literal("github"), v.literal("vercel")),
    eventType: v.string(),
    payload: v.string(),
    linearTicketId: v.optional(v.string()),
    commentPosted: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhookEvents", {
      source: args.source,
      eventType: args.eventType,
      payload: args.payload,
      linearTicketId: args.linearTicketId,
      commentPosted: args.commentPosted,
      createdAt: Date.now(),
    });
  },
});

/**
 * Post a comment to Linear ticket (internal - called by other actions)
 */
export const postLinearComment = internalAction({
  args: {
    ticketId: v.string(), // e.g., "AGT-128"
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const linearApiKey = process.env.LINEAR_API_KEY;
    if (!linearApiKey) {
      console.error("LINEAR_API_KEY not configured");
      return { success: false, error: "LINEAR_API_KEY not configured" };
    }

    try {
      // Get issue UUID from identifier
      const issueResponse = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: linearApiKey,
        },
        body: JSON.stringify({
          query: `{ issue(id: "${args.ticketId}") { id } }`,
        }),
      });

      const issueData = await issueResponse.json();
      const issueUuid = issueData?.data?.issue?.id;

      if (!issueUuid) {
        console.error(`Could not find ${args.ticketId} in Linear`);
        return { success: false, error: `Ticket ${args.ticketId} not found` };
      }

      // Post comment
      const commentResponse = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: linearApiKey,
        },
        body: JSON.stringify({
          query: `mutation { commentCreate(input: { issueId: "${issueUuid}", body: "${args.body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" }) { success } }`,
        }),
      });

      const commentData = await commentResponse.json();
      const success = commentData?.data?.commentCreate?.success === true;

      return { success, ticketId: args.ticketId };
    } catch (error) {
      console.error("Error posting Linear comment:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Create a P0 bug ticket in Linear for deploy failures (internal)
 */
export const createLinearBugTicket = internalAction({
  args: {
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const linearApiKey = process.env.LINEAR_API_KEY;
    if (!linearApiKey) {
      console.error("LINEAR_API_KEY not configured");
      return { success: false, error: "LINEAR_API_KEY not configured" };
    }

    try {
      // Get team ID for "Agent Factory" (AGT prefix)
      const teamResponse = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: linearApiKey,
        },
        body: JSON.stringify({
          query: `{ teams(filter: { key: { eq: "AGT" } }) { nodes { id } } }`,
        }),
      });

      const teamData = await teamResponse.json();
      const teamId = teamData?.data?.teams?.nodes?.[0]?.id;

      if (!teamId) {
        console.error("Could not find AGT team in Linear");
        return { success: false, error: "Team not found" };
      }

      // Create issue with priority 1 (Urgent/P0)
      const createResponse = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: linearApiKey,
        },
        body: JSON.stringify({
          query: `mutation {
            issueCreate(input: {
              teamId: "${teamId}",
              title: "${args.title.replace(/"/g, '\\"')}",
              description: "${args.description.replace(/"/g, '\\"').replace(/\n/g, '\\n')}",
              priority: 1
            }) {
              success
              issue { id identifier url }
            }
          }`,
        }),
      });

      const createData = await createResponse.json();
      const success = createData?.data?.issueCreate?.success === true;
      const issue = createData?.data?.issueCreate?.issue;

      return {
        success,
        ticketId: issue?.identifier,
        url: issue?.url,
      };
    } catch (error) {
      console.error("Error creating Linear bug ticket:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Process GitHub push event
 * Extract AGT-XX from commit messages and post comments to Linear
 */
export const processGitHubPush = action({
  args: {
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload;

    // Only process pushes to main/master
    const ref = payload.ref || "";
    if (!ref.endsWith("/main") && !ref.endsWith("/master")) {
      return { processed: false, reason: "Not main branch" };
    }

    const commits = payload.commits || [];
    const results: Array<{ ticketId: string; success: boolean }> = [];

    for (const commit of commits) {
      const message = commit.message || "";
      const author = commit.author?.username || commit.author?.name || "unknown";
      const hash = (commit.id || "").slice(0, 7);
      const url = commit.url || "";

      // Extract all AGT-XX ticket IDs from commit message
      const matches: RegExpMatchArray | null = message.match(TICKET_REGEX);
      if (!matches) continue;

      // Deduplicate ticket IDs
      const ticketIds: string[] = Array.from(new Set(matches.map((m: string) => m.toUpperCase())));

      for (const ticketId of ticketIds) {
        // Build comment body
        const commentBody = `🔨 **GitHub Push** by ${author}

**Commit:** \`${hash}\` — ${message.split("\n")[0]}
**Branch:** main
**Files changed:** ${commit.added?.length || 0} added, ${commit.modified?.length || 0} modified, ${commit.removed?.length || 0} removed
**Link:** ${url}`;

        // Post comment to Linear
        const result = await ctx.runAction(internal.webhooks.postLinearComment, {
          ticketId,
          body: commentBody,
        });

        results.push({ ticketId, success: result.success });

        // Store webhook event
        await ctx.runMutation(internal.webhooks.storeWebhookEvent, {
          source: "github" as const,
          eventType: "push",
          payload: JSON.stringify({ commit: hash, message: message.slice(0, 100) }),
          linearTicketId: ticketId,
          commentPosted: result.success,
        });
      }

      // AGT-132: Track skill completion when "closes AGT-XX" detected
      const closesMatches = message.match(CLOSES_REGEX);
      if (closesMatches && closesMatches.length > 0) {
        const agentName = GITHUB_TO_AGENT[author.toLowerCase()];
        if (agentName) {
          // Record task completion for skill tracking
          try {
            await ctx.runMutation(internal.webhooks.recordSkillCompletion, {
              agentName,
              ticketId: closesMatches[0].replace(/closes\s+/i, "").toUpperCase(),
              commitHash: hash,
            });
          } catch (e) {
            console.error("Failed to record skill completion:", e);
          }
        }
      }
    }

    return { processed: true, results };
  },
});

/**
 * Process Vercel deployment event
 * Post status updates and create P0 bug tickets on failure
 */
const processVercelDeployAction = action({
  args: {
    payload: v.any(),
  },
  handler: async (ctx, args): Promise<{
    processed: boolean;
    status?: string;
    results?: Array<{ ticketId: string; success: boolean }>;
    bugTicketCreated?: boolean;
    bugTicketId?: string;
  }> => {
    const payload = args.payload;
    const deploymentType = payload.type || "deployment";
    const deployment = payload.deployment || payload;

    const status = deployment.state || deployment.readyState || "unknown";
    const url = deployment.url ? `https://${deployment.url}` : deployment.inspectorUrl || "";
    const commitSha = deployment.meta?.githubCommitSha || deployment.gitSource?.sha || "";
    const commitMessage = deployment.meta?.githubCommitMessage || deployment.gitSource?.message || "";
    const hash = commitSha.slice(0, 7);

    // Extract ticket IDs from commit message
    const matches: RegExpMatchArray | null = commitMessage.match(TICKET_REGEX);
    const ticketIds: string[] = matches ? Array.from(new Set(matches.map((m: string) => m.toUpperCase()))) : [];

    const results: Array<{ ticketId: string; success: boolean }> = [];

    // Determine status emoji and label
    let statusEmoji = "🔄";
    let statusLabel = "Building";
    if (status === "READY" || status === "ready") {
      statusEmoji = "✅";
      statusLabel = "Deployed";
    } else if (status === "ERROR" || status === "error" || status === "FAILED") {
      statusEmoji = "❌";
      statusLabel = "Failed";
    } else if (status === "CANCELED" || status === "canceled") {
      statusEmoji = "⚠️";
      statusLabel = "Canceled";
    }

    // Build comment body
    const commentBody = `${statusEmoji} **Vercel Deploy** — ${statusLabel}

**URL:** ${url}
**Commit:** \`${hash}\` — ${commitMessage.split("\n")[0]}
**Status:** ${status}`;

    // Post comment to matched Linear tickets
    for (const ticketId of ticketIds) {
      const result = await ctx.runAction(internal.webhooks.postLinearComment, {
        ticketId,
        body: commentBody,
      });

      results.push({ ticketId, success: result.success });
    }

    // Store webhook event
    await ctx.runMutation(internal.webhooks.storeWebhookEvent, {
      source: "vercel" as const,
      eventType: deploymentType,
      payload: JSON.stringify({ status, url, commit: hash }),
      linearTicketId: ticketIds[0] || undefined,
      commentPosted: results.some((r) => r.success),
    });

    // If deploy failed, create P0 bug ticket
    if (status === "ERROR" || status === "error" || status === "FAILED") {
      const bugResult = await ctx.runAction(internal.webhooks.createLinearBugTicket, {
        title: `🚨 [P0] Vercel Deploy Failed — ${hash}`,
        description: `## Deploy Failure

**Commit:** \`${commitSha}\`
**Message:** ${commitMessage}
**URL:** ${url}

## Action Required
Check Vercel logs and fix immediately.

---
*Auto-created by webhook on deploy failure*`,
      });

      return {
        processed: true,
        status,
        results,
        bugTicketCreated: bugResult.success,
        bugTicketId: bugResult.ticketId,
      };
    }

    return { processed: true, status, results };
  },
});

export const processVercelDeploy = processVercelDeployAction;

/**
 * List recent webhook events (for dashboard)
 */
export const listRecentEvents = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("webhookEvents")
      .withIndex("by_created_at")
      .order("desc")
      .take(args.limit || 50);

    return events;
  },
});

/**
 * AGT-132: Record skill completion from webhook
 * Called when "closes AGT-XX" is detected in a commit message
 */
export const recordSkillCompletion = internalMutation({
  args: {
    agentName: v.string(),
    ticketId: v.string(),
    commitHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Find agent by name mapping
    const mapping = await ctx.db
      .query("agentMappings")
      .withIndex("by_name", (q) => q.eq("name", args.agentName.toLowerCase()))
      .first();

    if (!mapping) {
      console.log(`No agent mapping found for: ${args.agentName}`);
      return { success: false, reason: "Agent not found" };
    }

    // Find agent skills record
    const skills = await ctx.db
      .query("agentSkills")
      .withIndex("by_agent", (q) => q.eq("agentId", mapping.convexAgentId))
      .first();

    if (!skills) {
      console.log(`No skills record for agent: ${args.agentName}`);
      return { success: false, reason: "Skills not initialized" };
    }

    // Update task completion count
    const now = Date.now();
    await ctx.db.patch(skills._id, {
      tasksCompleted: skills.tasksCompleted + 1,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      agent: mapping.convexAgentId,
      action: "completed_via_webhook",
      target: args.ticketId,
      metadata: { commitHash: args.commitHash, source: "github" },
      createdAt: now,
    });

    return {
      success: true,
      agent: args.agentName,
      ticketId: args.ticketId,
      tasksCompleted: skills.tasksCompleted + 1,
    };
  },
});
