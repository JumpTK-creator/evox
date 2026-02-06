#!/bin/bash
# load-all-identities.sh — Load all agent identities for system overview
# Usage: ./scripts/load-all-identities.sh

set -e

AGENTS_DIR="agents"
OUTPUT_FILE="docs/AGENT-IDENTITIES.md"

echo "Loading all agent identities..."

# Create header
cat > "$OUTPUT_FILE" <<'EOF'
# EVOX Agent Identities — System Overview

*Auto-generated from agents/*.md — Single Source of Truth*

Last updated: $(date '+%Y-%m-%d %H:%M:%S')

---

EOF

# Add date
sed -i '' "s/\$(date.*/$(date '+%Y-%m-%d %H:%M:%S')/" "$OUTPUT_FILE"

# Active agents
ACTIVE_AGENTS=("evox" "sam" "leo" "quinn" "max")

echo "## Active Agents" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

for agent in "${ACTIVE_AGENTS[@]}"; do
  AGENT_FILE="$AGENTS_DIR/$agent.md"

  if [ -f "$AGENT_FILE" ]; then
    echo "Loading $agent..."

    # Extract key info
    NAME=$(grep "^# " "$AGENT_FILE" | head -1 | sed 's/# //')
    QUOTE=$(grep "^> " "$AGENT_FILE" | head -1 | sed 's/> //')
    ROLE=$(grep "| Role |" "$AGENT_FILE" | sed 's/.*| \(.*\) |/\1/')

    echo "### $NAME" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "> $QUOTE" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "**Role:** $ROLE" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "**Full Identity:** [agents/$agent.md](../agents/$agent.md)" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "---" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
  else
    echo "Warning: $AGENT_FILE not found"
  fi
done

# Summary
echo "" >> "$OUTPUT_FILE"
echo "## Quick Reference" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "| Agent | Role | Territory | Load Command |" >> "$OUTPUT_FILE"
echo "|-------|------|-----------|--------------|" >> "$OUTPUT_FILE"

for agent in "${ACTIVE_AGENTS[@]}"; do
  AGENT_FILE="$AGENTS_DIR/$agent.md"

  if [ -f "$AGENT_FILE" ]; then
    ROLE=$(grep "| Role |" "$AGENT_FILE" | sed 's/.*| \(.*\) |/\1/' | xargs)
    TERRITORY=$(grep "| Territory |" "$AGENT_FILE" | sed 's/.*| \(.*\) |/\1/' | xargs)
    AGENT_UPPER=$(echo "$agent" | tr '[:lower:]' '[:upper:]')

    echo "| $AGENT_UPPER | $ROLE | $TERRITORY | \`./scripts/boot.sh $agent\` |" >> "$OUTPUT_FILE"
  fi
done

echo "" >> "$OUTPUT_FILE"
echo "## Usage" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "### Boot an agent with identity" >> "$OUTPUT_FILE"
echo "\`\`\`bash" >> "$OUTPUT_FILE"
echo "./scripts/boot.sh evox          # Boot EVOX" >> "$OUTPUT_FILE"
echo "./scripts/boot.sh sam AGT-123   # Boot SAM with ticket" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "### Manual identity load" >> "$OUTPUT_FILE"
echo "\`\`\`bash" >> "$OUTPUT_FILE"
echo "cat agents/evox.md              # Read EVOX identity" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## Principles" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "- **Single Source of Truth:** All identities in \`agents/*.md\`" >> "$OUTPUT_FILE"
echo "- **Autonomous:** Agents self-direct based on identity" >> "$OUTPUT_FILE"
echo "- **Specialized:** Each agent has unique expertise" >> "$OUTPUT_FILE"
echo "- **Collaborative:** Agents communicate and handoff" >> "$OUTPUT_FILE"
echo "- **Production-ready:** All output is production quality" >> "$OUTPUT_FILE"

echo ""
echo "✅ All identities loaded!"
echo "Output: $OUTPUT_FILE"
echo ""
echo "Preview:"
head -20 "$OUTPUT_FILE"
