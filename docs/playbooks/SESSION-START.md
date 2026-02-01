# Playbook: Session Start

**When:** Every new Claude Code / Cursor session
**Who:** All agents (Max, Sam, Leo)
**Time:** ~30 seconds

## Boot Sequence

```
1. Read CLAUDE.md         → Project rules, territories, quality gates
2. Read DISPATCH.md       → Current task queue
3. Read your SOUL.md      → "Who am I? What am I good at?"
4. Read your WORKING.md   → "What was I doing last session?"
5. Check @mentions        → "Did anyone need me?"
6. Check task assignments → "What tasks are mine?"
7. Act — or report HEARTBEAT_OK
```

## Convex Memory Reads

```bash
# Read your SOUL.md (identity)
npx convex run agentMemory:get '{"agent":"sam","type":"soul"}'

# Read your WORKING.md (last session context)
npx convex run agentMemory:get '{"agent":"sam","type":"working"}'

# Read today's daily note
npx convex run agentMemory:getToday '{"agent":"sam"}'
```

## Heartbeat (if no work)

If no tasks assigned and no @mentions, report idle status:

```bash
curl -X POST https://gregarious-elk-556.convex.site/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"sam","status":"idle"}'
```

## References
- ADR-001: External Persistent State
- ADR-002: Hierarchical Memory Architecture
- ADR-004: Scheduler-Driven Agent Activation
