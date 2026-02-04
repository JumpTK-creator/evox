/**
 * AGT-248: Agent Mesh — P2P Communication
 *
 * Direct agent-to-agent messaging without coordinator bottleneck.
 * Supports:
 * - Direct messaging (agent → agent)
 * - Broadcast (agent → multiple agents)
 * - Real-time subscriptions via Convex reactivity
 * - No Max dependency
 *
 * Architecture:
 * - Each agent has an inbox (query by recipient)
 * - Messages include TTL for auto-cleanup
 * - Delivery confirmation via status tracking
 * - Broadcast uses fanout pattern
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Message types for P2P mesh
const meshMessageType = v.union(
  v.literal("direct"),      // 1:1 message
  v.literal("broadcast"),   // 1:many message
  v.literal("ping"),        // Heartbeat check
  v.literal("ack"),         // Acknowledgment
);

/**
 * Send a direct P2P message to another agent.
 * No coordinator required - direct peer-to-peer.
 */
export const sendDirect = mutation({
  args: {
    fromAgent: v.string(),    // "sam", "leo", "quinn"
    toAgent: v.string(),      // "leo", "sam", "max"
    content: v.string(),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent")
    )),
    taskRef: v.optional(v.string()), // Linear identifier like "AGT-248"
    ttlMinutes: v.optional(v.number()), // Time-to-live (default 60 minutes)
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ttl = args.ttlMinutes ?? 60;
    const expiresAt = now + ttl * 60 * 1000;

    const messageId = await ctx.db.insert("meshMessages", {
      type: "direct",
      fromAgent: args.fromAgent.toLowerCase(),
      toAgents: [args.toAgent.toLowerCase()],
      content: args.content,
      priority: args.priority ?? "normal",
      taskRef: args.taskRef,
      status: "pending",
      createdAt: now,
      expiresAt,
    });

    // Trigger real-time event for recipient
    await ctx.scheduler.runAfter(0, internal.agentMesh.notifyRecipient, {
      messageId,
      recipient: args.toAgent.toLowerCase(),
    });

    return { messageId, status: "sent" };
  },
});

/**
 * Broadcast a message to multiple agents.
 * Fanout pattern - one message, many recipients.
 */
export const broadcast = mutation({
  args: {
    fromAgent: v.string(),
    toAgents: v.array(v.string()),  // ["sam", "leo", "quinn"]
    content: v.string(),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent")
    )),
    taskRef: v.optional(v.string()),
    ttlMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ttl = args.ttlMinutes ?? 60;
    const expiresAt = now + ttl * 60 * 1000;

    // Normalize agent names
    const recipients = args.toAgents.map(a => a.toLowerCase());

    const messageId = await ctx.db.insert("meshMessages", {
      type: "broadcast",
      fromAgent: args.fromAgent.toLowerCase(),
      toAgents: recipients,
      content: args.content,
      priority: args.priority ?? "normal",
      taskRef: args.taskRef,
      status: "pending",
      deliveredTo: [],
      createdAt: now,
      expiresAt,
    });

    // Notify all recipients in parallel
    for (const recipient of recipients) {
      await ctx.scheduler.runAfter(0, internal.agentMesh.notifyRecipient, {
        messageId,
        recipient,
      });
    }

    return { messageId, status: "broadcast", recipients: recipients.length };
  },
});

/**
 * Get unread messages for an agent (real-time reactive query).
 * Agents subscribe to this query for instant P2P updates.
 */
export const getInbox = query({
  args: {
    agentName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const name = args.agentName.toLowerCase();
    const now = Date.now();

    // Get all messages where:
    // 1. Agent is in toAgents array
    // 2. Message hasn't expired
    // 3. Status is pending or delivered (not acked yet)
    const allMessages = await ctx.db
      .query("meshMessages")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const inbox = allMessages
      .filter((m) =>
        m.toAgents.includes(name) &&
        m.expiresAt > now &&
        (!m.deliveredTo || !m.deliveredTo.includes(name))
      )
      .sort((a, b) => b.createdAt - a.createdAt);

    const limited = args.limit ? inbox.slice(0, args.limit) : inbox;

    return limited.map(m => ({
      _id: m._id,
      type: m.type,
      fromAgent: m.fromAgent,
      content: m.content,
      priority: m.priority,
      taskRef: m.taskRef,
      createdAt: m.createdAt,
      expiresAt: m.expiresAt,
    }));
  },
});

/**
 * Get all messages (for debugging and monitoring).
 */
export const getAllMessages = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("meshMessages")
      .order("desc")
      .collect();

    const limited = args.limit ? messages.slice(0, args.limit) : messages;
    return limited;
  },
});

/**
 * Mark a message as delivered (agent received it).
 */
export const markDelivered = mutation({
  args: {
    messageId: v.id("meshMessages"),
    agentName: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const name = args.agentName.toLowerCase();

    // Add agent to deliveredTo list
    const deliveredTo = message.deliveredTo ?? [];
    if (!deliveredTo.includes(name)) {
      deliveredTo.push(name);
    }

    // If all recipients have received, mark as delivered
    const allDelivered = message.toAgents.every(agent => deliveredTo.includes(agent));

    await ctx.db.patch(args.messageId, {
      deliveredTo,
      status: allDelivered ? "delivered" : message.status,
      deliveredAt: allDelivered ? Date.now() : message.deliveredAt,
    });

    return { status: "delivered" };
  },
});

