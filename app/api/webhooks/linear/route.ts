/**
 * Linear Webhook Endpoint (AGT-159: Fix sync chain)
 *
 * POST /api/webhooks/linear
 *
 * Receives webhook events from Linear when issues change status.
 * This enables real-time sync instead of relying on periodic polling.
 *
 * Setup in Linear:
 * 1. Go to Settings → Webhooks
 * 2. Create webhook with URL: https://evox-ten.vercel.app/api/webhooks/linear
 * 3. Select events: Issue → State Change
 * 4. Copy the Signing Secret to EVOX env as LINEAR_WEBHOOK_SECRET
 *
 * Webhook payload example (Issue state change):
 * {
 *   "action": "update",
 *   "type": "Issue",
 *   "data": {
 *     "id": "uuid",
 *     "identifier": "AGT-159",
 *     "title": "...",
 *     "state": { "name": "Done" },
 *     "assignee": { "name": "Sam" }
 *   },
 *   "updatedFrom": { "stateId": "old-state-id" }
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";

// Lazily initialize Convex client
function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
  }
  return new ConvexHttpClient(url);
}

// Map Linear status names to EVOX status
function mapLinearStatus(
  linearStatus: string
): "backlog" | "todo" | "in_progress" | "review" | "done" {
  const statusLower = linearStatus.toLowerCase();

  if (statusLower.includes("backlog")) return "backlog";
  if (statusLower.includes("todo")) return "todo";
  if (statusLower.includes("in progress") || statusLower.includes("started")) {
    return "in_progress";
  }
  if (statusLower.includes("done") || statusLower.includes("completed") || statusLower.includes("closed")) {
    return "done";
  }
  if (statusLower.includes("review")) return "review";

  return "todo";
}

// Map Linear priority (1-4) to EVOX priority
function mapLinearPriority(
  linearPriority: number
): "low" | "medium" | "high" | "urgent" {
  switch (linearPriority) {
    case 1:
      return "urgent";
    case 2:
      return "high";
    case 3:
      return "medium";
    case 4:
      return "low";
    default:
      return "medium";
  }
}

// Verify webhook signature (optional but recommended)
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  if (!secret) {
    // No secret configured, skip verification (dev mode)
    console.warn("LINEAR_WEBHOOK_SECRET not set, skipping signature verification");
    return true;
  }
  if (!signature) {
    console.error("No signature provided in webhook request");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const expectedSignature = hmac.update(body).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Parse agent name from assignee or description
function parseAgentFromIssue(data: any): string {
  // Try assignee name first
  const assigneeName = data.assignee?.name?.toLowerCase();
  if (assigneeName === "sam" || assigneeName === "leo" || assigneeName === "max") {
    return assigneeName;
  }

  // Try description patterns
  const description = data.description || "";
  const descLower = description.toLowerCase();

  if (descLower.includes("sam's steps") || descLower.includes("sam (backend)")) return "sam";
  if (descLower.includes("leo's steps") || descLower.includes("leo (frontend)")) return "leo";
  if (descLower.includes("max's steps") || descLower.includes("max (pm)")) return "max";

  const agentMatch = descLower.match(/##?\s*agent:\s*(sam|leo|max)/i);
  if (agentMatch) return agentMatch[1].toLowerCase();

  const dispatchMatch = description.match(/^(Sam|Leo|Max):/im);
  if (dispatchMatch) return dispatchMatch[1].toLowerCase();

  // Default to max (PM)
  return "max";
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get("linear-signature");
    const secret = process.env.LINEAR_WEBHOOK_SECRET;

    // Verify signature
    if (!verifyWebhookSignature(bodyText, signature, secret)) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(bodyText);
    const { action, type, data, updatedFrom } = payload;

    // Only process Issue updates with state changes
    if (type !== "Issue") {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Ignoring ${type} event`,
      });
    }

    // Check if this is a state change or assignment change
    const isStateChange = action === "update" && updatedFrom?.stateId;
    const isAssignmentChange = action === "update" && updatedFrom?.assigneeId !== undefined;

    if (!isStateChange && !isAssignmentChange && action !== "create") {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "Not a state change, assignment change, or create event",
      });
    }

    // Extract issue data
    const linearId = data.id;
    const linearIdentifier = data.identifier;
    const title = data.title || "Untitled";
    const description = data.description || "";
    const stateName = data.state?.name || "Todo";
    const priority = data.priority || 3;
    const linearUrl = data.url || `https://linear.app/affitorai/issue/${linearIdentifier}`;

    const evoxStatus = mapLinearStatus(stateName);
    const evoxPriority = mapLinearPriority(priority);
    const agentName = parseAgentFromIssue(data);

    // Call Convex to upsert the task
    const convex = getConvexClient();

    // First, get the EVOX project ID
    const projects = await convex.query(api.projects.list);
    const evoxProject = projects.find((p: { name: string }) => p.name === "EVOX");

    if (!evoxProject) {
      console.error("EVOX project not found");
      return NextResponse.json(
        { success: false, error: "EVOX project not found" },
        { status: 500 }
      );
    }

    // Upsert the task
    const result = await convex.mutation(api.tasks.upsertByLinearId, {
      agentName: agentName,
      taskAgentName: agentName,
      projectId: evoxProject._id,
      linearId,
      linearIdentifier,
      linearUrl,
      title,
      description,
      status: evoxStatus,
      priority: evoxPriority,
      assignee: undefined, // Could resolve assignee ID if needed
      createdAt: new Date(data.createdAt || Date.now()).getTime(),
      updatedAt: new Date(data.updatedAt || Date.now()).getTime(),
    });

    // AGT-255: If this is an assignment change, fire agentEvent to wake agent
    if (isAssignmentChange && data.assignee) {
      const assigneeName = data.assignee.name?.toLowerCase();
      const validAgents = ["sam", "leo", "max", "quinn", "ella"];

      if (validAgents.includes(assigneeName)) {
        // Fire task_assigned event via Convex
        try {
          await convex.mutation(api.agentEvents.publishEvent, {
            type: "task_assigned",
            targetAgent: assigneeName,
            payload: {
              taskId: linearIdentifier,
              message: `New task assigned: ${title}`,
              priority: evoxPriority === "urgent" ? "urgent" : evoxPriority === "high" ? "high" : "normal",
              metadata: {
                linearUrl,
                assignedBy: "linear_webhook",
              },
            },
          });
        } catch (error) {
          console.error(`Failed to fire agentEvent for ${assigneeName}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      linearIdentifier,
      status: evoxStatus,
      created: result.created,
      statusChanged: result.statusChanged,
    });
  } catch (error) {
    console.error("Linear webhook error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/linear",
    description: "Linear webhook endpoint for real-time issue sync",
    setup: {
      step1: "Go to Linear Settings → Webhooks",
      step2: "Create webhook with URL: https://evox-ten.vercel.app/api/webhooks/linear",
      step3: "Select events: Issue → State Change, Issue → Create",
      step4: "Copy Signing Secret to env as LINEAR_WEBHOOK_SECRET",
    },
  });
}
