Run a daily standup report for the EVOX project.

1. Read MEMORY.md for current context:
   - `/Users/sonpiaz/.claude/projects/-Users-sonpiaz/memory/MEMORY.md`

2. Check recent git activity:
   ```bash
   cd /Users/sonpiaz/evox && git log --oneline --since="24 hours ago"
   ```

3. Check agent status:
   ```bash
   for agent in sam leo quinn max nova; do
     echo "=== $agent ==="
     tmux capture-pane -t evox-work:$agent -p 2>/dev/null | tail -3 || echo "OFFLINE"
   done
   ```

4. Check for open/blocked work:
   - Active Linear tickets (In Progress / In Review)
   - Any blockers mentioned in MEMORY.md

5. Present status in this format:

   **Yesterday:**
   - [commits and completed work from git log]

   **Today:**
   - [next priorities from MEMORY.md "Next Up" section]

   **Blockers:**
   - [any blockers from MEMORY.md or dead agents]

   **Agents:** SAM ✅/❌ | LEO ✅/❌ | QUINN ✅/❌ | MAX ✅/❌ | NOVA ✅/❌

6. Confirm priority for today:
   - Ask: "Does this priority order look right, or should we adjust?"
