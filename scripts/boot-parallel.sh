#!/bin/bash
# boot-parallel.sh — Start 2 agents in parallel tmux windows
# Usage: ./scripts/boot-parallel.sh <agent1> <agent2>
# Example: ./scripts/boot-parallel.sh sam leo
#
# Each agent gets its own tmux window running Claude Code
# with their task prompt pre-loaded.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

AGENT1="${1:-}"
AGENT2="${2:-}"

if [ -z "$AGENT1" ] || [ -z "$AGENT2" ]; then
  echo "Usage: ./scripts/boot-parallel.sh <agent1> <agent2>"
  echo "Example: ./scripts/boot-parallel.sh sam leo"
  echo ""
  echo "Available agents: sam, leo, quinn, max, nova"
  exit 1
fi

A1_LOWER=$(echo "$AGENT1" | tr '[:upper:]' '[:lower:]')
A2_LOWER=$(echo "$AGENT2" | tr '[:upper:]' '[:lower:]')
A1_UPPER=$(echo "$AGENT1" | tr '[:lower:]' '[:upper:]')
A2_UPPER=$(echo "$AGENT2" | tr '[:lower:]' '[:upper:]')

SESSION="evox-work"

# Map agent to prompt file
get_prompt_file() {
  case "$1" in
    sam) echo "$PROJECT_DIR/prompts/agent-sam-agt337.md" ;;
    leo) echo "$PROJECT_DIR/prompts/agent-leo-agt336.md" ;;
    quinn) echo "$PROJECT_DIR/prompts/agent-quinn-tests.md" ;;
    max) echo "$PROJECT_DIR/prompts/agent-max-coordinator.md" ;;
    nova) echo "$PROJECT_DIR/prompts/agent-nova-security.md" ;;
    *) echo ""; return 1 ;;
  esac
}

PROMPT1=$(get_prompt_file "$A1_LOWER")
PROMPT2=$(get_prompt_file "$A2_LOWER")

if [ ! -f "$PROMPT1" ]; then
  echo "ERROR: No prompt file for $A1_UPPER at $PROMPT1"
  exit 1
fi
if [ ! -f "$PROMPT2" ]; then
  echo "ERROR: No prompt file for $A2_UPPER at $PROMPT2"
  exit 1
fi

echo "╔══════════════════════════════════════════════════╗"
echo "║  EVOX Parallel Agents                             ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Ensure latest code
echo "Pulling latest code..."
git pull origin main 2>/dev/null || true
echo ""

# Kill existing session if any
tmux kill-session -t "$SESSION" 2>/dev/null || true
sleep 1

# Create session with first agent
echo "Starting $A1_UPPER..."
tmux new-session -d -s "$SESSION" -n "$A1_LOWER" -c "$PROJECT_DIR" -x 200 -y 50
sleep 1

# Launch Claude Code with prompt for agent 1
tmux send-keys -t "$SESSION:$A1_LOWER" "claude --dangerously-skip-permissions -p \"$(cat "$PROMPT1" | sed 's/"/\\"/g' | tr '\n' ' ')\"" Enter

# Create second window
echo "Starting $A2_UPPER..."
tmux new-window -t "$SESSION" -n "$A2_LOWER" -c "$PROJECT_DIR"
sleep 1

# Launch Claude Code with prompt for agent 2
tmux send-keys -t "$SESSION:$A2_LOWER" "claude --dangerously-skip-permissions -p \"$(cat "$PROMPT2" | sed 's/"/\\"/g' | tr '\n' ' ')\"" Enter

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  2 agents running in tmux session '$SESSION'  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Monitor:"
echo "  tmux attach -t $SESSION"
echo "  Ctrl+B then 0 → $A1_UPPER"
echo "  Ctrl+B then 1 → $A2_UPPER"
echo ""
echo "Stop:"
echo "  tmux kill-session -t $SESSION"
echo ""
