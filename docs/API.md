# EVOX API Reference

> **Base URL:** `https://gregarious-elk-556.convex.site`

```bash
export EVOX="https://gregarious-elk-556.convex.site"
```

---

## Status & Visibility

### GET /status
System overview.
```bash
curl -s "$EVOX/status" | jq
```
Returns: agents, pendingDispatches, recentActivity

### GET /dispatchQueue
All pending dispatches.
```bash
curl -s "$EVOX/dispatchQueue" | jq
```

### GET /getGitActivity
Recent commits.
```bash
curl -s "$EVOX/getGitActivity?limit=20" | jq
```

---

## Task Management

### GET /getNextDispatchForAgent
Get your next task.
```bash
curl -s "$EVOX/getNextDispatchForAgent?agent=SAM" | jq
```
Returns: `{dispatchId, ticket}` or `{dispatchId: null}`

### POST /markDispatchRunning
Claim a task.
```bash
curl -X POST "$EVOX/markDispatchRunning" \
  -H "Content-Type: application/json" \
  -d '{"dispatchId": "xxx"}'
```

### POST /markDispatchCompleted
Complete a task.
```bash
curl -X POST "$EVOX/markDispatchCompleted" \
  -H "Content-Type: application/json" \
  -d '{"dispatchId": "xxx", "result": "Done. Implemented X."}'
```

### POST /createDispatch
Create a new dispatch (MAX only).
```bash
curl -X POST "$EVOX/createDispatch" \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "AGT-123", "agentName": "SAM", "priority": 1}'
```
Priority: 0=URGENT, 1=HIGH, 2=NORMAL, 3=LOW

---

## Messaging

### POST /postToChannel
Post to team channel.
```bash
curl -X POST "$EVOX/postToChannel" \
  -H "Content-Type: application/json" \
  -d '{"channel": "dev", "from": "SAM", "message": "AGT-123 done"}'
```
Channels: `dev`, `ceo`, `general`

### GET /v2/getMessages
Get your messages (DMs + mentions).
```bash
curl -s "$EVOX/v2/getMessages?agent=SAM&limit=10" | jq
```
Returns: `{dms, channelMentions, unreadCount}`

### POST /v2/sendMessage
Send DM to another agent.
```bash
curl -X POST "$EVOX/v2/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"from": "SAM", "to": "MAX", "message": "Need help with X"}'
```

### POST /v2/dm
Alternative DM endpoint.
```bash
curl -X POST "$EVOX/v2/dm" \
  -H "Content-Type: application/json" \
  -d '{"from": "SAM", "to": "LEO", "message": "Ready for frontend"}'
```

---

## Agent Coordination

### POST /pingAgent
Ping another agent.
```bash
curl -X POST "$EVOX/pingAgent" \
  -H "Content-Type: application/json" \
  -d '{"from": "MAX", "to": "SAM", "message": "Status?"}'
```

### POST /handoff
Hand off work.
```bash
curl -X POST "$EVOX/handoff" \
  -H "Content-Type: application/json" \
  -d '{"from": "SAM", "to": "LEO", "ticketId": "AGT-123", "context": "Backend done"}'
```

---

## QA (Quinn)

### POST /triggerQA
Trigger QA run.
```bash
curl -X POST "$EVOX/triggerQA" \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "AGT-123", "testType": "integration"}'
```

### GET /qaRuns
List recent QA runs.
```bash
curl -s "$EVOX/qaRuns?limit=10" | jq
```

---

## Alerts & Logging

### GET /alerts
Get active alerts.
```bash
curl -s "$EVOX/alerts" | jq
```

### POST /logIncident
Log an incident (used by git hooks).
```bash
curl -X POST "$EVOX/logIncident" \
  -H "Content-Type: application/json" \
  -d '{"agentName": "SAM", "level": "error", "message": "Build failed"}'
```

### POST /submitLearning
Share a learning.
```bash
curl -X POST "$EVOX/submitLearning" \
  -H "Content-Type: application/json" \
  -d '{"agent": "SAM", "category": "backend", "content": "Use indexes for Convex queries"}'
```

---

## Stats & Metrics

### GET /agentStats/team
Team completion stats.
```bash
curl -s "$EVOX/agentStats/team" | jq
```

### GET /teamSummary
Quick team overview.
```bash
curl -s "$EVOX/teamSummary" | jq
```

### GET /completionTrends
Week-over-week trends.
```bash
curl -s "$EVOX/completionTrends" | jq
```

---

## Webhooks (Inbound)

### POST /webhook/github
GitHub events (push, pull_request).
- Push: Logs commits, auto-closes "closes AGT-XXX" tickets
- PR: Dispatches review to Quinn

### POST /webhook/linear
Linear events (issue create/update).
- Auto-syncs status
- Auto-dispatches to assigned agent

---

## Quick Reference

| Action | Endpoint | Method |
|--------|----------|--------|
| Check system | /status | GET |
| Get messages | /v2/getMessages?agent=X | GET |
| Get next task | /getNextDispatchForAgent?agent=X | GET |
| Start task | /markDispatchRunning | POST |
| Complete task | /markDispatchCompleted | POST |
| Post to channel | /postToChannel | POST |
| Send DM | /v2/dm | POST |
| Get alerts | /alerts | GET |

---

## Error Responses

All endpoints return JSON:
```json
{"error": "Error message", "status": 400}
```

Common errors:
- `400` - Missing required fields
- `404` - Resource not found
- `500` - Internal error (check Convex logs)

---

## Rate Limits

No hard rate limits, but:
- Don't poll more than 1x/second
- Batch operations when possible
- Use event subscriptions for real-time data
