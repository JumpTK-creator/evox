#!/bin/bash
# onboard-agent.sh — Auto-onboard new agent
# Usage: ./scripts/onboard-agent.sh <role> [reason]
# Example: ./scripts/onboard-agent.sh backend "High backlog"

set -e

ROLE="${1:-}"
REASON="${2:-Manual onboarding}"

if [ -z "$ROLE" ]; then
  echo "Usage: ./scripts/onboard-agent.sh <role> [reason]"
  echo ""
  echo "Available roles:"
  echo "  backend   - Backend engineer (SAM clone)"
  echo "  frontend  - Frontend engineer (LEO clone)"
  echo "  qa        - QA engineer (QUINN clone)"
  echo "  pm        - Project manager (MAX clone)"
  echo "  devops    - DevOps engineer (ALEX - new)"
  echo "  content   - Content creator (ELLA - new)"
  exit 1
fi

CONVEX_URL="https://gregarious-elk-556.convex.site"

echo "╔════════════════════════════════════════════════╗"
echo "║  EVOX Agent Onboarding                         ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Role: $ROLE"
echo "Reason: $REASON"
echo ""

# Call Convex to spawn agent
RESPONSE=$(curl -s -X POST "$CONVEX_URL/spawnAgent" \
  -H "Content-Type: application/json" \
  -d "{\"role\":\"$ROLE\",\"reason\":\"$REASON\"}" 2>/dev/null || echo '{"error":"Failed to connect"}')

# Parse response
SUCCESS=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null || echo "false")
NAME=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('name', 'unknown'))" 2>/dev/null || echo "unknown")

if [ "$SUCCESS" = "True" ] || [ "$SUCCESS" = "true" ]; then
  echo "✅ Agent $NAME created successfully!"
  echo ""
  echo "To start the agent:"
  echo "  ./scripts/agent-loop.sh $(echo $NAME | tr '[:upper:]' '[:lower:]')"
  echo ""
  echo "Or add to start-all-agents.sh for auto-start."
else
  echo "❌ Failed to create agent"
  echo "Response: $RESPONSE"
  echo ""
  echo "Fallback: Creating agent manually..."

  # Fallback: Add to agents table via direct mutation
  echo "Run this in Convex dashboard:"
  echo "  npx convex run agentTemplates:autoSpawn '{\"role\":\"$ROLE\",\"reason\":\"$REASON\"}'"
fi
