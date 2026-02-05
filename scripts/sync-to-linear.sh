#!/bin/bash
# sync-to-linear.sh - Create ticket in Convex, sync to Linear
# Usage: ./sync-to-linear.sh <agent> "<task description>"

set -e

EVOX_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LINEAR_API_KEY=$(grep LINEAR_API_KEY "$EVOX_DIR/.env.local" 2>/dev/null | cut -d'=' -f2)
TEAM_ID="2a06122d-f98e-45ac-8003-326b4c09cd4c"  # Agent Factory

AGENT="${1:-}"
TASK="${2:-}"

if [ -z "$AGENT" ] || [ -z "$TASK" ]; then
  echo "Usage: ./sync-to-linear.sh <agent> \"<task description>\""
  exit 1
fi

AGENT_UPPER=$(echo "$AGENT" | tr '[:lower:]' '[:upper:]')

echo "📝 Creating task for $AGENT_UPPER..."

# 1. Create in Convex (fast)
echo "   → Convex dispatch..."
convex_result=$(curl -s -X POST "https://gregarious-elk-556.convex.site/createDispatch" \
  -H "Content-Type: application/json" \
  -d "{\"agentName\":\"$AGENT_UPPER\",\"command\":\"$TASK\"}")
dispatch_id=$(echo "$convex_result" | jq -r '.dispatchId // empty')
echo "   ✅ Convex: $dispatch_id"

# 2. Create in Linear (for CEO visibility)
echo "   → Linear ticket..."
linear_result=$(curl -s -X POST "https://api.linear.app/graphql" \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { issueCreate(input: { teamId: \\\"$TEAM_ID\\\", title: \\\"[$AGENT_UPPER] $TASK\\\", description: \\\"Created from Convex dispatch: $dispatch_id\\\" }) { success issue { identifier url } } }\"}")
linear_id=$(echo "$linear_result" | jq -r '.data.issueCreate.issue.identifier // empty')
linear_url=$(echo "$linear_result" | jq -r '.data.issueCreate.issue.url // empty')

if [ -n "$linear_id" ]; then
  echo "   ✅ Linear: $linear_id"
  echo ""
  echo "📋 Task created!"
  echo "   Agent: $AGENT_UPPER"
  echo "   Task: $TASK"
  echo "   Convex ID: $dispatch_id"
  echo "   Linear: $linear_id ($linear_url)"
else
  echo "   ⚠️ Linear failed, but Convex OK"
fi
