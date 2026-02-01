# Playbook: Pre-Commit

**When:** Before every git commit
**Who:** All agents making code changes
**Time:** ~2 minutes

## Checklist

```bash
# 1. Build must pass
npx next build

# 2. Check for untracked files
git status

# 3. Check for raw Convex IDs in UI (frontend only)
grep -rn "\._id" app/ components/ --include="*.tsx" | grep -v "key=" | grep -v "// internal" | grep -v ".filter" | grep -v ".find" | grep -v ".map"
# Any output = BUG. Fix before committing.

# 4. Review your changes
git diff --stat HEAD

# 5. Visual check (frontend changes)
# Open dev server and verify ALL pages:
#   /dashboard  — stats cards, agent cards, activity feed
#   /standup    — date, summary stats, per-agent lists
#   /agents     — agent list
#   /tasks      — kanban columns, counts match dashboard
#   /messages   — no crash
#   /activity   — no raw Convex IDs
#   /settings   — no crash
```

## Commit Format

```bash
git add [specific-files]
git commit -m "$(cat <<'EOF'
[type]: [description]

closes AGT-XX

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `chore`

## Common Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Build fails on Vercel | Didn't run `npx next build` | Run build locally first |
| Raw _id in activity feed | Used `.id` instead of `linearIdentifier` | Use `linearIdentifier ?? "—"` |
| "File not found" on Vercel | Forgot to `git add` new file | `git status` before commit |
| Type error on deploy | TypeScript error not caught | Run `npx next build` locally |

## References
- Pattern: DISPLAY-IDS.md
- Pattern: BUILD-VERIFICATION.md
