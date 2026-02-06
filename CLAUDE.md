# EVOX Mission Control — Agent Rules

Auto-loaded every Claude Code session. Last updated: Feb 6, 2026.

## Project

| Key | Value |
|-----|-------|
| Stack | Next.js 14 App Router + Convex + Tailwind v4 + shadcn/ui |
| Deploy | Vercel → evox-ten.vercel.app |
| Repo | github.com/sonpiaz/evox |
| Design System | V2 — [docs/EVOX-DESIGN-SYSTEM.md](docs/EVOX-DESIGN-SYSTEM.md) |

**Read First:** [docs/VISION.md](docs/VISION.md) — Org DNA. [docs/CULTURE.md](docs/CULTURE.md) — How we work.

## Team Territories

| Agent | Territory | Files |
|-------|-----------|-------|
| Sam | Backend | `convex/`, `lib/evox/`, `scripts/` |
| Leo | Frontend | `app/`, `components/` |
| Quinn | QA | `*.test.ts`, `e2e/`, code review |
| Max | PM | Linear docs, planning, coordination |

Cross-territory edits allowed — just report in #dev.

---

## Architecture Rules (MANDATORY)

### Rule 1: Design System V2 Tokens — No Raw Color Classes

All UI code MUST use semantic V2 tokens. **Never use `zinc-*`, `gray-*`, `slate-*` for theming.**

| Instead of | Use |
|-----------|-----|
| `bg-zinc-950` | `bg-base` |
| `bg-zinc-900` | `bg-surface-1` |
| `bg-zinc-800` | `bg-surface-4` |
| `border-zinc-800` | `border-border-default` |
| `text-zinc-400` | `text-secondary` |
| `text-zinc-500` | `text-tertiary` |
| `text-zinc-300` | `text-primary` |

Full token reference: [docs/EVOX-DESIGN-SYSTEM.md](docs/EVOX-DESIGN-SYSTEM.md). Tokens defined in `app/globals.css` `@theme inline` block.

### Rule 2: No New Files Without Search

Before creating ANY new file, search for existing ones. `grep -rn "Name" components/ --include="*.tsx" -l`
**If similar exists → EDIT it.** We have 7 dashboard variants from agents creating instead of editing.

### Rule 3: Agent Identity — String Names, NOT Convex IDs

Canonical identifier: `"sam"`, `"leo"`, `"max"`, `"quinn"`. Never compare `v.id("agents")` with string names — resolve with `resolveAgentNameById()` first.

### Rule 4: Single Source of Truth

| Constant | Source |
|----------|--------|
| Agent list/valid agents | `convex/agentRegistry.ts` |
| Status codes/SLA/labels | `convex/messageStatus.ts` |

**Never hardcode agent lists like `["sam", "leo", "max"]`.**

### Rule 5: One Messaging Table

All new code → `unifiedMessages`. Legacy tables (`agentMessages`, `messages`, `meshMessages`) are read-only.

### Rule 6: No New Schema Tables Without CEO Approval

48 tables already. Check if existing table can be extended first.

### Rule 7: Proof of Work

Ticket "Done" requires: commit hash + files changed + build passes. **No commit = not done.**

### Rule 8: Delete Dead Code

Replace = delete old file + remove imports + verify build. Don't leave code "just in case."

### Rule 9: Max File Size

Components: 300 lines. Convex files: 500 lines. Split if exceeded.

---

## Quality Gates

| Check | Command |
|-------|---------|
| Build passes | `npx next build` |
| No raw `_id` in UI | `grep -rn "\._id" app/ components/ --include="*.tsx" \| grep -v "key="` |
| No zinc-* classes | `grep -rn "zinc-" app/ components/ --include="*.tsx"` |
| All committed | `git status` |

---

## Playbooks

| When | Link |
|------|------|
| Session start | [docs/playbooks/SESSION-START.md](docs/playbooks/SESSION-START.md) |
| Pre-commit | [docs/playbooks/PRE-COMMIT.md](docs/playbooks/PRE-COMMIT.md) |
| Task complete | [docs/playbooks/TASK-COMPLETE.md](docs/playbooks/TASK-COMPLETE.md) |

## Patterns

| Pattern | Link |
|---------|------|
| Display IDs | [docs/patterns/DISPLAY-IDS.md](docs/patterns/DISPLAY-IDS.md) |
| Status Colors | [docs/patterns/STATUS-COLORS.md](docs/patterns/STATUS-COLORS.md) |
| Attribution | [docs/patterns/ATTRIBUTION.md](docs/patterns/ATTRIBUTION.md) |
| Convex Actions | [docs/patterns/CONVEX-ACTIONS.md](docs/patterns/CONVEX-ACTIONS.md) |

## Architecture Decisions

ADR-001 through ADR-006: [docs/decisions/](docs/decisions/)

---

## Security Rules

1. **No hardcoded secrets** — API keys, tokens, passwords → `.env.local` only
2. **Pre-commit** — Grep for secrets before every commit
3. **Review** [docs/LESSONS.md](docs/LESSONS.md) — Learn from past mistakes

## Self-Improvement Rules

1. **After a mistake** — add a lesson to MEMORY.md `Lessons Learned` section immediately
2. **If a pattern repeats 3x** — propose a new Architecture Rule in CLAUDE.md
3. **If a rule is wrong** — fix it in CLAUDE.md, don't silently ignore it
4. **After every session** — run `/session-end` to capture what was learned
5. **Before complex work** — run `/plan` to get approval before writing code

## CLAUDE.md Maintenance

- Keep under 200 lines (currently ~145). Move details to docs/ if growing.
- Update when architecture changes (new rules, removed rules, new patterns)
- Don't duplicate MEMORY.md content — CLAUDE.md = rules, MEMORY.md = state
- Review accuracy during `/session-end` — remove stale rules, update counts
- Any agent can propose edits; CEO (EVOX) approves architecture changes

---

## Session End Protocol

Run `./scripts/restart-agent.sh <agent>` before restarting. Script captures output, collects lessons, logs session. **No other restart method allowed.**
