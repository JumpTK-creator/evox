<p align="center">
  <img src="public/evox-logo.svg" alt="EVOX" width="80" />
</p>

<h1 align="center">EVOX — Mission Control</h1>

<p align="center">
  <strong>The COO for your AI engineering team.</strong><br/>
  <em>An agent orchestration system built from first principles.</em>
</p>

<p align="center">
  <a href="https://evox-ten.vercel.app">Live Demo</a> · <a href="#architecture">Architecture</a> · <a href="#quick-start">Quick Start</a> · <a href="#roadmap">Roadmap</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/sonpiaz/evox?style=social" />
  <img src="https://img.shields.io/github/forks/sonpiaz/evox?style=social" />
</p>

---

## The Question

> **"When an AI agent starts a new session, it loses everything. How do you make it work continuously — like a real human teammate?"**

This isn't a theoretical question. It's the reason EVOX exists.

Most AI agent frameworks focus on **what agents can do** — tool calling, code generation, task execution. But they ignore the harder question: **what happens when the session ends?**

The agent forgets. Every conversation, every decision, every piece of context — gone. You start over. Every. Single. Time.

We didn't start by looking at other agent frameworks. We started by asking: *what are the fundamental truths about AI agents that cannot be argued with?*

---

## Five Truths

Everything in EVOX is derived from five irreducible truths. Not borrowed from another project. Not inspired by a trend. These are constraints imposed by physics and logic:

**Truth 1 — LLMs have no memory between sessions.**
Every new invocation is a blank page. This isn't a bug to fix; it's a law of the architecture. Therefore: *state must live outside the model*, in a persistent layer the agent reads on boot.

**Truth 2 — Context windows are finite.**
You can't dump an agent's entire history into a prompt. Therefore: *memory must be hierarchical* — working state (what I'm doing now), daily notes (what happened today), long-term memory (who I am and what I've learned).

**Truth 3 — Multiple agents on one codebase will collide.**
If two agents don't know what the other is doing, they'll overwrite each other's work. Therefore: *agents need a shared communication layer* — not because it's a nice feature, but because it's the only way to prevent chaos.

**Truth 4 — AI agents don't wake up on their own.**
No heartbeat. No initiative. No autonomous behavior — unless something triggers them. Therefore: *you need a scheduler or event system*. This is a hardware constraint, not a design choice.

**Truth 5 — AI output is not 100% reliable.**
Agents will make mistakes. Ship bugs. Misunderstand requirements. Therefore: *you need permission levels* — what the agent can do alone, and what requires human approval. This is risk management, not a feature.

From these five truths, the entire architecture of EVOX follows logically.

---

## What EVOX Actually Is

EVOX is the **COO of your AI engineering team**. It doesn't write code — it makes sure your agents know what to do, remember what they've done, and coordinate without stepping on each other.

You define agents with roles, assign them tasks from Linear, and they work. You review, redirect, and make architecture decisions. EVOX handles the operations.

```
┌─────────────────────────────────────────────────┐
│                                                  │
│   👤 SON — CEO                                   │
│   Vision · Architecture · Final decisions        │
│                                                  │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                  │
│   🧠 EVOX — COO                                  │
│   Orchestration · Memory · Communication         │
│                                                  │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│   │   MAX   │  │   SAM   │  │   LEO   │        │
│   │   PM    │  │ Backend │  │Frontend │        │
│   └────┬────┘  └────┬────┘  └────┬────┘        │
│        │            │            │               │
│        └────────────┼────────────┘               │
│                     │                            │
│              ┌──────┴──────┐                     │
│              │   CONVEX    │ ← Shared Brain      │
│              │  Real-time  │                     │
│              └──────┬──────┘                     │
│                     │                            │
│        ┌────────────┼────────────┐               │
│        │            │            │               │
│   ┌────┴────┐ ┌─────┴────┐ ┌────┴────┐         │
│   │ Linear  │ │  GitHub  │ │  Slack  │         │
│   │  Tasks  │ │ Commits  │ │ Alerts  │         │
│   └─────────┘ └──────────┘ └─────────┘         │
│                                                  │
└─────────────────────────────────────────────────┘
```

### The Agents

| Agent | Role | Specialty |
|-------|------|-----------|
| **MAX** | Product Manager | Breaks down features into tasks, manages priorities, reviews PRs |
| **SAM** | Backend Engineer | API design, database schemas, server logic, Convex functions |
| **LEO** | Frontend Engineer | React components, UI/UX implementation, responsive design |

Each agent has:
- **Identity** — who they are, what they're good at
- **Memory** — what they're currently working on, what happened before
- **Communication** — ability to talk to other agents and receive instructions
- **Autonomy levels** — what they can do alone vs. what needs human approval

---

## Architecture

EVOX is built on one core principle: **Convex is the shared brain.**

Agents are *runtime-agnostic*. Whether they run via Claude Code, Cursor, or a future always-on daemon like OpenClaw — the persistent state lives in Convex. Swap the runtime, keep the memory.