/**
 * Acknowledge receipt and processing of a message.
 */
export const acknowledge = mutation({
  args: {
    messageId: v.id("meshMessages"),
    agentName: v.string(),
    response: v.optional(v.string()), // Optional response message
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const name = args.agentName.toLowerCase();

    // Record acknowledgment
    const acknowledgedBy = message.acknowledgedBy ?? [];
    if (!acknowledgedBy.includes(name)) {
      acknowledgedBy.push(name);
    }

    // If all recipients have acknowledged, mark as completed
    const allAcked = message.toAgents.every(agent => acknowledgedBy.includes(agent));

    await ctx.db.patch(args.messageId, {
      acknowledgedBy,
      status: allAcked ? "completed" : message.status,
      completedAt: allAcked ? Date.now() : message.completedAt,
    });

    // If there's a response, send it back
    if (args.response) {
      await ctx.db.insert("meshMessages", {
        type: "ack",
        fromAgent: name,
        toAgents: [message.fromAgent],
        content: args.response,
        priority: "normal",
        taskRef: message.taskRef,
        status: "pending",
        createdAt: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour TTL
        replyTo: args.messageId,
      });
    }

    return { status: "acknowledged" };
  },
});

/**
 * Ping another agent to check if they're alive.
 * Returns response time if agent responds within timeout.
 */
export const ping = mutation({
  args: {
    fromAgent: v.string(),
    toAgent: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const messageId = await ctx.db.insert("meshMessages", {
      type: "ping",
      fromAgent: args.fromAgent.toLowerCase(),
      toAgents: [args.toAgent.toLowerCase()],
      content: "PING",
      priority: "normal",
      status: "pending",
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000, // 5 minute TTL for pings
    });

    await ctx.scheduler.runAfter(0, internal.agentMesh.notifyRecipient, {
      messageId,
      recipient: args.toAgent.toLowerCase(),
    });

    return { messageId, sentAt: now };
  },
});

/**
 * Get conversation history between two agents.
 */
export const getConversation = query({
  args: {
    agent1: v.string(),
    agent2: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const a1 = args.agent1.toLowerCase();
    const a2 = args.agent2.toLowerCase();

    const allMessages = await ctx.db
      .query("meshMessages")
      .collect();

    // Filter messages between these two agents
    const conversation = allMessages.filter(m =>
      (m.fromAgent === a1 && m.toAgents.includes(a2)) ||
      (m.fromAgent === a2 && m.toAgents.includes(a1))
    ).sort((a, b) => a.createdAt - b.createdAt);

    const limited = args.limit
      ? conversation.slice(-args.limit)
      : conversation;

    return limited;
  },
});

/**
 * Clean up expired messages (scheduled job).
 */
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const allMessages = await ctx.db.query("meshMessages").collect();

    let deleted = 0;
    for (const message of allMessages) {
      if (message.expiresAt < now || message.status === "completed") {
        // Only delete if older than 24 hours after completion/expiry
        const deleteAfter = Math.max(message.expiresAt, message.completedAt ?? 0);
        if (now - deleteAfter > 24 * 60 * 60 * 1000) {
          await ctx.db.delete(message._id);
          deleted++;
        }
      }
    }

    return { deleted, timestamp: now };
  },
});

/**
 * Internal: Notify recipient of new message (creates agentEvent).
 */
export const notifyRecipient = internalMutation({
  args: {
    messageId: v.id("meshMessages"),
    recipient: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    // Create agent event for real-time notification
    await ctx.db.insert("agentEvents", {
      type: "dispatch",
      targetAgent: args.recipient,
      payload: {
        message: `New P2P message from ${message.fromAgent}`,
        fromAgent: message.fromAgent,
        priority: message.priority ?? "normal",
        metadata: {
          messageId: args.messageId,
          messageType: message.type,
          content: message.content.substring(0, 100), // Preview
        },
      },
      status: "pending",
      createdAt: Date.now(),
      expiresAt: message.expiresAt,
    });
  },
});

/**
 * Get mesh stats for monitoring.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allMessages = await ctx.db.query("meshMessages").collect();
    const now = Date.now();

    const active = allMessages.filter(m => m.expiresAt > now && m.status !== "completed");
    const byStatus = {
      pending: active.filter(m => m.status === "pending").length,
      delivered: active.filter(m => m.status === "delivered").length,
      completed: allMessages.filter(m => m.status === "completed").length,
    };

    const byType = {
      direct: active.filter(m => m.type === "direct").length,
      broadcast: active.filter(m => m.type === "broadcast").length,
      ping: active.filter(m => m.type === "ping").length,
      ack: active.filter(m => m.type === "ack").length,
    };

    // Calculate agent activity
    const agentActivity: Record<string, { sent: number; received: number }> = {};
    for (const msg of active) {
      if (!agentActivity[msg.fromAgent]) {
        agentActivity[msg.fromAgent] = { sent: 0, received: 0 };
      }
      agentActivity[msg.fromAgent].sent++;

      for (const recipient of msg.toAgents) {
        if (!agentActivity[recipient]) {
          agentActivity[recipient] = { sent: 0, received: 0 };
        }
        agentActivity[recipient].received++;
      }
    }

    return {
      totalActive: active.length,
      totalCompleted: byStatus.completed,
      byStatus,
      byType,
      agentActivity,
      timestamp: now,
    };
  },
});
