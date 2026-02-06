#!/bin/bash
# Heartbeat script for MacBook (remote device)
# Usage: ./scripts/heartbeat-macbook.sh <agent> [task] [file]
#
# Example:
#   ./scripts/heartbeat-macbook.sh max "AGT-324" ""

set -e

AGENT="${1:-}"
TASK="${2:-}"
FILE="${3:-}"

if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/heartbeat-macbook.sh <agent> [task] [file]"
  echo "Example: ./scripts/heartbeat-macbook.sh max 'AGT-324'"
  exit 1
fi

# Convex API
API_BASE="${CONVEX_URL:-https://gregarious-elk-556.convex.site}"

# Device info
DEVICE="macbook"
HOSTNAME=$(hostname)
WORKING_DIR=$(pwd)
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

# Build metadata
METADATA=$(cat <<EOF
{
  "hostname": "$HOSTNAME",
  "workingDirectory": "$WORKING_DIR",
  "gitBranch": "$GIT_BRANCH"
}
EOF
)

# Build payload
PAYLOAD=$(cat <<EOF
{
  "device": "$DEVICE",
  "agent": "$AGENT",
  "status": "active",
  "currentTask": "$TASK",
  "currentFile": "$FILE",
  "metadata": $METADATA
}
EOF
)

# Send heartbeat
RESPONSE=$(curl -s -X POST "$API_BASE/v2/sessionState" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Check response
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✓ Heartbeat sent: $AGENT on $DEVICE"
  echo "  Task: ${TASK:-none}"
  echo "  File: ${FILE:-none}"
else
  echo "✗ Heartbeat failed:"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  exit 1
fi
