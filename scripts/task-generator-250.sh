#!/bin/bash
# Generate 250 tasks in 60 minutes = ~4 tasks/minute

EVOX_API="https://gregarious-elk-556.convex.site"
AGENTS=("MAX" "SAM" "LEO" "MAYA" "QUINN")
TASK_COUNT=0
START_TIME=$(date +%s)

log_task() {
  local id=$1
  local title=$2
  local agent=$3
  local status=$4
  echo "$(date '+%H:%M:%S') | T-$id | $agent | $status | $title" >> /tmp/velocity-log.txt
}

create_task() {
  local title="$1"
  local agent="${AGENTS[$((RANDOM % 5))]}"
  TASK_COUNT=$((TASK_COUNT + 1))
  
  curl -s -X POST "$EVOX_API/v2/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"from\": \"FACTORY\", \"to\": \"$agent\", \"message\": \"TASK-$TASK_COUNT: $title. Complete in <2min. Reply DONE when finished.\"}" > /dev/null
  
  log_task $TASK_COUNT "$title" "$agent" "CREATED"
  echo "[$TASK_COUNT] → $agent: $title"
}

echo "🚀 VELOCITY-250 Starting at $(date '+%H:%M:%S')"
echo "Target: 250 tasks in 60 minutes"
echo ""

# Code improvement tasks
for file in $(find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | head -30); do
  create_task "Review $file for improvements"
  create_task "Add comments to $file"
  create_task "Check types in $file"
done

# Documentation tasks
for doc in README CULTURE VISION ROADMAP AGENT-PUSH VELOCITY-200; do
  create_task "Review docs/$doc.md"
  create_task "Improve docs/$doc.md"
done

# Component tasks
for comp in $(ls components/evox/*.tsx 2>/dev/null | head -20); do
  name=$(basename $comp)
  create_task "Review $name accessibility"
  create_task "Add loading states to $name"
  create_task "Optimize $name performance"
done

# Test tasks
create_task "Run npm run build and report"
create_task "Run npm run lint and fix issues"
create_task "Check for console.log statements"
create_task "Verify all imports used"
create_task "Check for unused variables"

# API tasks
for api in $(ls app/api/**/route.ts 2>/dev/null | head -10); do
  create_task "Review $api error handling"
  create_task "Add validation to $api"
done

# Convex tasks
for conv in $(ls convex/*.ts 2>/dev/null | head -15); do
  name=$(basename $conv)
  create_task "Review convex/$name"
  create_task "Add types to convex/$name"
done

# Agent coordination tasks
for agent in MAX SAM LEO MAYA QUINN; do
  create_task "$agent: Check your messages and respond"
  create_task "$agent: Review peer's last commit"
  create_task "$agent: Update your status in channel"
  create_task "$agent: Ask one question to team"
done

# Micro improvements
for i in $(seq 1 50); do
  create_task "Micro-improvement #$i: Find and fix one small issue"
done

echo ""
echo "✅ Created $TASK_COUNT tasks"
echo "📊 Log: /tmp/velocity-log.txt"
