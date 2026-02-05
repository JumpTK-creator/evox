# EVOX Architecture

> System design in 5 minutes.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CEO / Human                          │
│                    (Linear, Dashboard)                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                      EVOX Dashboard                         │
│              (Next.js @ evox-ten.vercel.app)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ CEO View │ │ Dispatch │ │ Activity │ │ Comms    │       │
│  │  Widget  │ │  Queue   │ │   Feed   │ │   Log    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────┬───────────────────────────────┘
                              │ Real-time subscriptions
┌─────────────────────────────▼───────────────────────────────┐
│                    Convex Backend                           │
│            (gregarious-elk-556.convex.site)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ agents   │ │dispatches│ │ messages │ │activities│       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP API
┌─────────────────────────────▼───────────────────────────────┐
│                      AI Agents                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │ MAX  │ │ SAM  │ │ LEO  │ │QUINN │ │ ALEX │              │
│  │  PM  │ │ BE   │ │ FE   │ │  QA  │ │DevOps│              │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘              │
│           (Claude Code sessions via tmux)                   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Task Assignment
```
Linear ticket → Webhook → Convex → Dispatch → Agent picks up
```

### 2. Agent Communication
```
Agent A → POST /postToChannel → Convex → Real-time → Dashboard
Agent B → GET /v2/getMessages → Reads update
```

### 3. Code Shipping
```
Agent commits → GitHub webhook → Convex logs → Dashboard shows
                            → Linear ticket auto-closes (if "closes AGT-XXX")
```

## Key Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `agents` | Agent registry | name, role, status |
| `dispatches` | Task queue | agentId, command, status |
| `unifiedMessages` | All comms | fromAgent, toAgent, content |
| `activityEvents` | Activity log | agentName, category, title |
| `gitActivity` | Commits | commitHash, agentName, branch |

## API Layers

### HTTP (curl-accessible)
```
/status              → System overview
/v2/getMessages      → Get messages
/postToChannel       → Send to channel
/getNextDispatch...  → Get next task
/markDispatch...     → Update task status
```

### Convex (internal)
```
api.agents.list      → List all agents
api.dispatches.create → Create dispatch
api.tasks.updateStatus → Update task
```

## Agent Architecture

Each agent runs as a **Claude Code session** in tmux:

```
┌─────────────────────────────────────┐
│ tmux session: evox-sam              │
│ ┌─────────────────────────────────┐ │
│ │ Claude Code CLI                 │ │
│ │ - Reads agents/sam.md (SOUL)    │ │
│ │ - Calls Convex HTTP APIs        │ │
│ │ - Edits files in repo           │ │
│ │ - Commits to git                │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Agent Loop
```bash
while true; do
  1. GET /v2/getMessages        # Check inbox
  2. GET /getNextDispatchFor... # Get work
  3. POST /markDispatchRunning  # Claim task
  4. <do work>
  5. POST /markDispatchCompleted # Done
  6. POST /postToChannel        # Report
done
```

## Webhooks

### GitHub → Convex
```
POST /webhook/github
- push: Log commits, auto-close tickets
- pull_request: Dispatch to Quinn for review
```

### Linear → Convex
```
POST /webhook/linear
- Issue created/updated: Sync to Convex
- Assignee change: Auto-dispatch to agent
```

## Security Model

| Layer | Protection |
|-------|------------|
| API | No auth (internal team only) |
| Secrets | `.env.local` (never committed) |
| GitHub | OAuth via Claude Code |
| Linear | API key in env vars |
| Convex | Project-scoped access |

## Deployment

| Environment | URL | Branch |
|-------------|-----|--------|
| Production | evox-ten.vercel.app | main |
| Staging | evox-git-uat-*.vercel.app | uat |
| Local | localhost:3000 | any |

### Deploy Flow
```
Push to uat → Vercel preview → CEO review → Merge to main → Auto-deploy
```

## Key Decisions (ADRs)

| ADR | Decision |
|-----|----------|
| ADR-001 | External persistent state (Convex, not files) |
| ADR-002 | Hierarchical memory (SOUL/WORKING/daily) |
| ADR-003 | Shared communication via Convex |
| ADR-004 | Scheduler-driven agent activation |
| ADR-005 | Permission levels and human oversight |
| ADR-006 | Headless auth via tmux |

Full ADRs in `docs/decisions/`.
