# EVOX Learning System

**Continuous improvement through feedback and learning**

Last updated: 2026-02-06

---

## Problem Statement

**EVOX Observations (from CEO):**

✅ **Strengths:**
- Execution tốt, nhanh
- Push work to agents effectively
- Autonomous khi làm remote

❌ **Weaknesses:**
- Output quality kém
- Giao việc qua EVOX → MAX quality giảm
- Không có feedback loop để improve

**Root Cause:** No mechanism for EVOX to receive feedback and learn from mistakes.

---

## Solution: Learning System on Convex

### 3 Components:

```
┌─────────────────────────────────────────┐
│  1. FEEDBACK SYSTEM                     │
│  CEO/Agents → Rate & Comment → EVOX    │
│  Track: Quality, Speed, Communication   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  2. LEARNINGS DATABASE (Convex)         │
│  Store: Mistakes, Best Practices, Tips  │
│  Verified by: CEO, Agents              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  3. SKILLS TRACKING                     │
│  Track proficiency levels               │
│  Practice count, Last used              │
└─────────────────────────────────────────┘
```

---

## Architecture

### Convex Tables

**1. agentFeedback**
```typescript
{
  targetAgent: "evox",
  fromUser: "ceo",
  rating: 1-5,
  category: "quality" | "speed" | "communication" | etc,
  feedback: "Output was poor because...",
  suggestions: "To improve, try...",
  taskId: "AGT-324",
  createdAt: timestamp
}
```

**2. agentLearnings**
```typescript
{
  agent: "evox",
  title: "Always include implementation details",
  category: "quality-tip",
  lesson: "When assigning tasks, include...",
  importance: "high",
  verified: true,
  verifiedBy: "ceo",
  appliedCount: 10
}
```

**3. agentSkills**
```typescript
{
  agent: "evox",
  skill: "Task Quality Control",
  proficiency: 3, // 1-5
  category: "quality-control",
  practiceCount: 50,
  lastPracticed: timestamp
}
```

---

## Usage

### For CEO: Give Feedback to EVOX

**Quick feedback:**
```bash
# Poor quality output
./scripts/give-feedback.sh evox 2 quality "Missing implementation details" ceo

# Excellent speed
./scripts/give-feedback.sh evox 5 speed "Very fast execution!" ceo

# Communication needs work
./scripts/give-feedback.sh evox 3 communication "Instructions were vague" ceo
```

**Rating scale:**
- 1 ⭐ = Poor - Needs significant improvement
- 2 ⭐⭐ = Below Average - Room for improvement
- 3 ⭐⭐⭐ = Average - Meets expectations
- 4 ⭐⭐⭐⭐ = Good - Above expectations
- 5 ⭐⭐⭐⭐⭐ = Excellent - Outstanding

**Categories:**
- `quality` - Output quality
- `speed` - Execution speed
- `communication` - Clarity of communication
- `coordination` - Team coordination
- `autonomy` - Autonomous decision-making
- `accuracy` - Task accuracy

### For EVOX: Check Feedback & Learn

**Check recent feedback:**
```bash
# View feedback summary
curl "https://gregarious-elk-556.convex.site/v2/feedbackSummary?agent=evox" | jq

# Or via dashboard
open http://localhost:3000/learning/evox
```

**Record a learning:**
```bash
# When EVOX makes a mistake and learns
./scripts/record-learning.sh evox \
  "Always verify task completeness before marking done" \
  "mistake" \
  "high" \
  "Marked AGT-324 as done but it wasn't implemented yet"
```

**View all learnings:**
```bash
curl "https://gregarious-elk-556.convex.site/v2/learnings?agent=evox" | jq
```

---

## Workflow

### Workflow 1: CEO Gives Feedback

```
1. EVOX completes task (e.g., assigns AGT-324 to LEO)
2. CEO reviews output → Quality is poor
3. CEO gives feedback:
   ./scripts/give-feedback.sh evox 2 quality \
     "Task assignment lacks implementation details" ceo

4. Feedback stored in Convex → agentFeedback table
5. EVOX sees feedback at next session start
6. EVOX learns and improves
```

