/**
 * AGT-118: Agent-to-Agent Direct Messaging via Convex
 *
 * Agent A sends message directly to Agent B — no human relay needed.
 * Foundation for agents to self-coordinate.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Send a direct message from one agent to another
 */
export const sendDirectMessage = mutation({
  args: {
    fromAgent: v.string(),
    toAgent: v.string(),
    content: v.string(),
    relatedTaskId: v.optional(v.id("tasks")),
    priority: v.optional(v.union(v.literal("normal"), v.literal("urgent"))),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db.query("agents").collect();

    const fromAgentDoc = agents.find(
      (a) => a.name.toLowerCase() === args.fromAgent.toLowerCase()
    );
    const toAgentDoc = agents.find(
      (a) => a.name.toLowerCase() === args.toAgent.toLowerCase()
    );

    if (!fromAgentDoc) {
      throw new Error(`Sender agent not found: ${args.fromAgent}`);
    }
    if (!toAgentDoc) {
      throw new Error(`Recipient agent not found: ${args.toAgent}`);
    }

    const priority = args.priority || "normal";

    // Create DM in agentMessages table
    const messageId = await ctx.db.insert("agentMessages", {
      from: fromAgentDoc._id,
      to: toAgentDoc._id,
      type: "fyi", // DMs are treated as "fyi" type
      content: args.content,
      taskRef: args.relatedTaskId,
      status: "unread",
      timestamp: Date.now(),
    });

    // Create notification for recipient
    const linearId = args.relatedTaskId
      ? (await ctx.db.get(args.relatedTaskId))?.linearIdentifier
      : null;

    const notificationTitle = priority === "urgent"
      ? `🔴 Urgent DM from ${fromAgentDoc.name}`
      : `DM from ${fromAgentDoc.name}`;

    const notificationMessage = linearId
      ? `Re: ${linearId} — ${args.content.slice(0, 100)}${args.content.length > 100 ? "..." : ""}`
      : args.content.slice(0, 150) + (args.content.length > 150 ? "..." : "");

    await ctx.db.insert("notifications", {
      to: toAgentDoc._id,
      from: fromAgentDoc._id,
      type: "dm",
      title: notificationTitle,
      message: notificationMessage,
      read: false,
      relatedTask: args.relatedTaskId,
      createdAt: Date.now(),
    });

    // Log to activity feed
    await ctx.db.insert("activityEvents", {
      agentId: fromAgentDoc._id,
      agentName: args.fromAgent.toLowerCase(),
      category: "message",
      eventType: "dm_sent",
      title: `${fromAgentDoc.name.toUpperCase()} sent DM to ${toAgentDoc.name.toUpperCase()}`,
      taskId: args.relatedTaskId,
      linearIdentifier: linearId || undefined,
      metadata: {
        source: "agent_dm",
      },
      timestamp: Date.now(),
    });

    return {
      messageId,
      from: args.fromAgent,
      to: args.toAgent,
      priority,
    };
  },
});

/**
 * Get direct messages for an agent
 */
export const getDirectMessages = query({
  args: {
    agentName: v.string(),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db.query("agents").collect();
    const agent = agents.find(
      (a) => a.name.toLowerCase() === args.agentName.toLowerCase()
    );

    if (!agent) {
      return [];
    }

    let messages;
    if (args.unreadOnly) {
      messages = await ctx.db
        .query("agentMessages")
        .withIndex("by_to_status", (q) =>
          q.eq("to", agent._id).eq("status", "unread")
        )
        .order("desc")
        .collect();
    } else {
      // Get all messages where agent is recipient
      const allMessages = await ctx.db.query("agentMessages").collect();
      messages = allMessages
        .filter((m) => m.to === agent._id)
        .sort((a, b) => b.timestamp - a.timestamp);
    }

    // Enrich with sender info
    const enriched = await Promise.all(
      messages.map(async (m) => {
        const fromAgent = await ctx.db.get(m.from);
        const task = m.taskRef ? await ctx.db.get(m.taskRef) : null;
        return {
          ...m,
          fromAgentName: fromAgent?.name || "Unknown",
          fromAgentAvatar: fromAgent?.avatar || "🤖",
          taskTitle: task?.title || null,
          linearIdentifier: task?.linearIdentifier || null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Mark a DM as read
 */
export const markAsRead = mutation({
  args: { messageId: v.id("agentMessages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { status: "read" });
    return { success: true };
  },
});

/**
 * Mark all DMs as read for an agent
 */
export const markAllAsRead = mutation({
  args: { agentName: v.string() },
  handler: async (ctx, args) => {
    const agents = await ctx.db.query("agents").collect();
    const agent = agents.find(
      (a) => a.name.toLowerCase() === args.agentName.toLowerCase()
    );

    if (!agent) {
      throw new Error(`Agent not found: ${args.agentName}`);
    }

    const unread = await ctx.db
      .query("agentMessages")
      .withIndex("by_to_status", (q) =>
        q.eq("to", agent._id).eq("status", "unread")
      )
      .collect();

    for (const msg of unread) {
      await ctx.db.patch(msg._id, { status: "read" });
    }

    return { marked: unread.length };
  },
});

/**
 * Get conversation between two agents
 */
export const getConversation = query({
  args: {
    agent1: v.string(),
    agent2: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db.query("agents").collect();
    const a1 = agents.find((a) => a.name.toLowerCase() === args.agent1.toLowerCase());
    const a2 = agents.find((a) => a.name.toLowerCase() === args.agent2.toLowerCase());

    if (!a1 || !a2) {
      return [];
    }

    // Get all messages between these two agents
    const allMessages = await ctx.db.query("agentMessages").collect();
    const conversation = allMessages
      .filter(
        (m) =>
          (m.from === a1._id && m.to === a2._id) ||
          (m.from === a2._id && m.to === a1._id)
      )
      .sort((a, b) => a.timestamp - b.timestamp); // Oldest first for chat view

    const limited = args.limit
      ? conversation.slice(-args.limit)
      : conversation;

    // Enrich
    const enriched = await Promise.all(
      limited.map(async (m) => {
        const fromAgent = await ctx.db.get(m.from);
        return {
          ...m,
          fromAgentName: fromAgent?.name || "Unknown",
        };
      })
    );

    return enriched;
  },
});
