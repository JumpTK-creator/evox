#!/bin/bash
# MAX continuous inbox monitoring
# Checks every 30 seconds for new messages

INTERVAL=30
API_BASE="https://gregarious-elk-556.convex.site/v2"

echo "🤖 MAX monitoring started (checking every ${INTERVAL}s)"
echo "Press Ctrl+C to stop"
echo ""

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

  # Fetch messages
  MESSAGES=$(curl -s "${API_BASE}/getMessages?agent=max")

  # Count unread
  UNREAD_COUNT=$(echo "$MESSAGES" | jq '[.dms[] | select(.read == false)] | length')

  if [ "$UNREAD_COUNT" -gt 0 ]; then
    echo "[$TIMESTAMP] 📬 $UNREAD_COUNT unread message(s)"

    # Show most recent unread message
    echo "$MESSAGES" | jq -r '.dms[] | select(.read == false) | "\(.fromAgent): \(.content | .[0:100])..." | @text' | head -1
    echo ""
  else
    echo "[$TIMESTAMP] ✓ No new messages"
  fi

  sleep $INTERVAL
done