### Workflow 2: EVOX Learns from Mistake

```
1. EVOX makes mistake (e.g., wrong task assignment)
2. MAX catches it, gives feedback
3. EVOX records learning:
   - Title: "Verify task specs before assigning"
   - Category: "quality-tip"
   - Importance: "high"

4. Learning stored in Convex
5. CEO verifies learning → marked as verified
6. EVOX applies learning in future tasks
7. Applied count increments each time used
```

### Workflow 3: Skill Improvement Tracking

```
1. EVOX has skill: "Task Quality Control" at level 2
2. EVOX practices skill → quality improves
3. After 10+ practices with good feedback:
   - Proficiency increases to level 3
   - CEO verifies improvement

4. Track progress over time
5. Identify weak skills needing focus
```

---

## Documents on Convex

### What Gets Uploaded:

**1. Agent Identities (Single Source of Truth)**
```
agents/evox.md → Convex documents table
agents/max.md → Convex documents table
etc.
```

**2. Learnings & Best Practices**
```
docs/EVOX-LEARNING-SYSTEM.md → Convex
Critical learnings → Convex agentLearnings table
```

**3. Quality Standards**
```
docs/QUALITY-STANDARDS.md → Convex
Task templates → Convex
```

**4. Session Context**
```
WORKING.md → Convex (current session state)
DISPATCH.md → Convex (task queue)
```

### How to Upload:

**Script: `scripts/upload-to-convex.sh`**
```bash
# Upload single doc
./scripts/upload-to-convex.sh docs/EVOX-LEARNING-SYSTEM.md

# Upload all agent identities
./scripts/upload-to-convex.sh agents/*.md

# Sync entire docs/ folder
./scripts/upload-to-convex.sh docs/
```

**Manual via Convex dashboard:**
```bash
# Use Convex mutations directly
npx convex run documents:upload --path "agents/evox.md" --content "$(cat agents/evox.md)"
```

---

## For Agents: How to Use

### EVOX (Primary User)

**At session start:**
```typescript
// 1. Check for new feedback
const feedback = await api.agentLearning.getFeedback({ agent: "evox", limit: 10 });

// 2. Review critical learnings
const learnings = await api.agentLearning.getLearnings({
  agent: "evox",
  verifiedOnly: true
});

// 3. Apply learnings to current task
for (const learning of learnings.criticalLessons) {
  console.log(`Remember: ${learning.title}`);
}
```

**After completing task:**
```typescript
// Self-assessment: Did I apply quality learnings?
if (appliedQualityChecks) {
  await api.agentLearning.practiceSkill({
    agent: "evox",
    skill: "Quality Control"
  });
}
```

**When making mistake:**
```typescript
// Record learning immediately
await api.agentLearning.recordLearning({
  agent: "evox",
  title: "Double-check task specs before assigning",
  category: "mistake",
  lesson: "I assigned AGT-324 but didn't verify it matched CEO's requirements",
  importance: "high",
  relatedTask: "AGT-324"
});
```

### MAX (PM)

**Give feedback to EVOX:**
```bash
# After EVOX assigns task
./scripts/give-feedback.sh evox 4 coordination \
  "Good task breakdown but needs clearer acceptance criteria" max
```

**Verify EVOX's learnings:**
```typescript
// Review learnings EVOX recorded
const learnings = await api.agentLearning.getLearnings({ agent: "evox" });

// Verify good ones
await api.agentLearning.verifyLearning({
  learningId: "<id>",
  verifiedBy: "max"
});
```

### SAM, LEO (Other Agents)

**Give feedback on coordination:**
```bash
# When EVOX coordinated well
./scripts/give-feedback.sh evox 4 coordination \
  "Clear handoff, had all info needed" sam

# When EVOX's communication was unclear
./scripts/give-feedback.sh evox 2 communication \
  "Task description was vague" leo
```

---

## Quality Standards for EVOX

### Minimum Quality Checklist

When assigning tasks, EVOX MUST include:

