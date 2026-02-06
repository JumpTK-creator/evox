# Device Sync System

**Cross-device agent synchronization for EVOX**

Last updated: 2026-02-06

---

## Overview

Hệ thống Device Sync cho phép agents làm việc trên nhiều devices (Mac Mini, MacBook) đồng bộ với nhau qua Convex.

```
┌─────────────┐         ┌──────────┐         ┌─────────────┐
│  MAC MINI   │────────▶│  CONVEX  │◀────────│  MACBOOK    │
│  (Primary)  │         │ (Central)│         │  (Remote)   │
│             │         │          │         │             │
│ - EVOX      │         │ - State  │         │ - MAX       │
│ - SAM       │         │ - Sync   │         │             │
│ - LEO       │         │ - APIs   │         │             │
└─────────────┘         └──────────┘         └─────────────┘
```

## Architecture

### 1. Central State (Convex)

**Table:** `sessionStates`

Lưu trữ real-time state của mỗi agent trên mỗi device:
- Device name (mac-mini, macbook)
- Agent name (evox, sam, leo, max, etc.)
- Status (active, idle, offline)
- Current task
- Current file
- Metadata (hostname, working directory, git branch)
- Last heartbeat timestamp

### 2. Heartbeat System

Agents report status mỗi 30-120 giây:

```bash
# Mac Mini agents
./scripts/heartbeat-mac-mini.sh evox "monitoring"
./scripts/heartbeat-mac-mini.sh sam "AGT-280"

# MacBook agents
./scripts/heartbeat-macbook.sh max "AGT-324"
```

### 3. Sync Dashboard

Real-time UI hiển thị tất cả agents across devices:

**URL:** `http://localhost:3000/sync`

Features:
- Device overview (Mac Mini, MacBook)
- Agent status per device (active, idle, stale)
- Current task for each agent
- Last heartbeat time
- Auto-refresh every 5 seconds

---

## Setup

### Step 1: Deploy Convex Schema

```bash
# Schema updated với sessionStates table
npx convex deploy
```

### Step 2: Test Heartbeat (Mac Mini)

```bash
# Single heartbeat
./scripts/heartbeat-mac-mini.sh evox "monitoring"

# Continuous loop (60s interval)
./scripts/heartbeat-loop.sh evox "monitoring" 60
```

### Step 3: Test Heartbeat (MacBook)

```bash
# Single heartbeat
./scripts/heartbeat-macbook.sh max "AGT-324"

# Continuous loop (120s interval)
./scripts/heartbeat-loop.sh max "AGT-324" 120
```

### Step 4: Check Sync Status

```bash
# CLI check - all devices
./scripts/check-sync.sh

# CLI check - specific device
./scripts/check-sync.sh mac-mini

# Web dashboard
open http://localhost:3000/sync
```

---

## Usage

### For Mac Mini Agents (EVOX, SAM, LEO)

**Start continuous heartbeat:**

```bash
# EVOX (COO) - monitoring system
./scripts/heartbeat-loop.sh evox "monitoring" 60 &

# SAM (Backend) - working on ticket
./scripts/heartbeat-loop.sh sam "AGT-280" 90 &

# LEO (Frontend) - building dashboard
./scripts/heartbeat-loop.sh leo "AGT-324" 90 &
```

**Stop heartbeat:**

```bash
# Find process
ps aux | grep heartbeat-loop

# Kill process
kill <PID>
```

### For MacBook (MAX)

**Start heartbeat:**

```bash
# MAX (PM) - coordinating
./scripts/heartbeat-loop.sh max "coordination" 120 &
```

**Check what Mac Mini agents doing:**

```bash
# CLI
./scripts/check-sync.sh mac-mini

# Or use Convex API directly
curl "https://gregarious-elk-556.convex.site/v2/deviceSessions?device=mac-mini" | jq
```

---

## API Endpoints

### POST /v2/sessionState

Update session state for agent on device.

**Request:**
```json
{
  "device": "mac-mini",
  "agent": "evox",
  "status": "active",
  "currentTask": "monitoring",
  "currentFile": "",
  "metadata": {
    "hostname": "mac-mini.local",
    "workingDirectory": "/Users/sonpiaz/evox",
    "gitBranch": "main"
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "...",
  "updated": true
}
```

### GET /v2/syncOverview

