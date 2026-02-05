#!/bin/bash
# agent-work-loop.sh — True 24/7 Autonomous Agent Work Loop
# Usage: ./scripts/agent-work-loop.sh <agent>
#
# This is THE infrastructure for 24/7 autonomous operation.
# Agent runs indefinitely: check queue → claim → execute → report → repeat
#
# Requirements:
# - tmux session named evox-<agent> running Claude Code
# - Convex API accessible
# - jq installed for JSON parsing

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

AGENT="${1:-}"
if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/agent-work-loop.sh <agent>"
  echo "Example: ./scripts/agent-work-loop.sh SAM"
  exit 1
fi

AGENT_LOWER=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')
AGENT_UPPER=$(echo "$AGENT" | tr '[:lower:]' '[:upper:]')
EVOX_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EVOX_API="https://gregarious-elk-556.convex.site"
TMUX_SESSION="evox-$AGENT_LOWER"
LOG_FILE="$EVOX_DIR/logs/agent-$AGENT_LOWER.log"

# Timing
POLL_INTERVAL=30        # Seconds between queue checks
HEARTBEAT_INTERVAL=300  # Seconds between heartbeats (5 min)
TASK_TIMEOUT=600        # Max seconds to wait for task completion (10 min)
COMPLETION_CHECK=30     # Seconds between completion checks

# ============================================================================
# SETUP
# ============================================================================

cd "$EVOX_DIR"
mkdir -p "$EVOX_DIR/logs"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "🤖 $AGENT_UPPER AUTONOMOUS WORK LOOP"
log "=========================================="
log "Directory: $EVOX_DIR"
log "API: $EVOX_API"
log "tmux: $TMUX_SESSION"
log "Poll interval: ${POLL_INTERVAL}s"
log ""

# ============================================================================
# API FUNCTIONS (Using GET endpoints - currently deployed)
# ============================================================================

# Get next pending dispatch for this agent
get_next_dispatch() {
  curl -s "$EVOX_API/getNextDispatchForAgent?agent=$AGENT_UPPER" 2>/dev/null || echo '{"dispatchId":null}'
}

# Mark dispatch as running (claim it)
mark_running() {
  local dispatch_id="$1"
  curl -s "$EVOX_API/markDispatchRunning?dispatchId=$dispatch_id" 2>/dev/null || echo '{"error":"failed"}'
}

# Mark dispatch as completed
mark_completed() {
  local dispatch_id="$1"
  local result="$2"
  # URL encode the result
  local encoded_result=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$result'))" 2>/dev/null || echo "completed")
  curl -s "$EVOX_API/markDispatchCompleted?dispatchId=$dispatch_id&result=$encoded_result" 2>/dev/null || echo '{"error":"failed"}'
}

# Mark dispatch as failed
mark_failed() {
  local dispatch_id="$1"
  local error="$2"
  local encoded_error=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$error'))" 2>/dev/null || echo "failed")
  curl -s "$EVOX_API/markDispatchFailed?dispatchId=$dispatch_id&error=$encoded_error" 2>/dev/null || echo '{"error":"failed"}'
}

# Send heartbeat to channel
send_heartbeat() {
  curl -s -X POST "$EVOX_API/postToChannel" \
    -H "Content-Type: application/json" \
    -d "{\"channel\": \"dev\", \"from\": \"$AGENT_UPPER\", \"message\": \"🫀 Heartbeat: Online, checking for work\"}" 2>/dev/null || true
}

# Post status to dev channel
post_status() {
  local message="$1"
  curl -s -X POST "$EVOX_API/postToChannel" \
    -H "Content-Type: application/json" \
    -d "{\"channel\": \"dev\", \"from\": \"$AGENT_UPPER\", \"message\": \"$message\"}" 2>/dev/null || true
}

# ============================================================================
# TMUX FUNCTIONS
# ============================================================================

# Check if tmux session exists
session_exists() {
  tmux has-session -t "$TMUX_SESSION" 2>/dev/null
}

