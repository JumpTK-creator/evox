/**
 * Agent Completion API Endpoint (AGT-124)
 *
 * POST /api/agent/complete
 *
 * Allows agents to report task completion directly to Convex
 * with correct attribution (bypassing Linear API key attribution issue).
 *
 * Request body:
 * {
 *   "agent": "sam" | "leo" | "max" | "ella",
 *   "ticket": "AGT-124",
 *   "action": "completed" | "in_progress" | "comment",
 *   "summary": "What was done",
 *   "filesChanged": ["file1.ts", "file2.ts"],  // optional
 *   "commitHash": "abc1234"                     // optional
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { AGENT_ORDER } from "@/lib/constants";

// Lazily initialize Convex client (avoid build-time evaluation)
function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
  }
  return new ConvexHttpClient(url);
}

// Valid values for validation
const VALID_AGENTS = AGENT_ORDER;
const VALID_ACTIONS = ["completed", "in_progress", "comment"] as const;

type AgentName = (typeof VALID_AGENTS)[number];
type ActionType = (typeof VALID_ACTIONS)[number];

interface CompleteTaskRequest {
  agent: AgentName;
  ticket: string;
  action: ActionType;
  summary: string;
  filesChanged?: string[];
  commitHash?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CompleteTaskRequest = await request.json();

    // Validate required fields
    if (!body.agent || !body.ticket || !body.action || !body.summary) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: agent, ticket, action, summary",
        },
        { status: 400 }
      );
    }

    // Validate agent name
    if (!VALID_AGENTS.includes(body.agent)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid agent. Must be one of: ${VALID_AGENTS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate action
    if (!VALID_ACTIONS.includes(body.action)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Call Convex mutation
    const convex = getConvexClient();
    const result = await convex.mutation(api.agentActions.completeTask, {
      agent: body.agent,
      ticket: body.ticket,
      action: body.action,
      summary: body.summary,
      filesChanged: body.filesChanged,
      commitHash: body.commitHash,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent completion API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Also support GET for health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/agent/complete",
    method: "POST",
    requiredFields: ["agent", "ticket", "action", "summary"],
    optionalFields: ["filesChanged", "commitHash"],
    validAgents: VALID_AGENTS,
    validActions: VALID_ACTIONS,
  });
}
