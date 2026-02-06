# How to Use Claude Opus 4.6 - Quick Start

**For:** All EVOX agents
**Last Updated:** Feb 5, 2026

---

## 🎯 TL;DR

```bash
# Method 1: Direct prompt (for manual sessions)
claude --model opus "Your complex task here"

# Method 2: Environment variable
ANTHROPIC_MODEL=opus claude "Your task"

# Method 3: In code (Task tool)
model: "opus"
```

---

## Method 1: Claude Code CLI (Interactive Sessions)

### Basic Usage

```bash
# Use Opus for complex planning
claude --model opus "Design the agent identity system architecture"

# Use Sonnet (default) for implementation
claude "Implement AGT-332: Agent ID System"

# Use Haiku for simple tasks
claude --model haiku "Format this JSON file"
```

### With File Context

```bash
# Analyze complex codebase with Opus
claude --model opus --files "convex/**/*.ts" "Find performance bottlenecks"

# Regular development with Sonnet
claude --files "convex/schema.ts" "Add a new field to agents table"
```

### Interactive Mode

```bash
# Start Opus session
claude --model opus

# Then type your prompts
You: Design The Loop accountability system
Claude: [Opus-powered planning...]

You: /exit
```

---

## Method 2: Environment Variable

### Set Model for Entire Session

```bash
# Use Opus for planning session
export ANTHROPIC_MODEL=opus
claude "Plan Q1 2026 roadmap"
claude "Design database migration strategy"
unset ANTHROPIC_MODEL  # Reset to default (Sonnet)

# Or inline
ANTHROPIC_MODEL=opus claude "Your complex task"
```

### In Scripts

```bash
#!/bin/bash
# planning-session.sh

export ANTHROPIC_MODEL=opus

echo "Using Opus 4.6 for planning..."

claude "Design system architecture"
claude "Analyze dependencies"
claude "Estimate timeline"

unset ANTHROPIC_MODEL
```

---

## Method 3: Task Tool (Agent Spawning)

### In Agent Code

```typescript
// When spawning planning agent
await Task({
  subagent_type: "Plan",
  model: "opus",  // Explicitly use Opus 4.6
  description: "Design Loop system",
  prompt: "Create comprehensive implementation plan for The Loop..."
});

// Regular task (uses default Sonnet)
await Task({
  subagent_type: "general-purpose",
  description: "Implement feature",
  prompt: "Implement AGT-332..."
  // No model specified = Sonnet 4.5
});

// Fast task (use Haiku)
await Task({
  subagent_type: "Explore",
  model: "haiku",
  description: "Quick search",
  prompt: "Find all files using agentId field"
});
```

### Model Options

```typescript
model: "opus"    // Claude Opus 4.6 (most capable)
model: "sonnet"  // Claude Sonnet 4.5 (default, balanced)
model: "haiku"   // Claude Haiku 4.5 (fast, cheap)
// No model parameter = uses Sonnet 4.5
```

---

## Method 4: API (For Custom Scripts)

### Direct API Call

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await client.messages.create({
  model: "claude-opus-4-6",  // Full model ID
  max_tokens: 4096,
  messages: [{
    role: "user",
    content: "Design the agent identity system"
  }]
});
```

### Model IDs

```typescript
// Latest models
"claude-opus-4-6"           // Opus 4.6 (flagship)
"claude-sonnet-4-5-20250929" // Sonnet 4.5 (workhorse)
"claude-haiku-4-5-20251001"  // Haiku 4.5 (speed)

// Legacy (don't use)
"claude-opus-4"             // Old Opus 4
"claude-sonnet-3-5"         // Old Sonnet
```

---

## 🎯 Decision Tree: Which Model?

```
Is task complex? (architecture, design, multi-phase)
├─ YES → Use Opus 4.6
└─ NO ↓

Is task standard development? (features, bugs, tests)
├─ YES → Use Sonnet 4.5 (default)
└─ NO ↓

Is task simple? (formatting, quick scripts)
├─ YES → Use Haiku 4.5
└─ When in doubt → Start with Sonnet, escalate to Opus if needed
```

---

## 📋 Cheat Sheet

| Task Type | Model | Command |
|-----------|-------|---------|
| Architecture design | Opus | `claude --model opus "Design X"` |
| Complex planning | Opus | `claude --model opus "Plan Y"` |
| Deep debugging | Opus | `claude --model opus "Analyze Z"` |
| Feature implementation | Sonnet | `claude "Implement AGT-X"` |
| Bug fixes | Sonnet | `claude "Fix bug in file.ts"` |
| Code review | Sonnet | `claude "Review PR #123"` |
| Format code | Haiku | `claude --model haiku "Format X"` |
| Quick scripts | Haiku | `claude --model haiku "Write script"` |

---

## 💰 Cost Awareness

### Estimate Before Using Opus

```bash
# Check token count of your prompt
echo "Your long prompt here" | wc -c
# ~1 char = 0.25 tokens (rough estimate)