# Send command to tmux session
send_to_tmux() {
  local cmd="$1"
  tmux send-keys -t "$TMUX_SESSION" "$cmd" Enter
}

# Get last N lines from tmux pane
get_tmux_output() {
  local lines="${1:-10}"
  tmux capture-pane -t "$TMUX_SESSION" -p | tail -n "$lines"
}

# Check if Claude is at prompt (idle)
is_claude_idle() {
  local output=$(get_tmux_output 5)
  # Claude Code shows "❯" when idle and waiting for input
  if [[ "$output" == *"❯"* ]] && [[ "$output" != *"Thinking"* ]] && [[ "$output" != *"..."* ]]; then
    return 0
  fi
  return 1
}

# Wait for Claude to become idle (task complete)
wait_for_completion() {
  local timeout="$1"
  local elapsed=0

  while [ $elapsed -lt $timeout ]; do
    sleep "$COMPLETION_CHECK"
    elapsed=$((elapsed + COMPLETION_CHECK))

    if is_claude_idle; then
      log "   ✅ Claude is idle (task likely complete)"
      return 0
    fi

    log "   ⏳ Still working... (${elapsed}s / ${timeout}s)"
  done

  log "   ⚠️ Timeout waiting for completion"
  return 1
}

# ============================================================================
# MAIN WORK LOOP
# ============================================================================

CYCLE=0
LAST_HEARTBEAT=0

# Startup announcement
post_status "🚀 Work loop started. Ready for tasks."

while true; do
  CYCLE=$((CYCLE + 1))
  CURRENT_TIME=$(date +%s)

  log ""
  log "🔄 Cycle $CYCLE - $(date '+%H:%M:%S')"

  # -------------------------------------------------------------------------
  # 1. HEARTBEAT (every 5 minutes)
  # -------------------------------------------------------------------------
  if [ $((CURRENT_TIME - LAST_HEARTBEAT)) -ge $HEARTBEAT_INTERVAL ]; then
    log "💓 Sending heartbeat..."
    send_heartbeat
    LAST_HEARTBEAT=$CURRENT_TIME
  fi

  # -------------------------------------------------------------------------
  # 2. CHECK DISPATCH QUEUE
  # -------------------------------------------------------------------------
  log "📋 Checking dispatch queue..."
  DISPATCH_RESPONSE=$(get_next_dispatch)
  DISPATCH_ID=$(echo "$DISPATCH_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('dispatchId') or '')" 2>/dev/null || echo "")

  if [ -z "$DISPATCH_ID" ] || [ "$DISPATCH_ID" = "null" ]; then
    log "   📭 No dispatch in queue"

    # -------------------------------------------------------------------------
    # SELF-ASSIGNMENT MODE (North Star: KHÔNG BAO GIỜ IDLE)
    # -------------------------------------------------------------------------
    log "   🔍 Entering self-assignment mode..."

    if session_exists && is_claude_idle; then
      # Build self-assignment prompt for Claude
      SELF_ASSIGN_PROMPT="You have no assigned dispatch. Time to SELF-ASSIGN work.

## SELF-ASSIGNMENT PROTOCOL (from docs/AGENT-AUTONOMY.md)

1. Check Linear backlog for unassigned tickets matching your skills
2. Check docs/ROADMAP.md for items in current phase
3. Check recent commits for bugs to fix
4. Enter improvement mode: refactor, test, document

## YOUR SKILLS (from agents/$AGENT_LOWER.md)
Read your agent file to know your territory.

## RULES
- KHÔNG BAO GIỜ IDLE > 5 min
- Align with NORTH-STAR.md
- Ship > Perfect

## ACTION
Pick ONE task and execute it. When done, report to #dev:
curl -X POST '$EVOX_API/postToChannel' -H 'Content-Type: application/json' -d '{\"channel\":\"dev\",\"from\":\"$AGENT_UPPER\",\"message\":\"🔄 Self-assigned: [what you did]\"}'

