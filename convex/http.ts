import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

const http = httpRouter();

// ============================================================
// BOOT CONTEXT ENDPOINT (AGT-160: Context Boot Protocol)
// ============================================================

/**
 * POST /bootContext — Assemble full context for agent session
 * Returns: SOUL + WORKING + TASK + SKILLS + DISPATCH RULES
 *
 * Usage: curl -X POST $CONVEX_URL/bootContext -d '{"agentName":"sam","ticketId":"AGT-158"}'
 */
http.route({
  path: "/bootContext",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { agentName, ticketId } = body;

      if (!agentName) {
        return new Response(
          JSON.stringify({ error: "agentName is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const normalizedName = agentName.toLowerCase();

      // 1. Get agent mapping to find agent ID
      const mapping = await ctx.runQuery(api.agentMappings.getByAgentName, {
        agentName: normalizedName,
      });

      if (!mapping) {
        return new Response(
          JSON.stringify({ error: `Agent '${agentName}' not found in mappings` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const agentId = mapping.convexAgentId;

      // 2. Get agent details
      const agent = await ctx.runQuery(api.agents.get, { id: agentId });
      if (!agent) {
        return new Response(
          JSON.stringify({ error: `Agent record not found for ID ${agentId}` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 3. Get boot context (soul + working + daily from agentMemory)
      const memoryContext = await ctx.runQuery(api.agentMemory.getBootContext, {
        agentId,
      });

      // 4. Get skills
      const skills = await ctx.runQuery(api.skills.getByAgent, { agentId });

      // 5. Get task if ticketId provided
      let task = null;
      if (ticketId) {
        // Find task by linearIdentifier (AGT-XXX format)
        const allTasks = await ctx.runQuery(api.tasks.list, {});
        task = allTasks.find(
          (t: any) => t.linearIdentifier?.toLowerCase() === ticketId.toLowerCase()
        );
      }

      // 6. Get current task if agent has one assigned
      let currentTask = null;
      if (agent.currentTask) {
        currentTask = await ctx.runQuery(api.tasks.get, { id: agent.currentTask });
      }

      // 7. Assemble context document
      const contextSections: string[] = [];

      // === IDENTITY ===
      contextSections.push("=== IDENTITY ===");
      if (memoryContext?.soul?.content) {
        contextSections.push(memoryContext.soul.content);
      } else if (agent.soul) {
        contextSections.push(agent.soul);
      } else {
        contextSections.push(`You are ${agent.name.toUpperCase()}, a ${agent.role} engineer.`);
      }
      contextSections.push("");

      // === CURRENT STATE ===
      contextSections.push("=== CURRENT STATE ===");
      if (memoryContext?.working?.content) {
        contextSections.push(memoryContext.working.content);
      } else {
        contextSections.push(`Status: ${agent.status}`);
        if (agent.statusReason) {
          contextSections.push(`Reason: ${agent.statusReason}`);
        }
        if (currentTask) {
          contextSections.push(`Current Task: ${currentTask.linearIdentifier ?? currentTask.title}`);
        }
      }
      contextSections.push("");

      // === TASK ===
      if (task) {
        contextSections.push("=== TASK ===");
        contextSections.push(`Ticket: ${task.linearIdentifier}`);
        contextSections.push(`Title: ${task.title}`);
        contextSections.push(`Priority: ${task.priority}`);
        contextSections.push(`Status: ${task.status}`);
        if (task.linearUrl) {
          contextSections.push(`URL: ${task.linearUrl}`);
        }
        contextSections.push("");
        contextSections.push("Description:");
        contextSections.push(task.description);
        contextSections.push("");
      }

      // === SKILLS ===
      if (skills) {
        contextSections.push("=== SKILLS ===");
        contextSections.push(`Autonomy Level: ${skills.autonomyLevelName} (${skills.autonomyLevel})`);
        contextSections.push(`Territory: ${skills.territory.join(", ")}`);
        contextSections.push(`Tasks Completed: ${skills.tasksCompleted}`);
        const trustScore = skills.tasksCompleted > 0
          ? Math.round(((skills.tasksCompleted - skills.tasksWithBugs) / skills.tasksCompleted) * 100)
          : 100;
        contextSections.push(`Trust Score: ${trustScore}%`);
        contextSections.push("");
      }

      // === DISPATCH RULES ===
      contextSections.push("=== DISPATCH RULES ===");
      contextSections.push(`- Commit with "closes ${ticketId || '{TICKET_ID}'}" when done`);
      contextSections.push("- Push immediately after commit");
      contextSections.push("- Leave Linear comment: files changed, what was done");
      contextSections.push("- Update WORKING memory at session end");
      if (skills?.territory) {
        contextSections.push(`- Stay in your territory: ${skills.territory.join(", ")}`);
      }
      contextSections.push("");

      const contextDocument = contextSections.join("\n");

      return new Response(
        JSON.stringify({
          success: true,
          agentName: normalizedName,
          ticketId: ticketId || null,
          context: contextDocument,
          raw: {
            agent: {
              name: agent.name,
              role: agent.role,
              status: agent.status,
              statusReason: agent.statusReason,
            },
            soul: memoryContext?.soul?.content || agent.soul || null,
            working: memoryContext?.working?.content || null,
            daily: memoryContext?.daily?.content || null,
            task: task ? {
              id: task.linearIdentifier,
              title: task.title,
              status: task.status,
              priority: task.priority,
              url: task.linearUrl,
            } : null,
            skills: skills ? {
              autonomyLevel: skills.autonomyLevel,
              autonomyLevelName: skills.autonomyLevelName,
              territory: skills.territory,
              tasksCompleted: skills.tasksCompleted,
            } : null,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("bootContext error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /bootContext?agentName=sam&ticketId=AGT-158 — Same as POST but via query params
 */
http.route({
  path: "/bootContext",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agentName = url.searchParams.get("agentName");
      const ticketId = url.searchParams.get("ticketId");

      if (!agentName) {
        return new Response(
          JSON.stringify({ error: "agentName query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const normalizedName = agentName.toLowerCase();

      // Reuse same logic as POST (make internal request)
      const postRequest = new Request(request.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: normalizedName, ticketId }),
      });

      // Re-run the same logic inline (can't call ourselves)
      // 1. Get agent mapping
      const mapping = await ctx.runQuery(api.agentMappings.getByAgentName, {
        agentName: normalizedName,
      });

      if (!mapping) {
        return new Response(
          JSON.stringify({ error: `Agent '${agentName}' not found in mappings` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const agentId = mapping.convexAgentId;
      const agent = await ctx.runQuery(api.agents.get, { id: agentId });
      if (!agent) {
        return new Response(
          JSON.stringify({ error: `Agent record not found` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const memoryContext = await ctx.runQuery(api.agentMemory.getBootContext, { agentId });
      const skills = await ctx.runQuery(api.skills.getByAgent, { agentId });

      let task = null;
      if (ticketId) {
        const allTasks = await ctx.runQuery(api.tasks.list, {});
        task = allTasks.find(
          (t: any) => t.linearIdentifier?.toLowerCase() === ticketId.toLowerCase()
        );
      }

      // Build text-only response for CLI
      const lines: string[] = [];
      lines.push("=== IDENTITY ===");
      lines.push(memoryContext?.soul?.content || agent.soul || `You are ${agent.name.toUpperCase()}, a ${agent.role} engineer.`);
      lines.push("");
      lines.push("=== CURRENT STATE ===");
      lines.push(memoryContext?.working?.content || `Status: ${agent.status}`);
      lines.push("");

      if (task) {
        lines.push("=== TASK ===");
        lines.push(`Ticket: ${task.linearIdentifier}`);
        lines.push(`Title: ${task.title}`);
        lines.push(`Priority: ${task.priority}`);
        lines.push(`Status: ${task.status}`);
        lines.push("");
        lines.push("Description:");
        lines.push(task.description);
        lines.push("");
      }

      lines.push("=== DISPATCH RULES ===");
      lines.push(`- Commit with "closes ${ticketId || '{TICKET_ID}'}" when done`);
      lines.push("- Push immediately after commit");
      lines.push("- Leave Linear comment: files changed, what was done");

      return new Response(lines.join("\n"), {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch (error) {
      console.error("bootContext GET error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// POST /api/heartbeat - Update agent heartbeat
http.route({
  path: "/api/heartbeat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { agentId, status, currentTask } = body;

      // Validate required fields
      if (!agentId || !status) {
        return new Response(
          JSON.stringify({ error: "agentId and status are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate status
      const validStatuses = ["online", "idle", "offline", "busy"];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: "Invalid status. Must be: online, idle, offline, or busy" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find agent by name (case-insensitive)
      const agents = await ctx.runQuery(api.agents.list);
      const agent = agents.find(
        (a: any) => a.name.toLowerCase() === agentId.toLowerCase()
      );

      if (!agent) {
        return new Response(
          JSON.stringify({ error: `Agent '${agentId}' not found` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Parse currentTask if provided
      let taskId: Id<"tasks"> | undefined = undefined;
      if (currentTask) {
        // If currentTask is a task ID, use it directly
        if (currentTask.startsWith("j")) {
          taskId = currentTask as Id<"tasks">;
        }
        // Otherwise, find task by title
        else {
          const allTasks = await ctx.runQuery(api.tasks.list, {});
          const task = allTasks.find((t: any) =>
            t.title.toLowerCase().includes(currentTask.toLowerCase())
          );
          if (task) {
            taskId = task._id;
          }
        }
      }

      // Update agent status and currentTask
      await ctx.runMutation(api.agents.updateStatus, {
        id: agent._id,
        status,
      });

      if (taskId !== undefined || currentTask === null) {
        await ctx.runMutation(api.agents.assignTask, {
          id: agent._id,
          taskId,
        });
      }

      // Record heartbeat
      await ctx.runMutation(api.agents.heartbeat, {
        id: agent._id,
        status,
        metadata: { currentTask: currentTask || null },
      });

      // Get updated agent data
      const updatedAgent = await ctx.runQuery(api.agents.get, {
        id: agent._id,
      });

      return new Response(JSON.stringify(updatedAgent), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Heartbeat error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// GET /api/heartbeat?agentId=<name> - Get single agent status
http.route({
  path: "/api/heartbeat",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agentId = url.searchParams.get("agentId");

      if (!agentId) {
        return new Response(
          JSON.stringify({ error: "agentId query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find agent by name (case-insensitive)
      const agents = await ctx.runQuery(api.agents.list);
      const agent = agents.find(
        (a: any) => a.name.toLowerCase() === agentId.toLowerCase()
      );

      if (!agent) {
        return new Response(
          JSON.stringify({ error: `Agent '${agentId}' not found` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get recent heartbeats for this agent
      const allHeartbeats = await ctx.runQuery(api.agents.list);

      return new Response(JSON.stringify(agent), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get heartbeat error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// POST /api/linear-sync - Trigger Linear sync
http.route({
  path: "/api/linear-sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Trigger Linear sync action
      const result = await ctx.runAction(api.linearSync.triggerSync, {});

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Linear sync trigger error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Internal server error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// WEBHOOK ENDPOINTS (AGT-128: Max Visibility Pipeline)
// ============================================================

/**
 * POST /github-webhook — Handle GitHub push events
 * Parses commit messages for AGT-XX and posts comments to Linear
 */
http.route({
  path: "/github-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.text();
      const payload = JSON.parse(body);

      // Verify GitHub signature if secret is configured (using Web Crypto API)
      const githubSecret = process.env.GITHUB_WEBHOOK_SECRET;
      if (githubSecret) {
        const signature = request.headers.get("x-hub-signature-256");
        if (signature) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(githubSecret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          );
          const signatureBuffer = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(body)
          );
          const hashArray = Array.from(new Uint8Array(signatureBuffer));
          const expectedSignature = `sha256=${hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
          if (signature !== expectedSignature) {
            console.error("Invalid GitHub webhook signature");
            return new Response(
              JSON.stringify({ error: "Invalid signature" }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }
        }
      }

      // Check event type
      const eventType = request.headers.get("x-github-event");
      if (eventType !== "push") {
        return new Response(
          JSON.stringify({ message: `Ignoring event type: ${eventType}` }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Process the push event
      const result = await ctx.runAction(api.webhooks.processGitHubPush, {
        payload,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("GitHub webhook error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /vercel-webhook — Handle Vercel deployment events
 * Posts status updates to Linear and creates P0 bug tickets on failure
 */
http.route({
  path: "/vercel-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();

      // Vercel sends different payload structures for different events
      // We handle: deployment.created, deployment.ready, deployment.error
      const eventType = payload.type || "deployment";

      // Process the deployment event
      const result = await ctx.runAction(api.webhooks.processVercelDeploy, {
        payload,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Vercel webhook error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
