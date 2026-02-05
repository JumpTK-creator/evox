/**
 * AGT-112: Task Comments (Comment Threads on Tasks)
 *
 * Agents post comments/updates directly on tasks.
 * Creates conversation threads — like Slack threads but attached to tasks.
 */
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Regex for @mentions: @Max, @Sam, @Leo, @Son, @all
const MENTION_REGEX = /@(Max|Sam|Leo|Son|all)/gi;

/**
 * Parse @mentions from content
 */
function parseMentions(content: string): string[] {
  const matches = content.match(MENTION_REGEX);
  if (!matches) return [];

  const unique = [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
  return unique;
}

/**
 * Post a comment on a task
 */
export const postComment = mutation({
  args: {
    taskId: v.id("tasks"),
    agentName: v.string(),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
    parentId: v.optional(v.id("taskComments")),
  },
  handler: async (ctx, args) => {
    // Get agent by name
    const agents = await ctx.db.query("agents").collect();
    const agent = agents.find(
      (a) => a.name.toLowerCase() === args.agentName.toLowerCase()
    );

    if (!agent) {
      throw new Error(`Agent not found: ${args.agentName}`);
    }

    // Get task for logging
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    // Parse @mentions from content
    const mentionNames = parseMentions(args.content);
    const mentionedAgents: Id<"agents">[] = [];

    for (const name of mentionNames) {
      if (name === "all") {
        // @all = all agents except the sender
        mentionedAgents.push(
          ...agents.filter((a) => a._id !== agent._id).map((a) => a._id)
        );
      } else {
        const mentioned = agents.find(
          (a) => a.name.toLowerCase() === name.toLowerCase()
        );
        if (mentioned && mentioned._id !== agent._id) {
          mentionedAgents.push(mentioned._id);
        }
      }
    }

    // Create comment
    const commentId = await ctx.db.insert("taskComments", {
      taskId: args.taskId,
      fromAgentId: agent._id,
      content: args.content,
      attachments: args.attachments,
      mentions: mentionedAgents.length > 0 ? mentionedAgents : undefined,
      parentId: args.parentId,
      createdAt: Date.now(),
    });

    // Create activity log
    // AGT-182: Show comment like Linear (e.g., "SAM commented on AGT-182")
    const linearId = task.linearIdentifier || `task-${args.taskId}`;
    await ctx.db.insert("activityEvents", {
      agentId: agent._id,
      agentName: args.agentName.toLowerCase(),
      category: "message",
      eventType: "comment",
      title: `${agent.name.toUpperCase()} commented on ${linearId}`,
      description: task.title, // AGT-182: Task title for context
      taskId: args.taskId,
      linearIdentifier: task.linearIdentifier,
      projectId: task.projectId,
      metadata: {
        source: "task_comment",
      },
      timestamp: Date.now(),
    });

    // Create notifications for mentioned agents (AGT-115)
    for (const mentionedId of mentionedAgents) {
      await ctx.db.insert("notifications", {
        to: mentionedId,
        type: "mention",
        title: `${agent.name} mentioned you`,
        message: `In ${linearId}: ${args.content.slice(0, 100)}${args.content.length > 100 ? "..." : ""}`,
        read: false,
        relatedTask: args.taskId,
        createdAt: Date.now(),
      });
    }

    return {
      commentId,
      taskId: args.taskId,
      mentions: mentionNames,
      notificationsSent: mentionedAgents.length,
    };
  },
});

/**
 * List comments for a task (ordered by time, oldest first = chat style)
 */
export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("taskComments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    // Enrich with agent info
    const enriched = await Promise.all(
      comments.map(async (comment) => {
        const agent = await ctx.db.get(comment.fromAgentId);
        return {
          ...comment,
          agentName: agent?.name || "Unknown",
          agentAvatar: agent?.avatar || "🤖",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get replies to a specific comment
 */
export const getReplies = query({
  args: { parentId: v.id("taskComments") },
  handler: async (ctx, args) => {
    const replies = await ctx.db
      .query("taskComments")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();

    // Enrich with agent info
    const enriched = await Promise.all(
      replies.map(async (comment) => {
        const agent = await ctx.db.get(comment.fromAgentId);
        return {
          ...comment,
          agentName: agent?.name || "Unknown",
          agentAvatar: agent?.avatar || "🤖",
        };
      })
    );

    return enriched;
  },
});

/**
 * Get recent comments across all tasks (for activity feed)
 */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get all comments and sort by time
    const comments = await ctx.db
      .query("taskComments")
      .order("desc")
      .take(limit);

    // Enrich with agent and task info
    const enriched = await Promise.all(
      comments.map(async (comment) => {
        const [agent, task] = await Promise.all([
          ctx.db.get(comment.fromAgentId),
          ctx.db.get(comment.taskId),
        ]);
        return {
          ...comment,
          agentName: agent?.name || "Unknown",
          agentAvatar: agent?.avatar || "🤖",
          taskTitle: task?.title || "Unknown Task",
          linearIdentifier: task?.linearIdentifier,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get comment count for a task
 */
export const getCommentCount = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("taskComments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    return comments.length;
  },
});

/**
 * Delete a comment (only by author or PM)
 */
export const deleteComment = mutation({
  args: {
    commentId: v.id("taskComments"),
    agentName: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    const agents = await ctx.db.query("agents").collect();
    const agent = agents.find(
      (a) => a.name.toLowerCase() === args.agentName.toLowerCase()
    );

    if (!agent) {
      throw new Error(`Agent not found: ${args.agentName}`);
    }

    // Only author or PM can delete
    const isAuthor = comment.fromAgentId === agent._id;
    const isPM = agent.role === "pm";

    if (!isAuthor && !isPM) {
      throw new Error("Only the author or PM can delete comments");
    }

    await ctx.db.delete(args.commentId);

    return { deleted: true };
  },
});