GO. Find work. Ship something."

      log "   📤 Sending self-assignment prompt to Claude..."
      send_to_tmux "$SELF_ASSIGN_PROMPT"

      # Wait shorter time for self-assigned work
      log "   ⏳ Waiting for self-assigned work (max 300s)..."
      wait_for_completion 300 || true
    fi

    log "   ⏳ Sleeping ${POLL_INTERVAL}s..."
    sleep "$POLL_INTERVAL"
    continue
  fi

  # -------------------------------------------------------------------------
  # 3. PARSE DISPATCH DETAILS
  # -------------------------------------------------------------------------
  COMMAND=$(echo "$DISPATCH_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command','work'))" 2>/dev/null || echo "work")
  PAYLOAD=$(echo "$DISPATCH_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('payload',''))" 2>/dev/null || echo "")
  TICKET=$(echo "$DISPATCH_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ticket') or '')" 2>/dev/null || echo "")

  log "   🎯 Found work!"
  log "   📦 Dispatch: $DISPATCH_ID"
  log "   🏷️  Command: $COMMAND"
  log "   🎫 Ticket: ${TICKET:-none}"

  # -------------------------------------------------------------------------
  # 4. CLAIM THE DISPATCH (mark as running)
  # -------------------------------------------------------------------------
  log "   🔒 Claiming dispatch..."
  CLAIM_RESULT=$(mark_running "$DISPATCH_ID")

  if echo "$CLAIM_RESULT" | grep -q "error"; then
    log "   ❌ Failed to claim dispatch"
    sleep "$POLL_INTERVAL"
    continue
  fi

  log "   ✅ Claimed successfully"

  # -------------------------------------------------------------------------
  # 5. CHECK TMUX SESSION
  # -------------------------------------------------------------------------
  if ! session_exists; then
    log "   ❌ tmux session '$TMUX_SESSION' not found"
    log "   📢 Marking dispatch as failed"
    mark_failed "$DISPATCH_ID" "tmux session not found"
    post_status "❌ Error: tmux session not found. Need restart."
    sleep "$POLL_INTERVAL"
    continue
  fi

  # -------------------------------------------------------------------------
  # 6. BUILD AND SEND TASK TO CLAUDE
  # -------------------------------------------------------------------------
  log "   📤 Sending task to Claude..."

  # Build the task prompt
  TASK_PROMPT="You have a new task assigned.

DISPATCH_ID: $DISPATCH_ID
COMMAND: $COMMAND
TICKET: ${TICKET:-none}
PAYLOAD: $PAYLOAD

Instructions:
1. Read your agent file: agents/$AGENT_LOWER.md
2. Do the work described above
3. Commit changes if any
4. When DONE, run these commands:
   curl -s '$EVOX_API/markDispatchCompleted?dispatchId=$DISPATCH_ID&result=Done'
   curl -X POST '$EVOX_API/postToChannel' -H 'Content-Type: application/json' -d '{\"channel\":\"dev\",\"from\":\"$AGENT_UPPER\",\"message\":\"✅ Completed: $COMMAND\"}'

GO. Execute this task now."

  # Send to tmux
  send_to_tmux "$TASK_PROMPT"

  # -------------------------------------------------------------------------
  # 7. WAIT FOR COMPLETION
  # -------------------------------------------------------------------------
  log "   ⏳ Waiting for task completion (max ${TASK_TIMEOUT}s)..."

  if wait_for_completion "$TASK_TIMEOUT"; then
    log "   ✅ Task appears complete"
    # Note: Claude should have called markDispatchCompleted
    # But we'll verify and mark if needed
    sleep 5  # Give Claude time to make API calls
  else
    log "   ⚠️ Task timed out, marking as failed"
    mark_failed "$DISPATCH_ID" "Timeout after ${TASK_TIMEOUT}s"
    post_status "⚠️ Task timed out: $COMMAND"
  fi

  # -------------------------------------------------------------------------
  # 8. BRIEF PAUSE BEFORE NEXT CYCLE
  # -------------------------------------------------------------------------
  log "   🔄 Ready for next task"
  sleep 5

done

log "🛑 Work loop ended"
