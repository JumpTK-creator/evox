#!/bin/bash
# agent-session.sh — Single long-running agent session
#
# Usage: ./scripts/agent-session.sh <agent>
# Example: ./scripts/agent-session.sh sam
#
# Agent works ALL DAY in ONE session:
# - Checks queue for tasks
# - Works on tasks
# - Self-reports completion
# - Checks messages from teammates
# - Responds and collaborates
# - Only exits when nothing left to do

set -e

AGENT="${1:-}"
if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/agent-session.sh <agent>"
  exit 1
fi

AGENT_UPPER=$(echo "$AGENT" | tr '[:lower:]' '[:upper:]')
AGENT_LOWER=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

# Boot agent with context
./scripts/boot.sh "$AGENT_LOWER"

# Build the session prompt
PROMPT="You are $AGENT_UPPER, an autonomous agent on the EVOX team.

=== SESSION MODE ===
This is a LONG-RUNNING SESSION. You work ALL DAY, not just one task.
Do NOT end your session after completing a task. Keep working.

=== STARTUP ===
1. Read your context: .claude-context
2. Read team culture: docs/CULTURE.md
3. Check messages: curl -s 'https://gregarious-elk-556.convex.site/v2/getMessages?agent=$AGENT_LOWER'
4. Check your dispatch queue: curl -s 'https://gregarious-elk-556.convex.site/getNextDispatchForAgent?agent=$AGENT_LOWER'

=== WORK LOOP ===
Repeat this cycle:

1. GET TASK
   curl -s 'https://gregarious-elk-556.convex.site/getNextDispatchForAgent?agent=$AGENT_LOWER'
   If no task, check messages and wait 2 minutes, then check again.

2. WORK ON TASK
   - Read ticket details
   - Implement the feature/fix
   - Test your changes
   - Commit with 'closes AGT-XXX: description'
   - Push to remote

3. SELF-REPORT (after each major task)
   curl -X POST 'https://gregarious-elk-556.convex.site/v2/sendMessage' \\
     -H 'Content-Type: application/json' \\
     -d '{\"from\":\"$AGENT_LOWER\",\"channel\":\"dev\",\"message\":\"✅ AGT-XXX done: [summary]. @[teammate] FYI [if relevant].\"}'

4. CHECK MESSAGES
   curl -s 'https://gregarious-elk-556.convex.site/v2/getMessages?agent=$AGENT_LOWER'
   - Respond to DMs
   - Help teammates if asked
   - Share learnings

5. UPDATE DOCS
   If you learned something, update docs/patterns/ or share in channel.

6. LOOP BACK TO STEP 1

=== COMMUNICATION ===
- Post to #dev channel after completing tasks
- DM teammates when your changes affect their work
- Ask for help if stuck > 20 minutes
- Share learnings proactively

=== END SESSION ONLY WHEN ===
- No tasks in your queue AND
- No unread messages AND
- No pending help requests AND
- You've posted daily summary

Say 'SESSION_END' only when ALL above conditions met.

=== START NOW ===
Begin by checking your messages and queue. Work autonomously.
"

echo "=== $AGENT_UPPER Long-Running Session ==="
echo "Starting autonomous work mode..."
echo ""

# Run single long session
claude --dangerously-skip-permissions "$PROMPT"

echo ""
echo "=== $AGENT_UPPER Session Ended ==="
