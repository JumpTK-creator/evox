#!/bin/bash
# Check device sync status
# Usage: ./scripts/check-sync.sh [device]
#
# Examples:
#   ./scripts/check-sync.sh          # All devices
#   ./scripts/check-sync.sh mac-mini # Specific device

set -e

DEVICE="${1:-}"
API_BASE="${CONVEX_URL:-https://gregarious-elk-556.convex.site}"

if [ -z "$DEVICE" ]; then
  # Get overview of all devices
  echo "📊 Device Sync Overview"
  echo "======================="
  echo ""

  RESPONSE=$(curl -s "$API_BASE/v2/syncOverview")

  # Pretty print with jq if available
  if command -v jq &> /dev/null; then
    echo "$RESPONSE" | jq -r '
      "Total Agents: \(.stats.totalAgents)",
      "Active: \(.stats.activeAgents)",
      "Stale: \(.stats.staleAgents)",
      "",
      "Devices:",
      (.devices[] |
        "  \(.device): \(.activeCount)/\(.totalCount) active",
        (.agents[] |
          "    - \(.agent): \(.status) \(if .isStale then "(stale)" else "" end) - \(.currentTask // "idle")"
        )
      )
    '
  else
    echo "$RESPONSE"
  fi
else
  # Get specific device
  echo "📊 Device: $DEVICE"
  echo "===================="
  echo ""

  RESPONSE=$(curl -s "$API_BASE/v2/deviceSessions?device=$DEVICE")

  if command -v jq &> /dev/null; then
    echo "$RESPONSE" | jq -r '
      .sessions[] |
      "Agent: \(.agent)",
      "Status: \(.status) \(if .isStale then "(stale)" else "" end)",
      "Task: \(.currentTask // "none")",
      "File: \(.currentFile // "none")",
      "Last Heartbeat: \(.lastHeartbeat | tonumber / 1000 | strftime("%Y-%m-%d %H:%M:%S"))",
      "---"
    '
  else
    echo "$RESPONSE"
  fi
fi
