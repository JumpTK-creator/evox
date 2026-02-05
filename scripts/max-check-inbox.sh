#!/bin/bash
# Quick inbox check for MAX
curl -s "https://gregarious-elk-556.convex.site/v2/getMessages?agent=max&limit=5" | jq '{
  unread: .unreadCount,
  messages: [.unreadDMs[]? | {from: .fromAgent, content: .content[0:100]}]
}'
