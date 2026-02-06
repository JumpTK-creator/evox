#!/bin/bash
# Continuous heartbeat loop - auto-detects device
# Usage: ./scripts/heartbeat-loop.sh <agent> [task] [interval]
#
# Example:
#   ./scripts/heartbeat-loop.sh evox "monitoring" 60
#   ./scripts/heartbeat-loop.sh max "AGT-324" 120

set -e

AGENT="${1:-}"
TASK="${2:-idle}"
INTERVAL="${3:-60}" # Default: 60 seconds

if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/heartbeat-loop.sh <agent> [task] [interval]"
  echo "Example: ./scripts/heartbeat-loop.sh evox 'monitoring' 60"
  exit 1
fi

# Auto-detect device
HOSTNAME=$(hostname)
if [[ "$HOSTNAME" == *"mini"* ]] || [[ "$HOSTNAME" == *"Mini"* ]]; then
  DEVICE="mac-mini"
  SCRIPT="./scripts/heartbeat-mac-mini.sh"
else
  DEVICE="macbook"
  SCRIPT="./scripts/heartbeat-macbook.sh"
fi

echo "🔄 Starting heartbeat loop for $AGENT on $DEVICE"
echo "   Task: $TASK"
echo "   Interval: ${INTERVAL}s"
echo "   Press Ctrl+C to stop"
echo ""

# Continuous loop
while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$TIMESTAMP] Sending heartbeat..."

  if $SCRIPT "$AGENT" "$TASK" ""; then
    echo "[$TIMESTAMP] ✓ Success"
  else
    echo "[$TIMESTAMP] ✗ Failed"
  fi

  echo ""
  sleep "$INTERVAL"
done
