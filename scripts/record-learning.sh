#!/bin/bash
# Record a learning/lesson for an agent
# Usage: ./scripts/record-learning.sh <agent> <title> <category> <importance> <lesson> [context]
#
# Example:
#   ./scripts/record-learning.sh evox \
#     "Always forward exact messages" \
#     "communication" \
#     "critical" \
#     "Never interpret CEO's intent, forward exact message"

set -e

AGENT="${1:-}"
TITLE="${2:-}"
CATEGORY="${3:-}"
IMPORTANCE="${4:-}"
LESSON="${5:-}"
CONTEXT="${6:-}"

if [ -z "$AGENT" ] || [ -z "$TITLE" ] || [ -z "$CATEGORY" ] || [ -z "$IMPORTANCE" ] || [ -z "$LESSON" ]; then
  echo "Usage: ./scripts/record-learning.sh <agent> <title> <category> <importance> <lesson> [context]"
  echo ""
  echo "Category: mistake | best-practice | quality-tip | workflow | communication | coordination"
  echo "Importance: low | medium | high | critical"
  echo ""
  echo "Example:"
  echo "  ./scripts/record-learning.sh evox \\"
  echo "    'Forward exact messages' \\"
  echo "    'communication' \\"
  echo "    'critical' \\"
  echo "    'Never interpret CEO intent, forward exact message'"
  exit 1
fi

# Validate category
VALID_CATEGORIES="mistake|best-practice|quality-tip|workflow|communication|coordination"
if ! [[ "$CATEGORY" =~ ^($VALID_CATEGORIES)$ ]]; then
  echo "Error: Category must be one of: $VALID_CATEGORIES"
  exit 1
fi

# Validate importance
VALID_IMPORTANCE="low|medium|high|critical"
if ! [[ "$IMPORTANCE" =~ ^($VALID_IMPORTANCE)$ ]]; then
  echo "Error: Importance must be one of: $VALID_IMPORTANCE"
  exit 1
fi

API_BASE="${CONVEX_URL:-https://gregarious-elk-556.convex.site}"

# Build payload
PAYLOAD=$(cat <<EOF
{
  "agent": "$AGENT",
  "title": "$TITLE",
  "category": "$CATEGORY",
  "importance": "$IMPORTANCE",
  "lesson": "$LESSON"
EOF
)

if [ -n "$CONTEXT" ]; then
  PAYLOAD="$PAYLOAD,
  \"context\": \"$CONTEXT\""
fi

PAYLOAD="$PAYLOAD
}"

# Store learning
echo "Recording learning for $AGENT..."
echo "  Title: $TITLE"
echo "  Category: $CATEGORY"
echo "  Importance: $IMPORTANCE"
echo ""

# Store locally for now
LEARNING_DIR="$HOME/.evox/learnings"
mkdir -p "$LEARNING_DIR"

TIMESTAMP=$(date +%s)
LEARNING_FILE="$LEARNING_DIR/${AGENT}_${TIMESTAMP}.json"
echo "$PAYLOAD" > "$LEARNING_FILE"

echo "✓ Learning recorded locally: $LEARNING_FILE"
echo ""
echo "To sync to Convex, run: ./scripts/sync-learnings.sh"
echo ""

# Show importance indicator
case $IMPORTANCE in
  low) echo "  💡 Low priority - Nice to know" ;;
  medium) echo "  📝 Medium priority - Should apply" ;;
  high) echo "  ⚠️  High priority - Must apply" ;;
  critical) echo "  🚨 CRITICAL - Never forget this!" ;;
esac
