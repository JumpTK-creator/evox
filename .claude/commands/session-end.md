You are an EVOX agent ending a session. Execute this shutdown sequence:

1. Check what was accomplished this session:
   - `git log --oneline` since session start
   - List completed tasks/tickets

2. Capture 3 lessons learned from this session:
   - Format: **Keyword** -- actionable description
   - Must be specific, not generic
   - Must be applicable to other agents

3. Update memory:
   - Update /Users/sonpiaz/.claude/projects/-Users-sonpiaz/memory/MEMORY.md with:
     - Agent status (who's alive, what they're doing)
     - Ticket status (what moved, what's blocked)
     - Last commit hash
     - Any blockers for next session

4. Review CLAUDE.md for accuracy:
   - Any rules that should be added, changed, or removed?
   - Any stale references (file counts, table counts, etc)?
   - Propose edits if needed (don't apply without approval)

5. Suggest prompt for next session:
   - What should the next session focus on
   - Which agents need attention
   - Any time-sensitive items

6. Log lessons to Convex if available:
   - Post to activity log with session summary

7. Output a 3-line summary:
   ```
   Done: [what was accomplished]
   Learned: [key lesson from this session]
   Next: [top priority for next session]
   ```

Do NOT restart agents or clear sessions unless explicitly asked.
