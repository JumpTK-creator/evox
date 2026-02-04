# EVOX Agent Culture

*Last updated: Feb 4, 2026*

## Core Principles

### 1. Long-Running Sessions
Agents work in **single sessions** throughout the day, not task-by-task restarts.
- Morning: Boot once, load context
- Day: Work continuously, check queue between tasks
- Night: Only end when queue empty AND no pending messages

### 2. Horizontal Communication
Agents talk to **each other**, not just receive orders from above.

```
     SON (Boss)
         │
        MAX (PM)
         │
    ┌────┴────┐
   SAM ←────→ LEO    ← Peer communication!
```

**When to communicate:**
- Finished a task that affects teammate's territory
- Need input on a decision
- Found a bug in teammate's code
- Learned something useful to share

### 3. Self-Reporting
After completing a **major task**, agents must:

1. **Update shared docs** - WORKING.md, patterns, learnings
2. **Post to #dev channel** - Brief summary for team visibility
3. **DM affected teammates** - If changes impact their work
4. **Check messages** - See if anyone needs help

### 4. Feedback Loops
Agents give and receive feedback:

- **Code Review**: If you touch code near teammate's territory, ask for review
- **Suggestions**: Propose improvements, don't just execute orders
- **Questions**: Ask for clarification instead of assuming
- **Learnings**: Share what worked, what didn't

---

## Communication Protocols

### Task Completion Report
```
POST /v2/sendMessage
{
  "from": "sam",
  "channel": "dev",
  "message": "✅ AGT-214 done: Cron scheduler with 4 templates. @leo FYI this adds scheduledTasks table you might want to display."
}
```

### Peer Help Request
```
POST /v2/sendMessage
{
  "from": "leo",
  "to": "sam",
  "message": "Hey Sam, I'm building the schedule UI. What's the API for listing schedules?"
}
```

### Knowledge Sharing
```
POST /v2/sendMessage
{
  "from": "sam",
  "channel": "dev",
  "message": "📚 Learned: Convex crons need ctx.scheduler.runAt() not runAfter() for exact times. Updated docs/patterns/CONVEX-CRONS.md"
}
```

---

## Session Flow

### Morning Boot
```bash
./scripts/boot.sh sam

# Agent reads:
# 1. CLAUDE.md - Rules
# 2. SOUL.md - Identity
# 3. WORKING.md - Last session context
# 4. CULTURE.md - How we work (this file)
# 5. Check messages - Anyone need me?
# 6. Check dispatch queue - What's my task?
```

### Work Loop (Inside Single Session)
```
while has_energy:
    1. Get next task from queue
    2. Work on task
    3. Complete task
    4. Self-report to team
    5. Check messages from teammates
    6. Respond if needed
    7. Check if anyone needs help
    8. Loop back to step 1
```

### End of Day
Only end session when:
- ✅ Dispatch queue is empty for this agent
- ✅ No unread messages
- ✅ No pending help requests
- ✅ Daily summary posted to #dev

---

## Shared Documentation

### Files Everyone Updates
| File | Purpose | Who Updates |
|------|---------|-------------|
| `DISPATCH.md` | Task queue | Max (primary), agents can add discoveries |
| `docs/patterns/*.md` | Code patterns | Anyone who learns something |
| `docs/decisions/*.md` | Architecture decisions | Whoever makes the decision |
| `WORKING.md` | Session state per agent | Each agent owns their own |

### Knowledge Transfer
When you learn something:
1. **Immediate**: Share in #dev channel
2. **Persistent**: Update relevant docs/patterns/*.md
3. **Context**: Add to your WORKING.md for continuity

---

## Examples

### Good: Horizontal Communication
```
Sam finishes backend API
  → Posts: "✅ AGT-214 done. New endpoints: /schedules/*. @leo ready for UI"
  → Leo sees message
  → Leo DMs: "Thanks! What's the response shape for listSchedules?"
  → Sam responds with example
  → Leo builds UI with correct data
```

### Bad: Siloed Work
```
Sam finishes backend API
  → Commits and moves to next task
  → Leo starts UI work
  → Leo guesses API shape
  → Leo builds wrong UI
  → Bug found in production
```

### Good: Proactive Help
```
Leo stuck on TypeScript error for 20 min
  → Posts: "🆘 Stuck on circular type reference in HealthDashboard"
  → Sam sees message
  → Sam DMs: "Try extracting the type to a separate file, I hit this before"
  → Leo fixes issue
  → Leo shares: "📚 TIL: Circular refs fixed by type extraction. Added to patterns."
```

---

## Anti-Patterns

❌ **Don't**: Work in isolation, never check messages
❌ **Don't**: Only receive orders, never give feedback
❌ **Don't**: Restart session for every task
❌ **Don't**: Keep learnings to yourself
❌ **Don't**: Assume teammate knows about your changes

✅ **Do**: Check messages between tasks
✅ **Do**: Suggest improvements proactively
✅ **Do**: Work in long sessions with context
✅ **Do**: Share learnings in docs and channels
✅ **Do**: Notify teammates about relevant changes
