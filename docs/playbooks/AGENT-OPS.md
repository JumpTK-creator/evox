# Agent Operations Runbook

*Standard operating procedures for agent management*

---

## Starting Agents

```bash
# Start single agent
./scripts/agent-loop.sh sam

# Start in background
./scripts/agent-loop.sh sam &
./scripts/agent-loop.sh leo &
```

**Lock files:** `.lock-sam`, `.lock-leo` prevent duplicates.

---

## Checking Status

```bash
# See running agents
ps aux | grep "dangerously-skip" | grep -v grep

# Check lock files
ls -la .lock-*

# Check specific agent output
tail -f /private/tmp/claude-501/-Users-sonpiaz/tasks/*.output
```

---

## Stopping Agents

### Graceful Stop (Recommended)
```bash
# Find PID
cat .lock-sam

# Send SIGTERM (allows logging)
kill <PID>
```

### Force Stop
```bash
# Kill all agents
pkill -9 -f "dangerously-skip"

# Clean up locks
rm -f .lock-*
```

---

## Session Logging

When agents are killed:
1. Trap catches signal
2. Heartbeat set to "offline"
3. Learning logged to Convex
4. Lock file removed

**Verify logging:**
```bash
curl "$CONVEX_URL/v2/learnings?limit=5" | jq
```

---

## Troubleshooting

### Duplicate Processes
```bash
# Kill all and restart
pkill -9 -f "dangerously-skip"
rm -f .lock-*
./scripts/agent-loop.sh sam &
```

### Agent Not Picking Tasks
1. Check dispatch queue: `curl "$CONVEX_URL/getNextDispatchForAgent?agent=sam"`
2. Create dispatch: `./scripts/queue-task.sh sam AGT-XXX "description"`

### Process Stuck
```bash
# Check if Claude is actually running
ps aux | grep <PID>

# Check output file
tail -50 /private/tmp/claude-501/-Users-sonpiaz/tasks/*.output
```

---

## Best Practices

1. **One terminal per agent** — Don't background multiple agents
2. **Check logs** — Always verify agents are working
3. **Graceful shutdown** — Use `kill`, not `kill -9`
4. **Commit before kill** — If agent has uncommitted work
5. **Log learnings** — Always log what was done

---

*Updated: Feb 4, 2026*
