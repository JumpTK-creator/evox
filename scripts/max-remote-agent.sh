#!/bin/bash
# MAX Remote Agent - Chạy trên máy cá nhân của Son
# Polls Convex messages và thực hiện tasks

CONVEX_URL="https://gregarious-elk-556.convex.site"
AGENT_NAME="max"
POLL_INTERVAL=15

echo "🤖 MAX Remote Agent starting..."
echo "📡 Polling Convex every ${POLL_INTERVAL}s"
echo ""

check_messages() {
  response=$(curl -s "${CONVEX_URL}/v2/getMessages?agent=${AGENT_NAME}&limit=5" 2>/dev/null)
  
  # Check for unread DMs
  unread=$(echo "$response" | jq -r '.unreadCount.dms // 0' 2>/dev/null)
  
  if [ "$unread" != "0" ] && [ "$unread" != "null" ]; then
    echo "📬 $unread unread message(s)!"
    echo "$response" | jq -r '.unreadDMs[] | "From: \(.fromAgent) | \(.content)"' 2>/dev/null
    echo "---"
  fi
}

send_message() {
  local to="$1"
  local message="$2"
  curl -s -X POST "${CONVEX_URL}/v2/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"from\":\"${AGENT_NAME}\",\"to\":\"${to}\",\"message\":\"${message}\"}" > /dev/null
  echo "📤 Sent to $to"
}

# Main loop
while true; do
  check_messages
  sleep $POLL_INTERVAL
done
