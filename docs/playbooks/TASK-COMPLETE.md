# Playbook: Task Complete

**When:** After completing any Linear ticket
**Who:** All agents
**Time:** ~1 minute

## Required Steps

```bash
# 1. Commit with ticket reference
git add [files]
git commit -m "$(cat <<'EOF'
[type]: [description]

closes AGT-XX

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
git push origin main

# 2. Update Convex task status + log activity
npx convex run agentActions:completeTask \
  '{"agent":"sam","ticket":"AGT-XX","action":"completed","summary":"Brief summary of what was done"}'

# 3. Report to Linear (so Max can track)
./scripts/linear-report.sh AGT-XX "Done. [summary]. Files: [list]. Verified: yes"
```

## What Each Step Does

1. **Git commit** — Creates audit trail, triggers GitHub webhook
2. **completeTask API** — Updates Convex task status, logs to activity feed, updates WORKING.md
3. **linear-report.sh** — Posts comment on Linear ticket for Max visibility

## Auto-Memory Updates

The `completeTask` mutation automatically:
- Updates task status to "done"
- Logs to activity feed with your attribution
- Appends to your WORKING.md "Recent Completions" section
- Logs to today's daily notes

## Example

```bash
git add convex/webhooks.ts convex/http.ts convex/schema.ts
git commit -m "$(cat <<'EOF'
feat: GitHub + Vercel webhook endpoints

- Add webhookEvents table
- Add /github-webhook endpoint
- Add /vercel-webhook endpoint

closes AGT-128

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
git push origin main

npx convex run agentActions:completeTask \
  '{"agent":"sam","ticket":"AGT-128","action":"completed","summary":"GitHub + Vercel webhook endpoints for Linear auto-comments"}'

./scripts/linear-report.sh AGT-128 "Done. Webhook endpoints deployed. Files: webhooks.ts, http.ts, schema.ts. Verified: build passes"
```

## References
- ADR-001: Attribution from caller, not API key
- ADR-002: Auto-update WORKING.md on completion
