/**
 * POST /api/agent/create-ticket
 * 
 * Allows agents (especially MAX) to create tickets in Linear.
 * 
 * Request body:
 * {
 *   "title": "Ticket title",
 *   "description": "Detailed description",
 *   "priority": "urgent" | "high" | "medium" | "low",
 *   "assignee": "sam" | "leo" | "max" | "quinn",
 *   "from": "max" // Agent creating the ticket
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "ticket": {
 *     "id": "...",
 *     "identifier": "AGT-XXX",
 *     "url": "https://linear.app/affitorai/issue/AGT-XXX",
 *     "title": "..."
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createLinearIssue } from "@/lib/evox/linear-client";

function authenticateRequest(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get("x-api-key");
  const expected = process.env.EVOX_API_KEY;

  if (!expected) {
    return NextResponse.json(
      { success: false, error: "Server misconfigured" },
      { status: 500 }
    );
  }

  if (!apiKey || apiKey !== expected) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null; // Authenticated
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authError = authenticateRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { title, description, priority, assignee } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "title is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "LINEAR_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Create the ticket in Linear
    const ticket = await createLinearIssue(apiKey, {
      title,
      description,
      priority: priority || "medium",
      assigneeName: assignee,
    });

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("[create-ticket] Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
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
    endpoint: "/api/agent/create-ticket",
    description: "Create tickets in Linear via POST request",
    usage: {
      method: "POST",
      body: {
        title: "string (required)",
        description: "string (optional)",
        priority: "urgent|high|medium|low (default: medium)",
        assignee: "sam|leo|max|quinn (optional)",
        from: "agent name creating the ticket",
      },
    },
  });
}
