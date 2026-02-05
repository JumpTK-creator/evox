# VELOCITY-200 — 200 Tasks/Hour System

> Target: 200 tasks completed per hour across team.

---

## Math

- 200 tasks/hour = **3.3 tasks/minute**
- 5 agents = **40 tasks/agent/hour** = **1 task every 1.5 minutes**

---

## Requirements

### 1. Granular Tasks
Tasks must be **small and specific**:
- ❌ "Build dashboard" (too big)
- ✅ "Add loading spinner to AgentCard" (1-2 min)
- ✅ "Fix typo in CULTURE.md line 45" (30 sec)
- ✅ "Review PR #123" (2 min)
- ✅ "Run npm test and report results" (1 min)

### 2. Task Factory
Auto-generate tasks from:
- Code analysis (lint errors, TODOs, improvements)
- PR reviews needed
- Test coverage gaps
- Documentation updates
- Refactoring opportunities

### 3. Full Logging
Every action logged:
```json
{
  "taskId": "T-12345",
  "type": "fix_typo",
  "createdBy": "MAX",
  "createdAt": "2026-02-05T07:20:00Z",
  "assignedTo": "LEO",
  "assignedAt": "2026-02-05T07:20:05Z",
  "reviewedBy": "QUINN",
  "reviewedAt": "2026-02-05T07:21:00Z",
  "completedAt": "2026-02-05T07:21:30Z",
  "duration": "90s"
}
```

### 4. Agent Communication Protocol
Every agent asks:
1. "What should I do next?" → Check queue
2. "Who can help me with X?" → Ping relevant agent
3. "Is this aligned with vision?" → Check VISION.md
4. "What's blocking the team?" → Check BLOCKERS

### 5. Rapid Cycle Loop
```
[0:00] Check queue → pick task
[0:05] Start task → mark running
[0:30] Complete task → mark done
[0:35] Log result → post to channel
[0:40] Ask: "What next?" → repeat
```

---

## Implementation Plan

### Phase 1: Task Factory (Today)
- [ ] Script to scan codebase for TODOs
- [ ] Script to find lint errors
- [ ] Script to identify missing tests
- [ ] Auto-create micro-tasks in queue

### Phase 2: Rapid Agent Loop (Today)
- [ ] Reduce cycle time from 60s to 10s
- [ ] Pre-fetch next task while completing current
- [ ] Parallel task picking

### Phase 3: Full Logging (Today)
- [ ] Log every task state change
- [ ] Dashboard shows real-time velocity
- [ ] Hourly reports auto-generated

---

## Metrics Dashboard

```
┌─────────────────────────────────────────┐
│ VELOCITY: 187/hour (target: 200)        │
├─────────────────────────────────────────┤
│ MAX:   42 tasks │ ████████████░░ 84%    │
│ SAM:   38 tasks │ ███████████░░░ 76%    │
│ LEO:   41 tasks │ ████████████░░ 82%    │
│ MAYA:  35 tasks │ ██████████░░░░ 70%    │
│ QUINN: 31 tasks │ █████████░░░░░ 62%    │
└─────────────────────────────────────────┘
```

---

## Agent Mindset Shift

OLD: "Wait for big task → work hours → done"
NEW: "Grab micro-task → complete fast → log → next"

OLD: "I work alone"  
NEW: "I ask: Who can help? What's next? Is this aligned?"

OLD: "CEO tells me what to do"
NEW: "I understand vision → I find work → I execute → I ask questions"

---

_200 tasks/hour is not about working harder. It's about working smarter with granular tasks and zero idle time._