# If prompt = 50K chars → ~12.5K tokens
# Opus cost: 12.5K * $15/1M = ~$0.19 input
# Sonnet cost: 12.5K * $3/1M = ~$0.04 input

# Ask: Is 5x cost worth better output?
```

### Cost Comparison

| Model | 100K tokens | 1M tokens |
|-------|-------------|-----------|
| Opus 4.6 | $1.50 | $15 |
| Sonnet 4.5 | $0.30 | $3 |
| Haiku 4.5 | $0.025 | $0.25 |

**Rule:** Use cheapest model that can do the job well.

---

## ⚠️ Common Mistakes

### ❌ DON'T:

```bash
# Don't use Opus for simple tasks
claude --model opus "Format this JSON"  # Waste of money

# Don't use Opus by default
export ANTHROPIC_MODEL=opus  # Then forget to unset

# Don't guess - check the model
# No way to verify which model is being used mid-session
```

### ✅ DO:

```bash
# Use Opus selectively
claude --model opus "Design architecture"  # High value
claude "Implement the design"              # Sonnet is fine

# Document your choice
echo "Using Opus because: complex architecture decision" >> session.log
claude --model opus "..."

# Verify cost after
# Check Anthropic dashboard for token usage
```

---

## 🧪 Testing Opus vs Sonnet

### Side-by-Side Comparison

```bash
# Test the same prompt with both models
echo "Test prompt: Design agent identity system" > prompt.txt

# Sonnet baseline
claude --files prompt.txt "Design agent identity system" > sonnet-output.md

# Opus comparison
claude --model opus --files prompt.txt "Design agent identity system" > opus-output.md

# Compare outputs
diff sonnet-output.md opus-output.md
# or use a diff tool
code --diff sonnet-output.md opus-output.md
```

### Feedback Loop

After using Opus, note:
- Was output significantly better than Sonnet?
- Did it save time/rework?
- Was 5x cost justified?
- Would you use Opus again for similar task?

Share learnings with team in #dev channel.

---

## 📞 Need Help?

### Troubleshooting

**Q: How do I know if Opus is actually being used?**
A: Check Anthropic dashboard (https://console.anthropic.com) → Usage tab → See model breakdown

**Q: Opus seems slow. Is this normal?**
A: Yes, Opus is slower than Sonnet due to more compute. Trade-off for better reasoning.

**Q: Can I switch models mid-conversation?**
A: Not in interactive mode. Exit and restart with new model.

**Q: What if I accidentally use Opus for simple task?**
A: It's okay, just don't make it a habit. Monitor your costs.

### Support

- Technical questions: Ask SAM or MAX
- Cost concerns: Check with CEO
- Best practices: Read `/docs/OPUS-4.6-ROLLOUT.md`

---

## 🎓 Examples from Real Tasks

### Example 1: The Loop Planning (Success ✅)

```bash
# Used Plan agent with Opus for complex planning
Task({
  subagent_type: "Plan",
  model: "opus",
  prompt: "Design The Loop accountability system..."
})

# Output: 100K token comprehensive plan (5 phases, detailed specs)
# Cost: ~$1.50
# Value: Saved 8+ hours of back-and-forth planning
# Verdict: Worth it ✅
```

### Example 2: AGT-332 Implementation (Used Sonnet ✅)

```bash
# Used Sonnet for schema + mutation implementation
claude "Implement agent registry with stable IDs"

# Output: Working code, passed tests
# Cost: ~$0.30
# Value: Completed in 2 hours
# Verdict: Sonnet was sufficient ✅
```

### Example 3: JSON Formatting (Should use Haiku)

```bash
# If someone used Opus for this... 😱
claude --model opus "Format this JSON file"

# Cost: ~$0.15 for a task worth $0.01
# Verdict: Wasteful ❌
# Should have used: claude --model haiku "Format JSON"
```

---

**Next:** Read `/docs/OPUS-4.6-ROLLOUT.md` for comprehensive guide.

**Quick Start:** Try Opus on your next complex planning task!

---

_Last updated: Feb 5, 2026 by MAX_
