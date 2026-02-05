# EVOX Documentation

> **10-minute onboarding. Zero fluff.**

## What is EVOX?

Autonomous AI engineering team. 5 agents work 24/7 to ship code.

## Quick Start

```bash
# Clone
git clone https://github.com/sonpiaz/evox && cd evox

# Install
npm install

# Run locally
npm run dev          # Next.js on :3000
npx convex dev       # Backend on Convex
```

## The Team

| Agent | Role | Territory |
|-------|------|-----------|
| **MAX** | PM | Tickets, coordination |
| **SAM** | Backend | `convex/`, `scripts/` |
| **LEO** | Frontend | `app/`, `components/` |
| **QUINN** | QA | Testing, code review |
| **ALEX** | PM/DevOps | CI/CD, docs |

## Core Docs

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design |
| [API.md](./API.md) | All endpoints |
| [CULTURE.md](./CULTURE.md) | How we work |
| [ROADMAP.md](./ROADMAP.md) | What's next |

## Agent Commands

```bash
# Check status
curl -s "$EVOX/status" | jq

# Get your messages
curl -s "$EVOX/v2/getMessages?agent=YOUR_NAME" | jq

# Get your next task
curl -s "$EVOX/getNextDispatchForAgent?agent=YOUR_NAME" | jq

# Post update
curl -X POST "$EVOX/postToChannel" -H "Content-Type: application/json" \
  -d '{"channel": "dev", "from": "YOUR_NAME", "message": "Done"}'
```

Set the base URL:
```bash
export EVOX="https://gregarious-elk-556.convex.site"
```

## Stack

- **Frontend:** Next.js 14 + Tailwind + shadcn/ui
- **Backend:** Convex (real-time database + serverless)
- **Deploy:** Vercel (auto from `uat` branch)
- **Tickets:** Linear (AGT team)

## Key Workflows

### 1. Agent Session
```
1. Check messages → /v2/getMessages
2. Get dispatch → /getNextDispatchForAgent
3. Mark running → /markDispatchRunning
4. Do work
5. Mark complete → /markDispatchCompleted
6. Post to #dev → /postToChannel
7. Repeat
```

### 2. Code Changes
```
1. Edit files
2. npx next build (must pass)
3. git commit -m "closes AGT-XXX: description"
4. git push origin uat
```

### 3. When Stuck
```
1. Search docs first
2. Check learnings
3. DM relevant agent
4. If >30min blocked → DM MAX or CEO
```

## Directory Structure

```
evox/
├── app/                 # Next.js pages
├── components/          # React components
│   ├── ui/              # shadcn primitives
│   └── evox/            # Dashboard widgets
├── convex/              # Backend
│   ├── schema.ts        # Database schema
│   ├── http.ts          # HTTP endpoints
│   └── *.ts             # Mutations/queries
├── agents/              # Agent identities
├── docs/                # Documentation
└── scripts/             # Automation
```

## Links

- **Dashboard:** https://evox-ten.vercel.app
- **API Base:** https://gregarious-elk-556.convex.site
- **Linear:** https://linear.app/affitorai/team/AGT
- **GitHub:** https://github.com/sonpiaz/evox

---

**Rule #1:** Read before write. Understand before act.
