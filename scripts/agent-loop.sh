#!/bin/bash
# agent-loop.sh — Run agent in continuous loop (same session)
#
# Usage: ./scripts/agent-loop.sh <agent>
# Example: ./scripts/agent-loop.sh sam
#
# Agent works on tasks continuously until queue is empty.

set -e

AGENT="${1:-}"
if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/agent-loop.sh <agent>"
  exit 1
fi

AGENT=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONVEX_URL="https://gregarious-elk-556.convex.site"

cd "$PROJECT_DIR"

echo "=== $AGENT Agent Loop Starting ==="
echo ""

while true; do
  # Get next dispatch for this specific agent
  RESPONSE=$(curl -s "$CONVEX_URL/getNextDispatchForAgent?agent=$AGENT")

  DISPATCH_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('dispatchId',''))" 2>/dev/null)
  TICKET=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('ticket',''))" 2>/dev/null)

  # Check if we got a task
  if [ -z "$DISPATCH_ID" ] || [ "$DISPATCH_ID" = "null" ] || [ -z "$TICKET" ] || [ "$TICKET" = "null" ]; then
    echo "No tasks for $AGENT. Checking again in 60s..."
    sleep 60
    continue
  fi

  echo "=== Task: $TICKET ==="

  # Mark dispatch as running
  curl -s "$CONVEX_URL/markDispatchRunning?dispatchId=$DISPATCH_ID" > /dev/null

  # Boot agent with context
  ./scripts/boot.sh "$AGENT" "$TICKET"

  # Build prompt
  PROMPT="You are $AGENT.
Read your context file (.claude-context or .cursorrules).
Your task: $TICKET

Instructions:
1. Read the task description from Linear or your context
2. Implement the feature/fix
3. Test your changes
4. Commit with 'closes $TICKET: description'
5. Push to remote
6. When done, say 'TASK_COMPLETE'

Start working now."

  echo ""
  echo "Starting Claude for $TICKET..."
  echo ""

  # Run Claude - will exit when task complete
  if claude --dangerously-skip-permissions "$PROMPT"; then
    # Claude exited successfully - mark dispatch as completed
    echo ""
    echo "=== $TICKET completed ==="
    curl -s "$CONVEX_URL/markDispatchCompleted?dispatchId=$DISPATCH_ID" > /dev/null
  else
    # Claude exited with error - mark dispatch as failed
    echo ""
    echo "=== $TICKET failed ==="
    curl -s "$CONVEX_URL/markDispatchFailed?dispatchId=$DISPATCH_ID&error=Claude%20exited%20with%20error" > /dev/null
  fi

  echo "Checking for next task..."
  echo ""

  sleep 5
done