Get overview of all devices and agents.

**Response:**
```json
{
  "devices": [
    {
      "device": "mac-mini",
      "agents": [
        {
          "agent": "evox",
          "status": "active",
          "currentTask": "monitoring",
          "isStale": false,
          "lastHeartbeat": 1738800000000
        }
      ],
      "activeCount": 1,
      "totalCount": 3
    }
  ],
  "stats": {
    "totalAgents": 4,
    "activeAgents": 3,
    "staleAgents": 1
  },
  "timestamp": 1738800000000
}
```

### GET /v2/deviceSessions?device=mac-mini

Get sessions for specific device.

**Response:**
```json
{
  "device": "mac-mini",
  "sessions": [
    {
      "device": "mac-mini",
      "agent": "evox",
      "status": "active",
      "currentTask": "monitoring",
      "isStale": false,
      "lastHeartbeat": 1738800000000,
      "lastHeartbeatAgo": 30000
    }
  ]
}
```

### GET /v2/agentSessions?agent=max

Get sessions for specific agent across all devices.

---

## Workflows

### Workflow 1: Mac Mini Agent Starts Work

```bash
# 1. Agent starts working on task
./scripts/heartbeat-loop.sh sam "AGT-280" 90 &

# 2. MacBook MAX can check
./scripts/check-sync.sh mac-mini
# Output:
# SAM: active - AGT-280 (30s ago)

# 3. Or check via dashboard
open http://localhost:3000/sync
```

### Workflow 2: MacBook MAX Coordinates Remotely

```bash
# 1. Start heartbeat
./scripts/heartbeat-loop.sh max "coordination" 120 &

# 2. Check what Mac Mini agents doing
curl -s "https://gregarious-elk-556.convex.site/v2/deviceSessions?device=mac-mini" | jq

# 3. See all in sync dashboard
open http://localhost:3000/sync
```

### Workflow 3: Detect Stale Agents

An agent is "stale" if no heartbeat for >5 minutes.

**CLI:**
```bash
./scripts/check-sync.sh
# Output will show (stale) for agents >5min old
```

**Dashboard:**
- Stale agents shown with red "stale" badge
- Opacity reduced
- Last heartbeat time visible

---

## Integration with Agent Scripts

### Integrate into agent-loop.sh

```bash
# At start of agent session
./scripts/heartbeat-loop.sh $AGENT "starting" 90 &
HEARTBEAT_PID=$!

# During work
./scripts/heartbeat-mac-mini.sh $AGENT "$CURRENT_TASK" "$CURRENT_FILE"

# On exit
kill $HEARTBEAT_PID
./scripts/heartbeat-mac-mini.sh $AGENT "" "" # Final heartbeat
```

### Integrate into boot.sh

Add to `scripts/boot.sh`:

```bash
# After loading identity
echo "Starting heartbeat..."
./scripts/heartbeat-loop.sh $AGENT "booting" 60 &
echo $! > /tmp/heartbeat-$AGENT.pid
```

---

## Troubleshooting

### Heartbeat fails

**Check Convex deployment:**
```bash
npx convex deploy
```

**Check API:**
```bash
curl https://gregarious-elk-556.convex.site/v2/syncOverview
```

### Agents not showing up

**Check script is running:**
```bash
ps aux | grep heartbeat-loop
```

**Manually send heartbeat:**
```bash
./scripts/heartbeat-mac-mini.sh evox "test"
```

### Stale agents

**Restart heartbeat loop:**
```bash
# Kill old process
pkill -f heartbeat-loop

# Start new
./scripts/heartbeat-loop.sh evox "monitoring" 60 &
```

---

## Future Enhancements

### Phase 2: Alerts

- Auto-alert when agent goes stale >10min
- Slack/Discord notifications
- Email alerts for CEO

### Phase 3: Auto-Recovery

- Detect stale agents
- Auto-restart agent loops
- Circuit breaker integration

### Phase 4: Cross-Device Tasks

- Assign task to agent on any device
- Device-aware task routing
- Load balancing across devices

---

## Related Docs

- [Agent Identities](./AGENT-IDENTITIES.md)
- [Heartbeat System](../scripts/README.md#heartbeat)
- [Convex Schema](../convex/schema.ts)

---

**Questions?** Ask MAX (PM) or check Linear docs.
