# EVOX Mission Control — Claude Code Rules
# Auto-loaded by Claude Code every session. Last updated: Feb 1, 2026 (Session 3)
# This file mirrors .cursorrules — keep them in sync.

## Project
- **App:** EVOX Mission Control — AI agent orchestration dashboard
- **Stack:** Next.js 14 App Router + Convex (real-time DB) + Tailwind + shadcn/ui
- **Deploy:** Vercel → evox-ten.vercel.app
- **Repo:** github.com/sonpiaz/evox

## Team Territory
- **Sam (Backend):** `convex/`, `lib/evox/`, `scripts/` — ONLY
- **Leo (Frontend):** `app/`, `components/` — ONLY
- **Max (PM):** Linear docs, planning, quality rules
- Do NOT touch another agent's territory. Create a task instead.

## Agent Instructions
- Sam: https://linear.app/affitorai/document/sam-instructions-backend-agent-a0ad2c23626a
- Leo: https://linear.app/affitorai/document/leo-instructions-frontend-agent-c84654462a4d
- Read your instructions + this file at session start.

---

## ⛔ QUALITY RULES — Read Before Every Commit

### Rule 1: NEVER Display Raw Convex _id to Users
Raw Convex IDs look like: `jx75d6f7qsprkftb6wxpsf8qsh80ak3p`
They must NEVER appear in the UI. Always use:
```
linearIdentifier ?? "—"
```
This applies to: activity feed, standup tasks, task cards, agent cards, everywhere.
If data doesn't have linearIdentifier, show "—" or the task title — NEVER the _id.

Grep check before commit:
```bash
grep -rn "\._id" app/ components/ --include="*.tsx" | grep -v "key=" | grep -v "// internal" | grep -v ".filter" | grep -v ".find" | grep -v ".map"
```
Any line that renders `._id` or `.id` as display text = BUG.

### Rule 2: Build MUST Pass Before Push
```bash
npx next build   # MUST pass. No exceptions.
```

### Rule 3: ALL Files Must Be Committed
After creating new files:
```bash
git status
git add .
npx next build
```
Common miss: `convex/_generated/` after adding new Convex modules.

### Rule 4: Test ALL Conditional Cases
Use `.toLowerCase()` for string comparison. Test EVERY case, not just happy path.
```typescript
// ❌ BAD
status === "online" ? "green" : "red"
// ✅ GOOD
const colors = { online: "green", busy: "yellow", idle: "gray", offline: "red" };
colors[status.toLowerCase()] ?? "gray"
```

### Rule 5: Verify EVERY Page After Changes
Before committing, open EVERY page in dev mode:
```
□ /dashboard  — stats cards, agent cards, activity feed
□ /standup    — date, summary stats, per-agent lists, no raw IDs
□ /agents     — agent list
□ /tasks      — kanban columns, counts match dashboard
□ /messages   — no crash
□ /activity   — no raw Convex IDs
□ /settings   — no crash
```

### Rule 6: Use completeTask API for Attribution
```bash
npx convex run agentActions:completeTask \
  '{"agent":"sam","ticket":"AGT-XXX","action":"completed","summary":"..."}'
```

### Rule 7: Timestamps — UTC Backend, Local Frontend

### Rule 8: Data Consistency Across Pages
Dashboard stats == Standup stats == Tasks page. If numbers differ = BUG.

---

## Known Bug Patterns

| Pattern | Prevention |
|---------|------------|
| Raw Convex _id in UI | Always linearIdentifier ?? "—" |
| Vercel build fail | `npx next build` locally first |
| Missing file in git | `git status` before push |
| Status string case | Always `.toLowerCase()` |
| Timezone mismatch | UTC backend, local frontend |
| Attribution = Son | Use `completeTask` API |
| Partial fix | Test with ALL existing data |
| Overwriting previous fixes | Check `git diff` before commit |

---

## Pre-Commit Checklist

```bash
npx next build                    # Must pass
git status                        # No untracked files
grep -rn "\.id}" app/ components/ --include="*.tsx" | grep -v "key="  # No raw IDs
# Visually check all 7 pages in dev
git diff --stat HEAD              # Review changes
git add . && git commit -m "closes AGT-XX: description" && git push
npx convex run agentActions:completeTask '{"agent":"...","ticket":"AGT-XX","action":"completed","summary":"..."}'
./scripts/linear-report.sh AGT-XX "✅ Done. [summary]. Files: [changed]. Commit: [hash]"
```

---

## Agent Reporting Protocol (MANDATORY)

After completing EACH ticket:
1. `git commit + push` with "closes AGT-XX"
2. Run Convex completeTask API (updates task status + activity)
3. Run: `./scripts/linear-report.sh AGT-XX "✅ Done. [summary]. Files: [changed]. Commit: [hash]"`

This posts a comment on Linear so Max (PM) can track progress without copy-paste.
Never skip this step — Max reads Linear to track your work.
