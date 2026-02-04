#!/bin/bash
# agent-loop.sh — Run agent in continuous loop (same session)
#
# Usage: ./scripts/agent-loop.sh <agent>
# Example: ./scripts/agent-loop.sh sam
#
# Agent works on tasks continuously until queue is empty.
# Includes: Lock file (prevent duplicates), Heartbeat updates

set -e

AGENT="${1:-}"
if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/agent-loop.sh <agent>"
  exit 1
fi

AGENT=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONVEX_URL="https://gregarious-elk-556.convex.site"
LOCK_FILE="$PROJECT_DIR/.lock-$AGENT"

cd "$PROJECT_DIR"

# === LOCK: Prevent duplicate processes ===
if [ -f "$LOCK_FILE" ]; then
  OLD_PID=$(cat "$LOCK_FILE")
  if ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo "ERROR: $AGENT already running (PID $OLD_PID)"
    echo "Kill it first: kill $OLD_PID"
    exit 1
  else
    echo "Stale lock file found, removing..."
    rm -f "$LOCK_FILE"
  fi
fi

echo $$ > "$LOCK_FILE"

# === HEARTBEAT FUNCTION ===
send_heartbeat() {
  local status="$1"
  local task="$2"
  curl -s -X POST "$CONVEX_URL/api/heartbeat" \
    -H "Content-Type: application/json" \
    -d "{\"agentName\":\"$AGENT\",\"status\":\"$status\",\"statusReason\":\"$task\"}" > /dev/null 2>&1 || true
}

# === SESSION END LOG ===
CURRENT_TICKET="none"
log_session_end() {
  echo ""
  echo "=== Session Ending (signal received) ==="
  send_heartbeat "offline" "session_killed"

  # Log to Convex learnings
  curl -s -X POST "$CONVEX_URL/v2/learn" \
    -H "Content-Type: application/json" \
    -d "{
      \"agent\": \"$AGENT\",
      \"taskId\": \"$CURRENT_TICKET\",
      \"taskTitle\": \"Session Terminated\",
      \"summary\": \"Session killed during task: $CURRENT_TICKET. PID: $$. Time: $(date)\",
      \"tags\": [\"session-end\", \"killed\"]
    }" > /dev/null 2>&1 || true

  echo "Session logged to Convex."
  rm -f "$LOCK_FILE"
}

# Trap exit signals to log before dying
trap 'log_session_end' EXIT SIGINT SIGTERM

echo "=== $AGENT Agent Loop Starting (PID $$) ==="
send_heartbeat "starting" "none"
echo ""

while true; do
  # Get next dispatch for this specific agent
  RESPONSE=$(curl -s "$CONVEX_URL/getNextDispatchForAgent?agent=$AGENT")

  DISPATCH_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('dispatchId',''))" 2>/dev/null)
  TICKET=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('ticket',''))" 2>/dev/null)

  # Check if we got a task
  if [ -z "$DISPATCH_ID" ] || [ "$DISPATCH_ID" = "null" ] || [ -z "$TICKET" ] || [ "$TICKET" = "null" ]; then
    send_heartbeat "idle" "none"
    echo "No tasks for $AGENT. Checking again in 60s..."
    sleep 60
    continue
  fi

  echo "=== Task: $TICKET ==="
  CURRENT_TICKET="$TICKET"
  send_heartbeat "working" "$TICKET"

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
