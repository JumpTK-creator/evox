# MEGAPROMPT SYSTEM

## Philosophy

A Megaprompt is NOT a task. It's a **MISSION**.

Regular task: "Fix the button color"
Megaprompt: "You are rebuilding the entire dashboard experience. Here's 200k tokens of context. Ship something that makes the CEO say 'wow'."

## Structure (200k tokens)

```
[IDENTITY] - 2k tokens
Who you are. Your role. Your expertise.

[NORTH STAR] - 1k tokens  
The ultimate goal. Why this matters.

[CONTEXT] - 150k tokens
- Full codebase (relevant files)
- All documentation
- Past decisions and why
- Current system state
- API references

[MISSION] - 5k tokens
What you need to achieve. Success criteria.
Not step-by-step - just the END STATE.

[CONSTRAINTS] - 2k tokens
What you CANNOT do. Boundaries.

[AUTONOMY LEVEL] - 1k tokens
What you can decide alone vs escalate.

[EXPECTED OUTPUT] - 2k tokens
Deliverables. Definition of done.
```

## Execution Rules

1. **No hand-holding** - Agent figures out the path
2. **Ship or escalate** - Don't sit idle
3. **Exceed expectations** - Good enough is not enough
4. **Self-report progress** - Every 30 min update
5. **Parallel execution** - All agents work simultaneously

## Agent Megaprompt Assignments

### MAX (PM) - EPIC: System Redesign
Mission: Redesign the entire EVOX experience for CEO. Elon-style. 3-second glance. Ship the spec + tickets.

### SAM (Backend) - EPIC: Autonomous Agent Loop
Mission: Build the infrastructure for 24/7 agent autonomy. Dispatch queue, auto-assignment, heartbeat, self-healing.

### LEO (Frontend) - EPIC: CEO Dashboard v2
Mission: Rebuild dashboard from scratch. No noise. Only signal. North Star metrics. Velocity. Blockers. Wins.

### MAYA (Design) - EPIC: Design System
Mission: Create a cohesive design language. Components. Colors. Typography. Mobile-first. Dark mode.

### QUINN (QA) - EPIC: Test Automation
Mission: Build comprehensive test suite. E2E. Unit. Integration. Auto-run on PR.

### ALEX (PM) - EPIC: Documentation
Mission: Rewrite all docs. Clear. Actionable. No fluff.

### COLE (Research) - EPIC: Competitive Analysis
Mission: Analyze top agent orchestration systems. What can we steal? What can we do better?

### DREW (PM) - EPIC: Metrics & Analytics
Mission: Define and implement all metrics. Velocity. Cost. Quality. ROI.

### ELLA (Content) - EPIC: Agent Onboarding
Mission: Create the perfect agent onboarding flow. New agent → productive in 5 minutes.

### FINN (Frontend) - EPIC: Real-time Features
Mission: WebSocket. Live updates. No polling. Instant feedback.

### IRIS (Data) - EPIC: Data Pipeline
Mission: Build data infrastructure. Logs. Analytics. Insights.

### KIRA (Backend) - EPIC: API Optimization
Mission: 10x API performance. Caching. Batching. Compression.

### NOVA (Security) - EPIC: Security Hardening
Mission: Full security audit. Fix all vulnerabilities. Implement best practices.

## Coordination

All agents work in parallel. COO (me) coordinates.
Each agent reports to #dev channel every 30 min.
Blockers escalate immediately.
Ship to UAT. CEO reviews daily.

## Success Criteria

When Elon (Son) opens the dashboard:
1. Knows system status in 3 seconds
2. Sees clear progress toward North Star
3. Knows exactly what needs his attention
4. Feels confident agents are working autonomously

---

*Created by EVOX COO - 2026-02-05*
