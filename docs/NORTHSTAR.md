# EVOX North Star: 100% AUTOMATION

*Updated: Feb 4, 2026*

---

## The Goal

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              100% AUTONOMOUS OPERATION                  │
│                                                         │
│   Agents find work, execute, commit, deploy — alone.   │
│   No human in the loop. Zero intervention needed.      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Progress Tracker

| Component | Status | Details |
|-----------|--------|---------|
| Agent self-start | ✅ Done | `scripts/start-all-agents.sh` |
| Agent find tickets | ✅ Done | Linear API polling in `agent-loop.sh` |
| Agent claim tickets | ✅ Done | Auto-claim prevents duplicates |
| Agent execute code | ✅ Done | Claude Code with MCP tools |
| Agent commit & push | ✅ Done | Git workflow in prompt |
| Agent update Linear | ✅ Done | MCP `update_issue` to Done |
| Auto-test on PR | ✅ Done | GitHub Action `.github/workflows/test.yml` |
| Auto-deploy | ✅ Done | Vercel auto-deploy on push to main |
| 24/7 Operation | ✅ Done | tmux + terminal tabs (subscription) |
| Sub-agent spawning | ✅ Done | AGT-265 |
| Agent communication | ✅ Done | Convex messages |
| Error recovery | ✅ Done | AGT-263 exponential backoff |

---

## Current Automation Rate

```
██████████ 100%

All core automation components complete!
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      LINEAR                             │
│              (Backlog → In Progress → Done)             │
└─────────────────────┬───────────────────────────────────┘
                      │ Poll for unassigned tickets
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  AGENT LOOP                             │
│         scripts/agent-loop.sh (per agent)               │
│                                                         │
│  1. Check dispatch queue                                │
│  2. Poll Linear for tickets                             │
│  3. Claim ticket                                        │
│  4. Boot context (identity + rules)                     │
│  5. Run Claude Code                                     │
│  6. Commit & push                                       │
│  7. Update Linear → Done                                │
│  8. Loop                                                │
└─────────────────────┬───────────────────────────────────┘
                      │ git push
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    GITHUB                               │
│           Auto-test (GitHub Action)                     │
└─────────────────────┬───────────────────────────────────┘
                      │ Tests pass
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    VERCEL                               │
│              Auto-deploy to production                  │
└─────────────────────────────────────────────────────────┘
```

---

## Agents

| Agent | Role | Status |
|-------|------|--------|
| SAM | Backend (Convex, API) | Active |
| LEO | Frontend (React, UI) | Active |
| MAX | PM (Planning, Dispatch) | Active |
| QUINN | QA (Testing, Review) | Active |
| ALEX | DevOps | Ready |
| ELLA | Content | Ready |
| NOVA | Security | Ready |
| IRIS | Data | Ready |
| COLE | Research | Ready |
| MAYA | Design | Ready |

---

## Key Files

| File | Purpose |
|------|---------|
| `scripts/agent-loop.sh` | Main agent execution loop |
| `scripts/start-all-agents.sh` | Start 4 agents in tmux |
| `scripts/stop-all-agents.sh` | Stop all agents |
| `scripts/boot.sh` | Load agent context |
| `convex/dispatches.ts` | Dispatch queue |
| `convex/agents.ts` | Agent state |
| `.github/workflows/test.yml` | Auto-test on PR |

---

## Next Steps (Priority Order)

All core automation complete. Future improvements:

1. **Cost tracking** — Track token costs per task
2. **Reply threading** — Comment thread replies
3. **TypeScript cleanup** — Fix implicit any errors

## How to Run (Subscription Mode)

**Option 1: tmux (recommended)**
```bash
./scripts/start-all-agents.sh
tmux attach -t evox  # Keep this window open
```

**Option 2: Terminal tabs**
```bash
# Open 4 terminal tabs, run one per tab:
./scripts/agent-loop.sh sam
./scripts/agent-loop.sh leo
./scripts/agent-loop.sh max
./scripts/agent-loop.sh quinn
```

Both options use subscription credits (no API costs).

---

## Success Criteria

North Star achieved when:

- [ ] Agents run 24/7 without human intervention
- [ ] Tickets created → completed → deployed automatically
- [ ] Error recovery is automatic
- [ ] New agents spawn on demand
- [ ] Cost per ticket < $1

---

*"The best part is no part. The best process is no process."* — Elon Musk
