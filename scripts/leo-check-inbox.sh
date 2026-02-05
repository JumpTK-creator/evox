#!/bin/bash
# Quick inbox check for LEO
curl -s "https://gregarious-elk-556.convex.site/v2/getMessages?agent=leo&limit=5" | jq '{
  unread: .unreadCount,
  messages: [.unreadDMs[]? | {from: .fromAgent, content: .content[0:200]}]
}'
