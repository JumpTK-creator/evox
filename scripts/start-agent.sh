#!/bin/bash
# start-agent.sh — Start agent in tmux session
# Usage: ./scripts/start-agent.sh <agent> [task]

set -e

AGENT="${1:-}"
TASK="${2:-Read your identity file and check for pending tasks. Use docs/AGENT-API.md for self-service APIs.}"

if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/start-agent.sh <agent> [task]"
  exit 1
fi

AGENT_LOWER=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')
SESSION="evox-$AGENT_LOWER"

# Kill existing session if any
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Boot context
./scripts/boot.sh "$AGENT_LOWER"

# Start tmux session with Claude Code
tmux new-session -d -s "$SESSION" -c "$(pwd)" \
  "claude --dangerously-skip-permissions --system-prompt \"\$(cat .claude-context)\" \"$TASK\""

echo "✅ Started $AGENT in tmux session: $SESSION"
echo "   Attach: tmux attach -t $SESSION"
echo "   List:   tmux list-sessions"
