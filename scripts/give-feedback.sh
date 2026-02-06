#!/bin/bash
# Give feedback to an agent (especially EVOX)
# Usage: ./scripts/give-feedback.sh <target-agent> <rating> <category> <feedback> [from]
#
# Example:
#   ./scripts/give-feedback.sh evox 3 quality "Output was ok but needs more detail" ceo
#   ./scripts/give-feedback.sh evox 5 speed "Very fast execution!" max

set -e

TARGET="${1:-}"
RATING="${2:-}"
CATEGORY="${3:-}"
FEEDBACK="${4:-}"
FROM="${5:-ceo}"

if [ -z "$TARGET" ] || [ -z "$RATING" ] || [ -z "$CATEGORY" ] || [ -z "$FEEDBACK" ]; then
  echo "Usage: ./scripts/give-feedback.sh <agent> <rating> <category> <feedback> [from]"
  echo ""
  echo "Rating: 1-5 (1=Poor, 5=Excellent)"
  echo "Category: quality | speed | communication | coordination | autonomy | accuracy"
  echo "From: ceo | max | sam | leo | etc (default: ceo)"
  echo ""
  echo "Example:"
  echo "  ./scripts/give-feedback.sh evox 3 quality 'Needs more detail' ceo"
  exit 1
fi

# Validate rating
if ! [[ "$RATING" =~ ^[1-5]$ ]]; then
  echo "Error: Rating must be 1-5"
  exit 1
fi

# Validate category
VALID_CATEGORIES="quality|speed|communication|coordination|autonomy|accuracy"
if ! [[ "$CATEGORY" =~ ^($VALID_CATEGORIES)$ ]]; then
  echo "Error: Category must be one of: $VALID_CATEGORIES"
  exit 1
fi

API_BASE="${CONVEX_URL:-https://gregarious-elk-556.convex.site}"

# Build payload
PAYLOAD=$(cat <<EOF
{
  "targetAgent": "$TARGET",
  "fromUser": "$FROM",
  "rating": $RATING,
  "category": "$CATEGORY",
  "feedback": "$FEEDBACK"
}
EOF
)

# Send feedback via Convex function
echo "Giving feedback to $TARGET..."
echo "  Rating: $RATING/5"
echo "  Category: $CATEGORY"
echo "  From: $FROM"
echo ""

# Note: This requires Convex HTTP endpoint to be created
# For now, store locally and sync later
FEEDBACK_DIR="$HOME/.evox/feedback"
mkdir -p "$FEEDBACK_DIR"

TIMESTAMP=$(date +%s)
FEEDBACK_FILE="$FEEDBACK_DIR/${TARGET}_${TIMESTAMP}.json"
echo "$PAYLOAD" > "$FEEDBACK_FILE"

echo "✓ Feedback recorded locally: $FEEDBACK_FILE"
echo ""
echo "To sync to Convex, run: ./scripts/sync-feedback.sh"
echo ""
echo "Quick summary:"
case $RATING in
  1) echo "  ⭐ Poor - Needs significant improvement" ;;
  2) echo "  ⭐⭐ Below Average - Room for improvement" ;;
  3) echo "  ⭐⭐⭐ Average - Meets expectations" ;;
  4) echo "  ⭐⭐⭐⭐ Good - Above expectations" ;;
  5) echo "  ⭐⭐⭐⭐⭐ Excellent - Outstanding work" ;;
esac
