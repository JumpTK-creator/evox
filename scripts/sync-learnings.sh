#!/bin/bash
# Sync learnings from local storage to Convex
# Usage: ./scripts/sync-learnings.sh

set -e

LEARNING_DIR="$HOME/.evox/learnings"
API_BASE="${CONVEX_URL:-https://gregarious-elk-556.convex.site}"

if [ ! -d "$LEARNING_DIR" ]; then
  echo "No learnings to sync (directory $LEARNING_DIR does not exist)"
  exit 0
fi

# Count files
TOTAL=$(find "$LEARNING_DIR" -name "*.json" 2>/dev/null | wc -l | xargs)

if [ "$TOTAL" -eq 0 ]; then
  echo "No learnings to sync"
  exit 0
fi

echo "Syncing $TOTAL learnings to Convex..."
echo ""

SYNCED=0
FAILED=0

for FILE in "$LEARNING_DIR"/*.json; do
  [ -e "$FILE" ] || continue

  echo "Syncing: $(basename "$FILE")"

  # Call Convex mutation
  if npx convex run agentLearning:recordLearning --prod "$(cat "$FILE")" 2>/dev/null; then
    echo "  ✓ Synced"
    # Move to synced folder
    mkdir -p "$LEARNING_DIR/synced"
    mv "$FILE" "$LEARNING_DIR/synced/"
    ((SYNCED++))
  else
    echo "  ✗ Failed"
    ((FAILED++))
  fi
  echo ""
done

echo "=========================================="
echo "Sync complete!"
echo "  Synced: $SYNCED"
echo "  Failed: $FAILED"
echo "=========================================="

if [ $SYNCED -gt 0 ]; then
  echo ""
  echo "View learnings at:"
  echo "  https://gregarious-elk-556.convex.site/v2/learnings?agent=evox"
fi
