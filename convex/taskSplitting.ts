/**
 * AGT-265: Auto-Spawn Sub-Agents for Large Tasks
 *
 * When a ticket is complex, automatically:
 * 1. Analyze complexity (>3 files, multiple components, "and" in requirements)
 * 2. Split into sub-tasks
 * 3. Create Linear sub-issues
 * 4. Spawn parallel workers
 * 5. Track and merge results
 */

"use node";

import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { LinearClient } from "@linear/sdk";

/**
 * Analyze task complexity to determine if it should be split.
 *
 * Triggers for splitting:
 * - Description mentions >3 files to change
 * - Multiple components mentioned (e.g., "frontend AND backend")
 * - Contains "and" listing multiple requirements
 * - Estimate > 8 points (if available)
 */
export const analyzeComplexity = query({
  args: {
    taskId: v.string(), // Linear identifier like "AGT-265"
  },
  handler: async (ctx, args) => {
    // Get task from Convex
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_linearIdentifier", (q) =>
        q.eq("linearIdentifier", args.taskId.toUpperCase())
      )
      .first();

    if (!task) {
      return {
        shouldSplit: false,
        reason: "task_not_found",
        confidence: 0,
      };
    }

    const description = task.description.toLowerCase();
    const title = task.title.toLowerCase();
    const combined = `${title} ${description}`;

    let score = 0;
    const reasons: string[] = [];

    // Check 1: Multiple files mentioned
    const filePatterns = [
      /\d+\s*files?/i,
      /files?:\s*\[/i,
      /modify:\s*\[/i,
      /change:\s*\[/i,
    ];

    for (const pattern of filePatterns) {
      const match = combined.match(pattern);
      if (match) {
        // Extract number if present
        const numMatch = match[0].match(/(\d+)/);
        if (numMatch) {
          const numFiles = parseInt(numMatch[1]);
          if (numFiles > 3) {
            score += 30;
            reasons.push(`${numFiles} files mentioned`);
            break;
          }
        } else {
          // Pattern found but no number - assume multiple files
          score += 20;
          reasons.push("multiple files implied");
          break;
        }
      }
    }

    // Check 2: Multiple components/domains
    const componentKeywords = [
      "frontend and backend",
      "ui and api",
      "client and server",
      "database and api",
      "convex and nextjs",
      "backend and frontend",
    ];

    for (const keyword of componentKeywords) {
      if (combined.includes(keyword)) {
        score += 25;
        reasons.push(`cross-component work: ${keyword}`);
        break;
      }
    }

    // Check 3: Multiple requirements with "and"
    // Count instances of numbered lists or "and" separating distinct tasks
    const andCount = (combined.match(/\band\b/g) || []).length;
    const numberedListItems = (combined.match(/^\s*\d+\./gm) || []).length;

    if (numberedListItems > 3) {
      score += 20;
      reasons.push(`${numberedListItems} numbered items`);
    } else if (andCount > 2) {
      score += 15;
      reasons.push(`${andCount} "and" conjunctions`);
    }

    // Check 4: Implementation section with substeps
    if (combined.includes("implementation") || combined.includes("steps")) {
      const steps = combined.match(/^\s*[-•*]\s/gm) || [];
      if (steps.length > 4) {
        score += 20;
        reasons.push(`${steps.length} implementation steps`);
      }
    }

    // Check 5: Keywords suggesting complexity
    const complexityKeywords = [
      "multiple",
      "several",
      "various",
      "parallel",
      "distributed",
      "orchestrate",
      "coordinate",
      "integrate",
    ];

    let keywordCount = 0;
    for (const keyword of complexityKeywords) {
      if (combined.includes(keyword)) {
        keywordCount++;
      }
    }

    if (keywordCount > 2) {
      score += 15;
      reasons.push(`${keywordCount} complexity indicators`);
    }

    // Decision: score >= 40 = should split
    const shouldSplit = score >= 40;
    const confidence = Math.min(Math.round((score / 100) * 100), 100);

    return {
      shouldSplit,
      confidence,
      score,
      reasons,
      taskId: args.taskId,
      title: task.title,
    };
  },
});

/**
 * Split a task into sub-issues and spawn parallel workers.
 *
 * Usage from agent CLI:
 * npx convex run taskSplitting:splitTaskAuto '{"agent":"sam","taskId":"AGT-265","subtasks":[...]}'
 */
export const splitTaskAuto = action({
  args: {
    agent: v.string(), // "sam", "leo", "max", "quinn"
    taskId: v.string(), // Linear identifier like "AGT-265"
    subtasks: v.array(v.object({
      title: v.string(),
      description: v.string(),
      assignee: v.optional(v.string()), // Agent to assign (defaults to parent agent)
      labels: v.optional(v.array(v.string())),
    })),
    waitForCompletion: v.optional(v.boolean()), // If true, wait for all subtasks before reporting
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Get the parent task from Convex using analyzeComplexity query
    const analysis = await ctx.runQuery(api.taskSplitting.analyzeComplexity, {
      taskId: args.taskId.toUpperCase(),
    });

    if (analysis.confidence === 0) {
      return {
        success: false,
        error: "Parent task not found",
        taskId: args.taskId,
      };
    }

    // 2. Create sub-issues in Linear for tracking
    const subIssueIds: Array<{ title: string; identifier: string }> = [];

    for (const subtask of args.subtasks) {
      try {
        // Create Linear sub-issue
        const result = await ctx.runAction(api.taskSplitting.createLinearSubIssue, {
          parentIdentifier: args.taskId.toUpperCase(),
          title: subtask.title,
          description: subtask.description,
          assignee: subtask.assignee || args.agent,
          labels: subtask.labels,
        });

        if (result.success && result.identifier) {
          subIssueIds.push({
            title: subtask.title,
            identifier: result.identifier,
          });
        }
      } catch (error) {
        console.error(`Failed to create Linear sub-issue: ${error}`);
        // Continue with other subtasks even if one fails
      }
    }

    // 3. Create worker pool using parallelWorkers system
    const workerSubtasks = subIssueIds.map((sub, idx) => ({
      name: `worker-${idx + 1}`,
      command: "work_on_task",
      description: `${sub.identifier}: ${sub.title}`,
      payload: JSON.stringify({
        taskId: sub.identifier,
        parentTaskId: args.taskId,
        title: sub.title,
      }),
      priority: 1, // HIGH priority for sub-tasks
    }));

    let poolResult;
    if (workerSubtasks.length > 0) {
      poolResult = await ctx.runMutation(api.parallelWorkers.splitTask, {
        parentAgent: args.agent,
        taskId: args.taskId,
        subtasks: workerSubtasks,
        mergeStrategy: "all_success", // Wait for all workers
      });
    }

    // 4. Log the split in execution logs
    await ctx.runMutation(api.taskSplitting.logTaskSplit, {
      agent: args.agent,
      parentTaskId: args.taskId,
      subIssueCount: subIssueIds.length,
      subIssueIds: subIssueIds.map(s => s.identifier),
      poolId: poolResult?.poolId,
    });

    return {
      success: true,
      parentTask: args.taskId,
      subIssuesCreated: subIssueIds.length,
      subIssues: subIssueIds,
      workersSpawned: workerSubtasks.length,
      poolId: poolResult?.poolId,
      agent: args.agent,
    };
  },
});

/**
 * Internal: Create a Linear sub-issue
 */
export const createLinearSubIssue = action({
  args: {
    parentIdentifier: v.string(),
    title: v.string(),
    description: v.string(),
    assignee: v.string(),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      console.error("LINEAR_API_KEY not found in environment");
      return { success: false, error: "LINEAR_API_KEY not configured" };
    }

    try {
      const linear = new LinearClient({ apiKey });

      // Get parent issue to extract team
      const parentIssue = await linear.issue(args.parentIdentifier);
      if (!parentIssue) {
        return {
          success: false,
          error: "Parent issue not found",
        };
      }

      const team = await parentIssue.team;
      if (!team) {
        return {
          success: false,
          error: "Parent issue has no team",
        };
      }

      // Find assignee by name
      const users = await linear.users();
      const assigneeUser = users.nodes.find(
        (u) => u.name.toLowerCase() === args.assignee.toLowerCase()
      );

      // Get or create "Subtask" label
      const labels = await team.labels();
      let subtaskLabel = labels.nodes.find((l) => l.name === "Subtask");

      if (!subtaskLabel) {
        // Create subtask label if it doesn't exist
        const labelResult = await linear.createIssueLabel({
          name: "Subtask",
          color: "#94a3b8",
          teamId: team.id,
        });
        const createdLabel = await labelResult.issueLabel;
        if (createdLabel) {
          subtaskLabel = createdLabel;
        }
      }

      // Get backlog state
      const states = await team.states();
      const backlogState = states.nodes.find(
        (s) => s.name.toLowerCase() === "backlog"
      );

      // Create the sub-issue
      const createResult = await linear.createIssue({
        teamId: team.id,
        title: `[SUBTASK] ${args.title}`,
        description: `**Parent:** ${args.parentIdentifier}\n\n${args.description}`,
        parentId: parentIssue.id,
        assigneeId: assigneeUser?.id,
        stateId: backlogState?.id,
        labelIds: subtaskLabel ? [subtaskLabel.id] : [],
      });

      const createdIssue = await createResult.issue;
      if (!createdIssue) {
        return {
          success: false,
          error: "Failed to create issue",
        };
      }

      return {
        success: true,
        identifier: createdIssue.identifier,
        id: createdIssue.id,
      };
    } catch (error) {
      console.error("Failed to create Linear sub-issue:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  },
});

/**
 * Log task split activity
 */
export const logTaskSplit = mutation({
  args: {
    agent: v.string(),
    parentTaskId: v.string(),
    subIssueCount: v.number(),
    subIssueIds: v.array(v.string()),
    poolId: v.optional(v.id("workerPools")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find agent
    const agents = await ctx.db.query("agents").collect();
    const agent = agents.find(
      (a) => a.name.toLowerCase() === args.agent.toLowerCase()
    );

    if (!agent) {
      console.warn(`Agent not found: ${args.agent}`);
      return { success: false };
    }

    // Log to execution logs
    await ctx.db.insert("executionLogs", {
      agentName: args.agent.toLowerCase(),
      level: "info",
      message: `Split ${args.parentTaskId} into ${args.subIssueCount} subtasks: ${args.subIssueIds.join(", ")}`,
      linearIdentifier: args.parentTaskId,
      metadata: {
        poolId: args.poolId,
        subtasks: args.subIssueIds,
      },
      timestamp: now,
    });

    // Log activity event
    await ctx.db.insert("activityEvents", {
      agentId: agent._id,
      agentName: args.agent.toLowerCase(),
      category: "task",
      eventType: "task_split",
      title: `${args.agent.toUpperCase()} split ${args.parentTaskId} into ${args.subIssueCount} subtasks`,
      description: `Created subtasks: ${args.subIssueIds.join(", ")}`,
      linearIdentifier: args.parentTaskId,
      metadata: {
        source: "task_splitting",
        subtaskCount: args.subIssueCount,
        subtasks: args.subIssueIds,
      },
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Check if a task is a subtask (has parent)
 */
export const isSubtask = query({
  args: {
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_linearIdentifier", (q) =>
        q.eq("linearIdentifier", args.taskId.toUpperCase())
      )
      .first();

    if (!task) return { isSubtask: false };

    // Check if title starts with [SUBTASK] or description mentions parent
    const isSubtask =
      task.title.startsWith("[SUBTASK]") ||
      task.description.toLowerCase().includes("**parent:**");

    return {
      isSubtask,
      taskId: args.taskId,
      title: task.title,
    };
  },
});

/**
 * Get all subtasks for a parent task
 */
export const getSubtasks = query({
  args: {
    parentTaskId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all tasks where description mentions this parent
    const allTasks = await ctx.db
      .query("tasks")
      .collect();

    const subtasks = allTasks.filter((t) =>
      t.title.startsWith("[SUBTASK]") &&
      t.description.includes(args.parentTaskId.toUpperCase())
    );

    return subtasks.map((t) => ({
      id: t._id,
      identifier: t.linearIdentifier,
      title: t.title.replace("[SUBTASK] ", ""),
      status: t.status,
      assignee: t.assignee,
      agentName: t.agentName,
    }));
  },
});

/**
 * Simple API for agents to analyze and optionally split a task.
 *
 * Usage from CLI:
 * npx convex run taskSplitting:analyzeAndMaybeSplit '{"agent":"sam","taskId":"AGT-265","autoSplit":true}'
 */
export const analyzeAndMaybeSplit = action({
  args: {
    agent: v.string(),
    taskId: v.string(),
    autoSplit: v.optional(v.boolean()), // If true, automatically split if complex
  },
  handler: async (ctx, args) => {
    // Analyze complexity
    const analysis = await ctx.runQuery(api.taskSplitting.analyzeComplexity, {
      taskId: args.taskId,
    });

    if (!analysis.shouldSplit) {
      return {
        shouldSplit: false,
        ...analysis,
        message: "Task is not complex enough to split",
      };
    }

    // If autoSplit is false, just return analysis
    if (!args.autoSplit) {
      return {
        shouldSplit: true,
        ...analysis,
        message: "Task should be split (run with autoSplit:true to execute)",
      };
    }

    // Auto-generate suggested subtasks based on analysis
    const subtasks = [
      {
        title: `Setup and scaffolding for ${args.taskId}`,
        description: "Initial setup, file creation, and basic structure",
        assignee: args.agent,
        labels: ["Subtask", "Setup"],
      },
      {
        title: `Core implementation for ${args.taskId}`,
        description: "Main functionality implementation",
        assignee: args.agent,
        labels: ["Subtask", "Implementation"],
      },
      {
        title: `Testing and validation for ${args.taskId}`,
        description: "Tests, validation, and quality checks",
        assignee: "quinn",
        labels: ["Subtask", "Testing"],
      },
    ];

    // Split the task
    const splitResult = await ctx.runAction(api.taskSplitting.splitTaskAuto, {
      agent: args.agent,
      taskId: args.taskId,
      subtasks,
    });

    return {
      shouldSplit: true,
      ...analysis,
      splitExecuted: true,
      ...splitResult,
    };
  },
});
