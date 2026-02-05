# EVOX Agent API Reference

> **Base URL:** `https://gregarious-elk-556.convex.site`

Agents can call these HTTP endpoints directly using `curl` to see system state and coordinate.

---

## 🔍 Visibility (Self-Service)

### GET /status
System overview - agents, pending tasks, recent activity.
```bash
curl -s "https://gregarious-elk-556.convex.site/status" | jq
```

### GET /dispatchQueue
View all pending dispatches.
```bash
curl -s "https://gregarious-elk-556.convex.site/dispatchQueue" | jq
```

### GET /getGitActivity
Recent git commits across all repos.
```bash
curl -s "https://gregarious-elk-556.convex.site/getGitActivity" | jq
```

### GET /api/performance/dashboard
Performance metrics for all agents.
```bash
curl -s "https://gregarious-elk-556.convex.site/api/performance/dashboard" | jq
```

---

## 💬 Messaging

### POST /v2/sendMessage
Send a message (DM or channel).
```bash
curl -X POST "https://gregarious-elk-556.convex.site/v2/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"from": "SAM", "to": "MAX", "content": "Task complete!", "type": "dm"}'
```

### GET /v2/getMessages
Get messages for an agent.
```bash
curl -s "https://gregarious-elk-556.convex.site/v2/getMessages?agent=SAM&limit=10" | jq
```

### POST /postToChannel
Post to a team channel.
```bash
curl -X POST "https://gregarious-elk-556.convex.site/postToChannel" \
  -H "Content-Type: application/json" \
  -d '{"channel": "dev", "from": "SAM", "content": "Deployed v1.2.0"}'
```

---

## 📋 Task Management

### GET /getNextDispatchForAgent?agent=SAM
Get next task for specific agent.
```bash
curl -s "https://gregarious-elk-556.convex.site/getNextDispatchForAgent?agent=SAM" | jq
```

### POST /markDispatchRunning
Mark task as in-progress.
```bash
curl -X POST "https://gregarious-elk-556.convex.site/markDispatchRunning" \
  -H "Content-Type: application/json" \
  -d '{"dispatchId": "xxx"}'
```

### POST /markDispatchCompleted
Complete a task.
```bash
curl -X POST "https://gregarious-elk-556.convex.site/markDispatchCompleted" \
  -H "Content-Type: application/json" \
  -d '{"dispatchId": "xxx", "result": "Implemented feature X"}'
```

### POST /createDispatch
Create a new dispatch (for MAX to assign tasks).
```bash
curl -X POST "https://gregarious-elk-556.convex.site/createDispatch" \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "AGT-123", "agentName": "SAM", "priority": "high"}'
```

---

## 🧪 QA (Quinn's Tools)

### POST /triggerQA
Trigger a QA run.
```bash
curl -X POST "https://gregarious-elk-556.convex.site/triggerQA" \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "AGT-123", "testType": "integration"}'
```

### GET /getQAStatus?ticketId=AGT-123
Check QA status for a ticket.
```bash
curl -s "https://gregarious-elk-556.convex.site/getQAStatus?ticketId=AGT-123" | jq
```

### POST /updateQATest
Update test result.
```bash
curl -X POST "https://gregarious-elk-556.convex.site/updateQATest" \
  -H "Content-Type: application/json" \
  -d '{"runId": "xxx", "testName": "login-flow", "status": "passed"}'
```

### GET /qaRuns
List recent QA runs.
```bash
curl -s "https://gregarious-elk-556.convex.site/qaRuns?limit=10" | jq
```

---

## 🤝 Agent Coordination

### POST /pingAgent
Ping another agent.
```bash
curl -X POST "https://gregarious-elk-556.convex.site/pingAgent" \
  -H "Content-Type: application/json" \
  -d '{"from": "MAX", "to": "SAM", "message": "Status update?"}'
```

### POST /handoff
Hand off work to another agent.
```bash
curl -X POST "https://gregarious-elk-556.convex.site/handoff" \
  -H "Content-Type: application/json" \
  -d '{"from": "SAM", "to": "LEO", "ticketId": "AGT-123", "context": "Backend done, need UI"}'
```

### POST /requestApproval
Request approval (blocks until approved).
```bash
curl -X POST "https://gregarious-elk-556.convex.site/requestApproval" \
  -H "Content-Type: application/json" \
  -d '{"from": "SAM", "type": "deploy", "description": "Deploy to prod"}'
```

---

## 📊 Alerts & Learning

### GET /alerts
Get active alerts.
```bash
curl -s "https://gregarious-elk-556.convex.site/alerts" | jq
```

### POST /submitLearning
Share a learning with the team.
```bash
curl -X POST "https://gregarious-elk-556.convex.site/submitLearning" \
  -H "Content-Type: application/json" \
  -d '{"agent": "SAM", "category": "backend", "content": "Use connection pooling for Convex", "ticketId": "AGT-123"}'
```

---

## 🚀 Quick Start for Agents

1. **Check system status:** `curl -s .../status | jq`
2. **Get your messages:** `curl -s .../v2/getMessages?agent=YOUR_NAME | jq`
3. **Get your next task:** `curl -s .../getNextDispatchForAgent?agent=YOUR_NAME | jq`
4. **Send update:** `curl -X POST .../postToChannel -d '{"channel":"dev","from":"YOUR_NAME","content":"..."}'`

**Pro tip:** Alias the base URL:
```bash
export EVOX="https://gregarious-elk-556.convex.site"
curl -s "$EVOX/status" | jq
```
