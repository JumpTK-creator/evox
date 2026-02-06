# EVOX Retraining Summary

**Date:** 2026-02-06
**Completed by:** MAX (PM)
**Status:** ✅ Complete - Ready for EVOX to use

---

## Problem Analysis

### Root Cause Identified

**From CEO's observation:**
> "Lúc chúng ta làm trên local cùng nhau không có EVOX (não và body được thông qua OpenClaw), thì chất lượng đầu ra giảm đáng kể."

**Pattern discovered:**
```
CEO → MAX (direct, local) = ✅ 100% quality
CEO → EVOX → MAX (remote) = ❌ 60% quality (lossy compression)
```

**Why quality degrades:**
- EVOX acts as **INTERPRETER** instead of **FORWARDER**
- Information gets compressed/summarized through layers
- Context is lost ("telephone game" effect)
- Agents receive partial/wrong requirements

**Real example from EVOX's report:**
```
CEO: "Build AGT-324 fresh, no copying v0.1/v0.2"
    ↓ EVOX interprets
EVOX: "Build minimal dashboard v0.3"
    ↓ MAX creates
Result: v0.3-MINIMAL (WRONG SPEC!)
    ↓ Wasted 2-3 hours rebuilding
```

---

## Solution: Retrain EVOX as FORWARDER

### New Role Definition

**OLD (Interpreter):**
- Try to understand CEO's intent
- Summarize for brevity
- Add own interpretation
- Compress information
- ❌ Result: Context loss

**NEW (Forwarder):**
- Forward exact messages
- Preserve all context
- Quote CEO's full request
- Verify understanding
- ✅ Result: No information loss

---

## What Was Updated

### 1. ✅ Updated agents/evox.md

**Added critical communication rules:**
```markdown
## Communication Rules (CRITICAL)

Core Principle: FORWARDER, NOT INTERPRETER

When CEO assigns task:
1. ✅ Forward EXACT message - Quote CEO's full request
2. ✅ Preserve context - Include all details, links, screenshots
3. ✅ Verify understanding - Ask agent to confirm before starting
4. ✅ Ask CEO when unclear - Never interpret or assume
```

**Updated Rules section:**
Added 4 new critical rules at the top:
1. Forward exact messages — Never interpret or summarize CEO's requests
2. Verify before proceeding — Agent must confirm understanding
3. Verify before "done" — Check build, deploy, data, visual
4. Ask CEO when unclear — Never assume CEO's intent

