#!/bin/bash
# agent-send.sh - Reliable message delivery to EVOX agents
# Usage: agent-send <agent> "message"
# Example: agent-send leo "Build dashboard now"

AGENT=$1
MESSAGE=$2

if [ -z "$AGENT" ] || [ -z "$MESSAGE" ]; then
    echo "Usage: agent-send <agent> <message>"
    echo "Agents: max, sam, leo, quinn, maya"
    exit 1
fi

SESSION="evox-$AGENT"

# Check if session exists
if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "❌ Session $SESSION not found"
    exit 1
fi

# Method: load-buffer + paste + Enter (most reliable)
echo "$MESSAGE" | tmux load-buffer -
tmux paste-buffer -t "$SESSION"
tmux send-keys -t "$SESSION" Enter

echo "✅ Sent to $AGENT"

# Batch send to all agents
send_all() {
    for agent in max sam leo; do
        agent-send "$agent" "$1"
    done
}
