#!/bin/bash
# MAX inbox checker
# Polls for unread messages every 30s

API_BASE="https://gregarious-elk-556.convex.site/v2"

# Fetch unread messages
MESSAGES=$(curl -s "${API_BASE}/getMessages?agent=max")

# Count unread messages
UNREAD_COUNT=$(echo "$MESSAGES" | jq '[.dms[] | select(.read == false)] | length')

if [ "$UNREAD_COUNT" -gt 0 ]; then
  echo "📬 MAX has $UNREAD_COUNT unread message(s)"
  echo "$MESSAGES" | jq -r '.dms[] | select(.read == false) | "FROM: \(.fromAgent)\nMSG: \(.content)\nID: \(._id)\n---"'
else
  echo "📭 No new messages"
fi
