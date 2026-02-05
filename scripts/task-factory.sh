#!/bin/bash
# task-factory.sh — Auto-generate micro-tasks from codebase
# Runs continuously, finds work, creates tasks

EVOX_DIR="/Users/sonpiaz/.openclaw/workspace/evox"
EVOX_API="https://gregarious-elk-556.convex.site"

cd "$EVOX_DIR"

echo "🏭 Task Factory Starting..."

# Function to create a task
create_task() {
  local title="$1"
  local description="$2"
  local agent="$3"
  local priority="${4:-normal}"
  
  echo "  📝 Creating: $title → $agent"
  
  curl -s -X POST "$EVOX_API/v2/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"from\": \"TASK_FACTORY\", \"to\": \"$agent\", \"message\": \"MICRO-TASK: $title\\n\\n$description\\n\\nComplete in <2 min. Report when done.\"}" > /dev/null
}

echo ""
echo "=== Scanning for TODOs ==="
TODO_COUNT=0
while IFS= read -r line; do
  FILE=$(echo "$line" | cut -d: -f1)
  LINENUM=$(echo "$line" | cut -d: -f2)
  CONTENT=$(echo "$line" | cut -d: -f3-)
  
  if [ $TODO_COUNT -lt 5 ]; then
    create_task "Fix TODO in $FILE:$LINENUM" "$CONTENT" "SAM"
    TODO_COUNT=$((TODO_COUNT + 1))
  fi
done < <(grep -rn "TODO" --exclude-dir=node_modules --exclude-dir=.next --include="*.ts" --include="*.tsx" . 2>/dev/null | head -10)
echo "  Found $TODO_COUNT TODO tasks"

echo ""
echo "=== Scanning for console.log ==="
LOG_COUNT=0
while IFS= read -r line; do
  FILE=$(echo "$line" | cut -d: -f1)
  LINENUM=$(echo "$line" | cut -d: -f2)
  
  if [ $LOG_COUNT -lt 3 ]; then
    create_task "Remove console.log in $FILE:$LINENUM" "Clean up debug logging" "LEO"
    LOG_COUNT=$((LOG_COUNT + 1))
  fi
done < <(grep -rn "console.log" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | head -5)
echo "  Found $LOG_COUNT console.log tasks"

echo ""
echo "=== Scanning for missing types ==="
ANY_COUNT=0
while IFS= read -r line; do
  FILE=$(echo "$line" | cut -d: -f1)
  LINENUM=$(echo "$line" | cut -d: -f2)
  
  if [ $ANY_COUNT -lt 3 ]; then
    create_task "Fix 'any' type in $FILE:$LINENUM" "Replace with proper TypeScript type" "SAM"
    ANY_COUNT=$((ANY_COUNT + 1))
  fi
done < <(grep -rn ": any" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | head -5)
echo "  Found $ANY_COUNT any-type tasks"

echo ""
echo "=== Creating review tasks ==="
create_task "Review VELOCITY-200.md" "Read and confirm understanding. Ask questions if unclear." "MAX"
create_task "Review AGENT-PUSH.md" "Read and implement peer accountability." "MAYA"
create_task "Review SELF-REPORTING.md" "Confirm you understand API calls required." "QUINN"

echo ""
echo "✅ Task Factory complete. Created $((TODO_COUNT + LOG_COUNT + ANY_COUNT + 3)) micro-tasks"
