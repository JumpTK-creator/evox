#!/bin/bash
curl -s "https://gregarious-elk-556.convex.site/v2/getMessages?agent=sam&limit=5" | jq '{
  unread: .unreadCount,
  messages: [.unreadDMs[]? | {from: .fromAgent, content: .content[0:200]}]
}'