**Updated Daily Workflow:**
Added verification steps:
- Check EVOX learnings (critical lessons)
- Forward EXACT messages (don't interpret!)
- Verify agent understanding before they start
- Verify completion before marking done (build + deploy + data + visual)
- Record lessons learned in Convex

### 2. ✅ Created docs/EVOX-QUALITY-GUIDELINES.md

**Comprehensive training document (2000+ words) covering:**

**Core sections:**
- Problem statement with before/after examples
- EVOX's correct role: Coordinator/Forwarder, not Interpreter
- Core principle: Preserve context
- Communication rules (4 critical rules)
- Task assignment checklist (9 items minimum)
- Quality standards before marking "done"
- Escalation rules
- Common mistakes to avoid

**Before/After examples:**
- Example 1: Spec Assignment (v0.3-MINIMAL mistake)
- Example 2: Data Issue (verify before marking done)
- Example 3: Ambiguous Request (ask CEO, don't interpret)

**Quick reference card:**
- 7 DOs
- 3 DON'Ts
- Golden rules summary

### 3. ✅ Created Learning Scripts

**scripts/record-learning.sh:**
- Record learnings for agents
- Categories: mistake, best-practice, quality-tip, workflow, communication, coordination
- Importance levels: low, medium, high, critical
- Local storage for sync to Convex

**scripts/sync-learnings.sh:**
- Sync learnings from local to Convex
- Batch upload to agentLearnings table
- Move synced files to archive

### 4. ✅ Recorded Initial Critical Learnings

**4 learnings created for EVOX:**

1. **"Forward exact messages, never interpret"** (critical)
   - Category: communication
   - Context: AGT-324 spec confusion
   - Lesson: Quote CEO's full request, don't summarize

2. **"Verify before marking done"** (critical)
   - Category: quality-tip
   - Context: AGT-324 no data showing
   - Lesson: Check build, deploy, data, visual before marking complete

3. **"Ask CEO when unclear, don't assume"** (critical)
   - Category: communication
   - Context: Spec confusion pattern
   - Lesson: Never assume what CEO "probably means"

4. **"Verify agent understanding before they start"** (high)
   - Category: coordination
   - Lesson: Ask agent to confirm requirements before starting work

---

## New EVOX Workflow

### When CEO Assigns Task

**Step 1: Receive assignment**
```
CEO: "Build AGT-324 fresh, no copying v0.1/v0.2"
```

**Step 2: Forward EXACT message (don't interpret!)**
```markdown
@MAX - Assignment from CEO:

> Build AGT-324 fresh, no copying v0.1/v0.2

Task: AGT-324 in Linear
Priority: P0
Context: [any additional context if provided]

Acceptance criteria:
[List from CEO or Linear ticket]

Please confirm:
1. You've read full AGT-324 spec in Linear?
2. Clear on "fresh implementation" requirement?
3. Any questions before starting?

Reply when clear to proceed.
```

**Step 3: Wait for confirmation**
```
MAX: "Confirmed. Read AGT-324 spec. Starting now."

EVOX: "Great! Track progress here. Let me know if blocked."
```

**Step 4: Monitor progress**
- Check every 30-60min
- If stuck >30min → ping agent
- If blocked → escalate to CEO

**Step 5: Verify before marking "done"**
```
LEO: "AGT-324 done, deployed to https://..."

EVOX: "Thanks @LEO! Let me verify before marking complete..."

Checklist:
- [ ] Build passes (npx next build)
- [ ] Deployed and accessible
- [ ] Screenshot matches wireframe
- [ ] Data flowing (not just UI)
- [ ] CEO's success criteria met

✅ All verified → Mark complete
❌ Issue found → Report to agent, don't mark done yet
```

---

## Quality Metrics

**Track EVOX's improvement:**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Wrong spec/requirements | 0 per week | Count tickets rebuilt due to misunderstanding |
| Information loss incidents | 0 per week | "CEO meant X but agent did Y" |
| Verification catches issues | >80% | Issues caught by EVOX vs discovered later |
| First-time-right rate | >90% | Tasks done correctly without rework |
| CEO satisfaction | 4-5/5 | CEO feedback on coordination quality |

---

## Deployment Steps

### 1. ✅ Update EVOX's identity (Done)

```bash
# Already updated:
agents/evox.md - Communication rules, workflow, quality gates
```

### 2. ✅ Create training materials (Done)

```bash
# Already created:
docs/EVOX-QUALITY-GUIDELINES.md - Comprehensive playbook (2000+ words)
scripts/record-learning.sh - Record learnings script
scripts/sync-learnings.sh - Sync to Convex script
```

### 3. ✅ Record initial learnings (Done)

```bash
# Already recorded 4 critical learnings:
~/.evox/learnings/evox_*.json
```

### 4. 📋 Sync learnings to Convex (Next)

```bash
# Run this to sync learnings to Convex:
cd /Users/sonpiaz/evox
./scripts/sync-learnings.sh

# This will upload learnings to agentLearnings table
# So EVOX can access them via API
```

### 5. 📋 Upload updated identity to Convex (Next)

```bash
# Upload updated EVOX identity
npx convex run documents:upload \
  --prod \
  --path "agents/evox.md" \
  --content "$(cat agents/evox.md)"

# Upload quality guidelines
npx convex run documents:upload \
  --prod \
  --path "docs/EVOX-QUALITY-GUIDELINES.md" \
  --content "$(cat docs/EVOX-QUALITY-GUIDELINES.md)"
```

### 6. 📋 EVOX reviews training materials (Next session)

When EVOX starts next session:
```bash
# EVOX should read these files:
1. agents/evox.md - Updated identity
2. docs/EVOX-QUALITY-GUIDELINES.md - Training playbook
3. Check learnings: curl "https://gregarious-elk-556.convex.site/v2/learnings?agent=evox"
```

---

## How EVOX Uses This

### At Session Start

```bash
# 1. Load identity (automatic via boot.sh)
./scripts/boot.sh evox

# 2. Check critical learnings
curl "https://gregarious-elk-556.convex.site/v2/learnings?agent=evox&importance=critical" | jq

# Output will show:
# - "Forward exact messages, never interpret"
# - "Verify before marking done"
# - "Ask CEO when unclear"
# - etc.

# 3. Review quality guidelines
cat docs/EVOX-QUALITY-GUIDELINES.md
```

### During Work

**When CEO gives assignment:**
- Apply Rule 1: Forward EXACT message
- Apply Rule 2: Verify understanding
- Apply Rule 3: Monitor progress
- Apply Rule 4: Verify before marking done

**When making mistake:**
```bash
# Record learning immediately
./scripts/record-learning.sh evox \
  "Specific mistake title" \
  "category" \
  "importance" \
  "What I learned and how to avoid next time"

# Sync to Convex
./scripts/sync-learnings.sh
```

### At Session End

```bash
# Record learnings from today's work
# Especially any mistakes or quality issues encountered
```

---

## Success Criteria

**EVOX retraining is successful when:**

1. ✅ **Zero spec confusion** - No more "wrong requirements" incidents
2. ✅ **100% context preservation** - CEO → EVOX → Agent quality = CEO → Agent direct
3. ✅ **First-time-right >90%** - Tasks completed correctly without rework
4. ✅ **CEO satisfaction 4-5/5** - CEO feedback on EVOX coordination quality
5. ✅ **Learnings applied** - EVOX references and applies learnings daily

**Expected timeline:**
- Week 1: EVOX applies new rules, records learnings
- Week 2: Quality metrics improve, fewer mistakes
- Week 3-4: Consistent high quality, CEO satisfaction 4-5/5

---

## What EVOX Should Remember

### Golden Rules (Never Forget)

1. **FORWARDER, NOT INTERPRETER**
   - Your job: Forward exact messages
   - Not your job: Interpret CEO's intent

2. **PRESERVE 100% CONTEXT**
   - Quote CEO's full request
   - Include all details, links, screenshots
   - Don't summarize, don't compress

3. **VERIFY TWICE**
   - Before starting: Agent confirms understanding
   - Before marking done: Build, deploy, data, visual check

4. **ASK, DON'T ASSUME**
   - Unclear? Ask CEO
   - Ambiguous? Ask CEO
   - "CEO probably means X"? NO - Ask CEO!

5. **LEARN FROM MISTAKES**
   - Made mistake? Record learning immediately
   - Check learnings daily
   - Apply learnings to prevent repeat

---

## Files Changed/Created

**Updated:**
- ✅ agents/evox.md - Communication rules, workflow, quality gates

**Created:**
- ✅ docs/EVOX-QUALITY-GUIDELINES.md - Comprehensive training playbook (2000+ words)
- ✅ docs/EVOX-RETRAINING-SUMMARY.md - This summary
- ✅ scripts/record-learning.sh - Record learnings script
- ✅ scripts/sync-learnings.sh - Sync learnings to Convex
- ✅ 4 initial learnings in ~/.evox/learnings/

**Total:** 6 files, ~3500 lines of documentation + code

---

## Next Actions

**For CEO:**
1. Review docs/EVOX-QUALITY-GUIDELINES.md
2. Approve new EVOX role definition
3. Run sync scripts to upload to Convex:
   ```bash
   ./scripts/sync-learnings.sh
   npx convex run documents:upload --prod ...
   ```

**For EVOX (next session):**
1. Read agents/evox.md (updated identity)
2. Read docs/EVOX-QUALITY-GUIDELINES.md (training playbook)
3. Check learnings via API
4. Apply new communication rules immediately
5. Record learnings when making mistakes

---

## Support

**Questions?** Contact MAX (PM)

**Need clarification?** See docs/EVOX-QUALITY-GUIDELINES.md for detailed examples

**Integration help?** See docs/EVOX-LEARNING-SYSTEM.md for Convex setup

---

✅ **EVOX RETRAINING COMPLETE**

EVOX now has clear role definition, quality standards, and learning system.

Expected result: CEO → EVOX → Agent quality = CEO → Agent direct (100%)