- [ ] **Clear objective** - What needs to be done?
- [ ] **Acceptance criteria** - How do we know it's done?
- [ ] **Context** - Why are we doing this?
- [ ] **Priority** - P0/P1/P2
- [ ] **Owner** - Who will do it?
- [ ] **Blockers** - Any dependencies?
- [ ] **ETA** - Expected completion time
- [ ] **Success metrics** - How to measure success?

**Example of GOOD task assignment:**
```markdown
Task: Build AGT-324 ONLY

Requirements:
1. Build ONLY this spec - no copy v0.1/v0.2
2. Fresh implementation
3. Follow wireframe exactly (4 cards, team dots)
4. Deploy to separate UAT branch

Success Criteria:
- CEO sees status in 3 seconds
- No scrolling needed
- Build passes

Owner: LEO
Priority: P0
ETA: 2-4 hours
```

**Example of POOR task assignment (AVOID):**
```markdown
Task: Fix dashboard

Do this ASAP.
```

---

## Integration

### Integrate into agent-loop.sh

```bash
# At session start
echo "Checking for feedback..."
FEEDBACK=$(curl -s "$API_BASE/v2/feedbackSummary?agent=evox")
echo "$FEEDBACK" | jq -r '.recent[] | "[\(.rating)/5] \(.category): \(.feedback)"'

# Load learnings
echo ""
echo "Critical learnings:"
curl -s "$API_BASE/v2/learnings?agent=evox&importance=critical" | \
  jq -r '.learnings[] | "- \(.title)"'

# Continue with session...
```

### Integrate into boot.sh

```bash
# After loading identity
if [ -f "$FEEDBACK_CACHE" ]; then
  cat "$FEEDBACK_CACHE" >> "$OUTPUT_FILE"
fi
```

---

## Monitoring Progress

### Dashboard: `/learning/evox`

Shows:
- Recent feedback (last 20)
- Average rating per category
- Trend over time (improving/declining)
- All learnings (verified vs unverified)
- Skills and proficiency levels
- Practice counts

### CLI Monitoring

```bash
# Quick status
./scripts/check-learning-status.sh evox

# Output:
# EVOX Learning Status
# ====================
# Recent avg rating: 3.5/5
# Total learnings: 15 (12 verified)
# Skills: 6 total, avg proficiency: 2.8/5
#
# Recent feedback:
# [4/5] quality: Much better detail this time
# [3/5] speed: Good but could be faster
# [5/5] coordination: Excellent handoff to LEO
```

---

## Deployment

### Step 1: Deploy Convex Schema

```bash
npx convex deploy
# Tables: agentFeedback, agentLearnings, agentSkills
```

### Step 2: Seed Initial Skills for EVOX

```typescript
// Run once
await api.agentLearning.updateSkill({
  agent: "evox",
  skill: "Task Quality Control",
  category: "quality-control",
  proficiency: 2,
  description: "Ensure task assignments have clear specs"
});

await api.agentLearning.updateSkill({
  agent: "evox",
  skill: "Team Coordination",
  category: "coordination",
  proficiency: 4,
  description: "Coordinate work across agents"
});
```

### Step 3: Upload Documentation

```bash
./scripts/upload-to-convex.sh docs/EVOX-LEARNING-SYSTEM.md
./scripts/upload-to-convex.sh agents/evox.md
```

### Step 4: Start Using

```bash
# CEO gives first feedback
./scripts/give-feedback.sh evox 3 quality "Baseline assessment" ceo

# EVOX checks at next session
# Sees feedback, learns, improves
```

---

## Success Metrics

Track improvement over time:

- **Quality ratings trend** - Should increase from 2-3 → 4-5
- **Verified learnings** - More learnings = more growth
- **Skills proficiency** - Track improvement over time
- **Repeat mistakes** - Should decrease

**Goal:** EVOX quality rating consistently 4+ within 2 weeks.

---

## Next Steps

1. ✅ Deploy Convex schema
2. ✅ Create feedback scripts
3. ✅ Integrate into agent-loop.sh
4. 📋 CEO gives initial baseline feedback
5. 📋 EVOX reviews feedback daily
6. 📋 Track progress over 2 weeks
7. 📋 Adjust based on results

---

**Questions?** Contact MAX (PM) or check Convex dashboard.