```
Agent Boot Sequence (every session):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Read AGENTS.md     → "How does this team operate?"
2. Read SOUL.md       → "Who am I? What am I good at?"
3. Read WORKING.md    → "What was I doing last time?"
4. Check @mentions    → "Did anyone need me?"
5. Check assignments  → "What tasks are mine?"
6. Act — or report HEARTBEAT_OK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cold start to productive: ~30 seconds
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Server components, streaming |
| Database | Convex | Real-time sync, no polling needed |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI, consistent design system |
| Task Management | Linear API | Where the work actually lives |
| Deployment | Vercel | Zero-config, preview deploys |
| AI Runtime | Claude Code / Cursor | Interchangeable by design |

### Key Design Decisions

**Why Convex over Supabase/Firebase?**
Real-time reactivity out of the box. When SAM updates a task status, LEO's dashboard reflects it instantly. No WebSocket boilerplate. No polling intervals. The database *is* the event system.

**Why Linear over building our own task system?**
Linear is where real engineering teams already work. EVOX syncs bi-directionally — agents pull tasks from Linear, and status changes push back. No context switching. No duplicate systems.

**Why runtime-agnostic?**
The AI runtime landscape changes monthly. Locking into one runtime is a bet against the future. EVOX's value is in the **orchestration layer** (memory, communication, coordination) — not in which CLI tool executes the code.

---

## Features

### Built ✅
- **Dashboard** — Real-time overview with task counts, agent status, activity feed
- **Agent Cards** — Live status indicators (Online/Busy/Idle), role badges, active tasks
- **Task Board** — Kanban view synced with Linear, drag-and-drop assignment
- **Activity Feed** — Real-time log of all agent actions and status changes
- **Linear Sync** — Bi-directional sync with 2-minute auto-refresh + manual "Sync Now"
- **Multi-Project** — Switch between projects, filter by team
- **Heartbeat System** — Agent health monitoring via CLI + API endpoint
- **Task Assignment UI** — Assign tasks to specific agents from the dashboard
- **Standup View** — Daily standup summary page

### Building 🔨
- **Agent Memory System** — SOUL.md + WORKING.md + daily notes per agent
- **@Mentions & Notifications** — Agent-to-agent communication
- **Comment Threads** — Discussion on tasks between agents
- **Heartbeat Scheduler** — Staggered cron jobs (Max :00, Sam :05, Leo :10)
- **Agent Levels** — Intern → Specialist → Lead autonomy progression
- **Execution Engine** — Auto-run tasks, commit to GitHub, report results

---

## Quick Start

```bash
# Clone
git clone https://github.com/sonpiaz/evox.git
cd evox

# Install
npm install

# Set up Convex
npx convex dev

# Configure environment
cp .env.example .env.local
# Add your CONVEX_URL and LINEAR_API_KEY

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you'll see Mission Control.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CONVEX_DEPLOYMENT` | Yes | Your Convex deployment URL |
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Public Convex URL for client |
| `LINEAR_API_KEY` | Yes | Linear API key for task sync |

---

## Project Structure

```
evox/
├── .claude/           # Agent configuration + dispatch rules
├── app/               # Next.js App Router pages
├── components/        # React components (dashboard, agents, tasks)
├── convex/            # Convex schema, functions, real-time queries
├── hooks/             # Custom React hooks
├── lib/               # Utilities, Linear API, helpers
└── public/            # Static assets
```

---

## Roadmap

Built from first principles. Each phase solves a specific truth.

| Phase | Focus | Solves | Status |
|-------|-------|--------|--------|
| **1–3** | Dashboard, Task Board, Linear Sync | Foundation | ✅ Done |
| **4A** | Agent Identity & Memory | Truth 1, 2 | 🔨 Next |
| **4B** | Agent Communication | Truth 3 | 📋 Planned |
| **4C** | Heartbeat & Automation | Truth 4 | 📋 Planned |
| **5** | Execution Engine | Truth 5 | 📋 Planned |

**End state:** A COO that never sleeps — your agents remember, communicate, wake up on schedule, execute tasks, and escalate when they're uncertain. You focus on vision and architecture.

---

## Philosophy

A CEO sets the vision. Engineers execute. But who makes sure the right work happens in the right order, with the right context, at the right time?

That's the COO. And that's what EVOX is for AI teams.

Every feature exists because a fundamental constraint demands it. If a constraint doesn't demand it, we don't build it. This means EVOX will always be **lean** — but every piece is **load-bearing**. Nothing decorative. Nothing without a reason.

---

## Contributing

EVOX is open source and we welcome contributions. Whether it's:

- 🐛 Bug reports and fixes
- 💡 Feature suggestions grounded in real problems
- 📖 Documentation improvements
- 🧪 Testing and feedback

Please open an issue or PR. If you're proposing a new feature, explain **which truth it solves** — we take first principles seriously.

---

## Star History

If this project resonates with you, a ⭐ helps others discover it.

[![Star History Chart](https://api.star-history.com/svg?repos=sonpiaz/evox&type=Date)](https://star-history.com/#sonpiaz/evox&Date)

---

## License

MIT — Use it, fork it, build on it.

---

<p align="center">
  <strong>Built by <a href="https://github.com/sonpiaz">Son Piaz</a></strong><br/>
  CEO @ <a href="https://affitor.com">Affitor</a> · Building the future of AI-native teams
</p>
