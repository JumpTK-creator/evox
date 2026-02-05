# Phase 2: Self-Healing System — Milestones

> **Goal:** Agents detect problems, fix them automatically, learn from mistakes.
> **Timeline:** Feb-Mar 2026

---

## Overview

| Milestone | Status | Owner | Target |
|-----------|--------|-------|--------|
| M2.1 Auto-Retry | Done | SAM | Feb 5 |
| M2.2 Git Rollback | Done | ALEX | Feb 5 |
| M2.3 PR Auto-Review | Done | ALEX | Feb 5 |
| M2.4 Blocker Detection | To Do | SAM | Feb 10 |
| M2.5 Self-Improvement | To Do | MAX | Feb 15 |
| M2.6 Health Dashboard | To Do | LEO | Feb 20 |

---

## M2.1: Auto-Retry Failed Tasks (AGT-276)

**Status:** In Progress
**Owner:** SAM

### Problem
Tasks fail due to transient errors. Human must manually restart.

### Solution
Extend existing retry logic:
1. Detect failure patterns
2. Retry with exponential backoff (1min, 5min, 15min)
3. Try alternative approaches on 3rd retry
4. Auto-reassign if agent-specific failure

### Success Criteria
- [ ] Failed tasks auto-retry up to 3x
- [ ] Different strategies each retry
- [ ] 80%+ retry success rate

### Files
- `convex/recovery.ts` - Retry logic
- `convex/dispatches.ts` - Failure handling

---

## M2.2: Git Rollback Mechanism (AGT-277)

**Status:** DONE
**Owner:** ALEX

### Problem
Agent commits can break the build. No automatic recovery.

### Solution
Post-commit hook:
1. Run `npx next build` after each commit
2. If fail → `git revert HEAD --no-edit`
3. Log incident to Convex
4. Notify #dev channel

### Files
- `scripts/post-commit-rollback.sh` - Hook script
- `scripts/install-git-hooks.sh` - Installer
- `convex/http.ts` - `/logIncident` endpoint

### Install
```bash
./scripts/install-git-hooks.sh
```

---

## M2.3: PR Auto-Review (AGT-279)

**Status:** DONE
**Owner:** ALEX

### Problem
PRs need manual review trigger. Quinn doesn't know when to review.

### Solution
GitHub webhook:
1. Listen for `pull_request` events (opened, synchronize, reopened)
2. Create HIGH priority dispatch for Quinn
3. Include PR details (number, title, branch, author)

### Files
- `convex/http.ts` - Webhook handler
- `convex/dispatches.ts` - `createPRReviewDispatch`

---

## M2.4: Blocker Detection & Escalation (AGT-278)

**Status:** To Do
**Owner:** SAM

### Problem
Agents get stuck silently. No automatic escalation.

### Solution
Detect stuck agents:
1. Task running >30min with no progress
2. Same error 3+ times
3. Agent explicitly marks blocked

Escalation flow:
1. >15min stuck → Ping peer agent
2. >30min stuck → Escalate to MAX
3. >1hr stuck → Alert CEO channel

### Implementation
```typescript
// convex/monitoring.ts
export const checkStuckAgents = internalAction({
  handler: async (ctx) => {
    const agents = await ctx.runQuery(api.agents.list);
    for (const agent of agents) {
      if (agent.status === "busy") {
        const dispatch = await getRunningDispatch(agent);
        if (Date.now() - dispatch.startedAt > 30 * 60 * 1000) {
          await escalate(agent, dispatch);
        }
      }
    }
  }
});
```

### Success Criteria
- [ ] Stuck agents detected within 5min
- [ ] Auto-escalation within 30min
- [ ] Blocker patterns logged for learning

---

## M2.5: Self-Improvement Loop (AGT-280)

**Status:** To Do
**Owner:** MAX

### Problem
Agents repeat same mistakes. No learning mechanism.

### Solution
1. Log every failure with context
2. Analyze patterns weekly
3. Update `docs/patterns/` with learnings
4. Share across agents

### Implementation
```typescript
// convex/learnings.ts
interface Failure {
  agentName: string;
  errorType: string;
  context: string;
  resolution: string;
  timestamp: number;
}

export const analyzePatterns = internalAction({
  handler: async (ctx) => {
    const failures = await getLast7DaysFailures();
    const patterns = findRepeatingPatterns(failures);
    for (const pattern of patterns) {
      await createLearning(pattern);
      await notifyTeam(pattern);
    }
  }
});
```

### Success Criteria
- [ ] All failures logged with context
- [ ] Weekly pattern analysis
- [ ] Same mistake not repeated >2x

---

## M2.6: Health & Error Dashboard (AGT-281)

**Status:** To Do
**Owner:** LEO

### Problem
No visibility into system health or error rates.

### Solution
Dashboard widget showing:
1. Agent uptime percentages
2. Error rate by agent
3. Recent incidents
4. Retry success rate

### Components
```typescript
// components/evox/HealthWidget.tsx
export function HealthWidget() {
  const health = useQuery(api.monitoring.getSystemHealth);
  return (
    <Card>
      <CardHeader>System Health</CardHeader>
      <CardContent>
        <AgentUptime data={health.uptime} />
        <ErrorRates data={health.errors} />
        <RecentIncidents data={health.incidents} />
      </CardContent>
    </Card>
  );
}
```

### Success Criteria
- [ ] Real-time health metrics
- [ ] Error rate visible per agent
- [ ] Incidents list with status

---

## Dependencies

```
M2.1 Auto-Retry ──────┐
M2.2 Git Rollback ────┼──► M2.5 Self-Improvement
M2.3 PR Auto-Review ──┤
M2.4 Blocker Detection┘
                      │
                      ▼
               M2.6 Health Dashboard
```

---

## Success Metrics (Phase 2 Complete)

| Metric | Target |
|--------|--------|
| Retry success rate | >80% |
| Breaking commits auto-rolled back | <2min |
| Stuck agent escalation | <30min |
| PR review triggered | 100% |
| CEO intervention | <1x/day |

---

## Next: Phase 3 (Agent-Led Development)

After Phase 2:
- Agents propose features
- Agents vote on priorities
- Ship with QA approval only
