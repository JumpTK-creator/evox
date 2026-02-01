#!/bin/bash
# Linear Report Script — Post status updates to Linear tickets
# Usage: ./scripts/linear-report.sh AGT-107 "✅ Done. Added agentMemory schema."

set -e

# Load environment
if [ -f .env.local ]; then
  source .env.local
elif [ -f ../.env.local ]; then
  source ../.env.local
fi

if [ -z "$LINEAR_API_KEY" ]; then
  echo "❌ LINEAR_API_KEY not set. Create .env.local with LINEAR_API_KEY=..."
  exit 1
fi

TICKET_ID=$1
MESSAGE=$2

if [ -z "$TICKET_ID" ] || [ -z "$MESSAGE" ]; then
  echo "Usage: ./scripts/linear-report.sh AGT-XXX \"message\""
  exit 1
fi

# Get issue UUID from identifier (Linear accepts identifier directly)
ISSUE_UUID=$(curl -s -X POST https://api.linear.app/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: $LINEAR_API_KEY" \
  -d "{\"query\": \"{ issue(id: \\\"$TICKET_ID\\\") { id } }\"}" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$ISSUE_UUID" ]; then
  echo "❌ Could not find $TICKET_ID in Linear"
  exit 1
fi

# Post comment
RESULT=$(curl -s -X POST https://api.linear.app/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: $LINEAR_API_KEY" \
  -d "{\"query\": \"mutation { commentCreate(input: { issueId: \\\"$ISSUE_UUID\\\", body: \\\"$MESSAGE\\\" }) { success } }\"}")

if echo "$RESULT" | grep -q '"success":true'; then
  echo "✅ Reported to $TICKET_ID"
else
  echo "❌ Failed to report to $TICKET_ID"
  echo "$RESULT"
  exit 1
fi
