#!/bin/bash
# Start ttyd instances for all agent terminals
# Usage: ./start-terminals.sh

set -e

AGENTS=("max" "sam" "leo" "quinn" "maya")
PORTS=(7681 7682 7683 7684 7685)

echo "🖥️  Starting ttyd terminal servers..."

# Kill existing ttyd processes
pkill ttyd 2>/dev/null || true
sleep 1

# Start ttyd for each agent
for i in "${!AGENTS[@]}"; do
  agent="${AGENTS[$i]}"
  port="${PORTS[$i]}"
  session="evox-${agent}"
  
  # Check if tmux session exists
  if tmux has-session -t "$session" 2>/dev/null; then
    echo "  ✅ $agent → port $port (tmux session: $session)"
    ttyd -p "$port" bash -c "tmux attach -t $session || echo 'Session not found'" &
  else
    echo "  ⚠️  $agent → port $port (session not found, creating placeholder)"
    ttyd -p "$port" bash -c "echo 'Session $session not running'; sleep infinity" &
  fi
done

sleep 2

echo ""
echo "📡 Terminal servers running:"
echo "   MAX:   http://localhost:7681"
echo "   SAM:   http://localhost:7682"
echo "   LEO:   http://localhost:7683"
echo "   QUINN: http://localhost:7684"
echo "   MAYA:  http://localhost:7685"
echo ""
echo "🌐 Remote access via Tailscale:"
echo "   http://100.106.143.17:7681-7685"
echo ""
echo "💡 Terminals are read-only for safety"
