# Device Sync - Quick Setup Guide

**5-minute setup for cross-device agent sync**

---

## What Was Built

✅ **1. Convex Backend**
- `sessionStates` table in schema
- `deviceSync.ts` - Queries & mutations
- HTTP endpoints in `http.ts`

✅ **2. Heartbeat Scripts**
- `heartbeat-mac-mini.sh` - For Mac Mini agents
- `heartbeat-macbook.sh` - For MacBook agents
- `heartbeat-loop.sh` - Auto-detect device, continuous loop
- `check-sync.sh` - CLI status checker

✅ **3. Sync Dashboard**
- `/sync` page - Real-time UI
- Shows all devices & agents
- Status, tasks, heartbeat times

✅ **4. Documentation**
- `DEVICE-SYNC.md` - Full guide
- `AGENT-IDENTITIES.md` - Agent system
- This setup guide

---

## Setup Steps

### Step 1: Deploy Convex (REQUIRED)

```bash
# Deploy schema + functions
npx convex deploy
```

**Output should show:**
```
✓ Schema pushed
✓ Functions deployed: deviceSync, http
```

### Step 2: Test Heartbeat

**Mac Mini:**
```bash
# Test single heartbeat
./scripts/heartbeat-mac-mini.sh evox "monitoring"

# Expected output:
# ✓ Heartbeat sent: evox on mac-mini
#   Task: monitoring
```

**MacBook:**
```bash
# Test single heartbeat
./scripts/heartbeat-macbook.sh max "testing"

# Expected output:
# ✓ Heartbeat sent: max on macbook
#   Task: testing
```

### Step 3: Check Sync Status

```bash
# CLI check
./scripts/check-sync.sh

# Expected output:
# 📊 Device Sync Overview
# =======================
# Total Agents: 2
# Active: 2
# Stale: 0
#
# Devices:
#   mac-mini: 1/1 active
#     - evox: active - monitoring
#   macbook: 1/1 active
#     - max: active - testing
```

### Step 4: View Dashboard

```bash
# Start Next.js dev server (if not running)
npm run dev

# Open sync dashboard
open http://localhost:3000/sync
```

---

## Production Deployment

### Mac Mini (Primary Device)

**1. Start EVOX heartbeat (COO monitoring):**
```bash
# Background loop - 60s interval
./scripts/heartbeat-loop.sh evox "monitoring" 60 > /tmp/evox-heartbeat.log 2>&1 &
```

**2. Start SAM heartbeat (Backend):**
```bash
./scripts/heartbeat-loop.sh sam "idle" 90 > /tmp/sam-heartbeat.log 2>&1 &
```

**3. Start LEO heartbeat (Frontend):**
```bash
./scripts/heartbeat-loop.sh leo "idle" 90 > /tmp/leo-heartbeat.log 2>&1 &
```

### MacBook (Remote Device)

**Start MAX heartbeat (PM):**
```bash
./scripts/heartbeat-loop.sh max "coordination" 120 > /tmp/max-heartbeat.log 2>&1 &
```

### Verify All Running

```bash
# Check processes
ps aux | grep heartbeat-loop

# Check sync status
./scripts/check-sync.sh

# Or open dashboard
open http://localhost:3000/sync
```

---

## Integration with Existing Scripts

### Option A: Integrate into agent-loop.sh

Add to `scripts/agent-loop.sh`:

```bash
# At start
echo "Starting heartbeat..."
./scripts/heartbeat-loop.sh $AGENT "working" 90 &
HEARTBEAT_PID=$!

# Store PID
echo $HEARTBEAT_PID > /tmp/heartbeat-$AGENT.pid

# On exit (trap)
cleanup() {
  if [ -f /tmp/heartbeat-$AGENT.pid ]; then
    kill $(cat /tmp/heartbeat-$AGENT.pid) 2>/dev/null
    rm /tmp/heartbeat-$AGENT.pid
  fi
}
trap cleanup EXIT
```

### Option B: Standalone Background Service

Create systemd/launchd services to auto-start heartbeat loops.

**Mac (launchd) example:**
```xml
<!-- ~/Library/LaunchAgents/com.evox.heartbeat.evox.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ...>
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.evox.heartbeat.evox</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/sonpiaz/evox/scripts/heartbeat-loop.sh</string>
    <string>evox</string>
    <string>monitoring</string>
    <string>60</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

---

## Monitoring & Maintenance

### Check Heartbeat Health

```bash
# Are loops still running?
ps aux | grep heartbeat-loop

# Recent heartbeats?
./scripts/check-sync.sh

# Any stale agents? (>5min no heartbeat)
./scripts/check-sync.sh | grep stale
```

### Restart Stale Agents

```bash
# Kill old process
pkill -f "heartbeat-loop.sh evox"

# Start new
./scripts/heartbeat-loop.sh evox "monitoring" 60 &
```

### Cleanup Old Sessions

```bash
# Via Convex dashboard
npx convex run deviceSync:cleanupStaleSessions --olderThanMs 86400000

# Or via API
curl -X POST "https://gregarious-elk-556.convex.site/cleanupStaleSessions" \
  -d '{"olderThanMs": 86400000}'
```

---

## Troubleshooting

### "No matching routes found"

**Problem:** Convex not deployed with new endpoints.

**Solution:**
```bash
npx convex deploy
```

### Agents not showing in dashboard

**Problem:** Heartbeat loop not running.

**Solution:**
```bash
# Check if running
ps aux | grep heartbeat-loop

# Start if not
./scripts/heartbeat-loop.sh evox "monitoring" 60 &
```

### Agent shows as "stale"

**Problem:** No heartbeat >5min.

**Solution:**
```bash
# Restart heartbeat loop
pkill -f "heartbeat-loop.sh evox"
./scripts/heartbeat-loop.sh evox "monitoring" 60 &
```

---

## Next Steps

1. ✅ Deploy Convex schema
2. ✅ Test heartbeats from both devices
3. ✅ Verify sync dashboard shows both
4. 📋 Integrate into agent-loop.sh
5. 📋 Set up auto-start with launchd/systemd
6. 📋 Add alerts for stale agents

---

**Ready to deploy!** Deploy Convex first:
```bash
npx convex deploy
```

Then test heartbeats and verify sync dashboard.
