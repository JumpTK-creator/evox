/**
 * CORE-208: HTTP API Key Authentication Middleware
 *
 * Wraps httpAction handlers to require `x-api-key` header.
 * Webhooks (GitHub, Linear, Vercel) should NOT use this — they have their own auth.
 *
 * Usage:
 *   handler: withAuth(async (ctx, request) => { ... })
 */

import { httpAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";

type HttpHandler = (ctx: ActionCtx, request: Request) => Promise<Response>;

/**
 * Constant-time string comparison using HMAC.
 * Prevents timing side-channel attacks on API key validation.
 * Uses Web Crypto API (available in Convex runtime).
 */
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode("evox-constant-time-compare");
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ]);
  const viewA = new Uint8Array(sigA);
  const viewB = new Uint8Array(sigB);
  if (viewA.length !== viewB.length) return false;
  let result = 0;
  for (let i = 0; i < viewA.length; i++) {
    result |= viewA[i] ^ viewB[i];
  }
  return result === 0;
}

/**
 * Verify HMAC-SHA256 webhook signature using Web Crypto API.
 * Returns true if signature matches, false otherwise.
 * Used by webhook endpoints in http.ts for GitHub, Linear, and Vercel.
 */
export async function verifyWebhookHmac(
  body: string,
  signature: string,
  secret: string,
  format: "hex" | "sha256-hex" = "hex"
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expected = format === "sha256-hex" ? `sha256=${expectedHex}` : expectedHex;
  return constantTimeEqual(signature, expected);
}

/**
 * Wrap an HTTP handler to require API key authentication.
 * Checks `x-api-key` header against EVOX_API_KEY env var.
 * Returns 401 if missing or invalid.
 * Uses constant-time comparison to prevent timing attacks (CWE-208).
 */
export function withAuth(handler: HttpHandler) {
  return httpAction(async (ctx: ActionCtx, request: Request) => {
    const apiKey = request.headers.get("x-api-key");
    const expected = process.env.EVOX_API_KEY;

    if (!expected) {
      console.error("EVOX_API_KEY not set in environment");
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!apiKey || !(await constantTimeEqual(apiKey, expected))) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return handler(ctx, request);
  });
}
