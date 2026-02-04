#!/bin/bash
# start-all-agents.sh — Auto-start all agents in tmux
# Used by launchd for auto-start on Mac login

set -e

PROJECT_DIR="/Users/sonpiaz/evox"
cd "$PROJECT_DIR"

# Create logs dir if not exists
mkdir -p logs

# Kill any existing agents
pkill -f "agent-loop.sh" 2>/dev/null || true
rm -f .lock-sam .lock-leo .lock-max 2>/dev/null || true

# Wait for any processes to clean up
sleep 2

# Start tmux session with all agents
tmux kill-session -t evox-agents 2>/dev/null || true

tmux new-session -d -s evox-agents -n sam
tmux send-keys -t evox-agents:sam "cd $PROJECT_DIR && ./scripts/agent-loop.sh sam" Enter

tmux new-window -t evox-agents -n leo
tmux send-keys -t evox-agents:leo "cd $PROJECT_DIR && ./scripts/agent-loop.sh leo" Enter

tmux new-window -t evox-agents -n max
tmux send-keys -t evox-agents:max "cd $PROJECT_DIR && ./scripts/agent-loop.sh max" Enter

echo "$(date): All agents started in tmux session 'evox-agents'" >> logs/launchd-out.log
echo "To attach: tmux attach -t evox-agents"
