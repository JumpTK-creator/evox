Scan the EVOX codebase for technical debt and report findings.

1. **Scan for markers:**
   ```bash
   cd /Users/sonpiaz/evox
   echo "=== TODO ===" && grep -rn "TODO" app/ components/ convex/ lib/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"
   echo "=== FIXME ===" && grep -rn "FIXME" app/ components/ convex/ lib/ --include="*.ts" --include="*.tsx" | grep -v node_modules
   echo "=== HACK ===" && grep -rn "HACK\|XXX\|WORKAROUND" app/ components/ convex/ lib/ --include="*.ts" --include="*.tsx" | grep -v node_modules
   echo "=== DEPRECATED ===" && grep -rn "deprecated\|DEPRECATED" app/ components/ convex/ lib/ --include="*.ts" --include="*.tsx" | grep -v node_modules
   ```

2. **Check for oversized files:**
   ```bash
   find app/ components/ -name "*.tsx" -exec wc -l {} + | sort -rn | head -15
   find convex/ -name "*.ts" -exec wc -l {} + | sort -rn | head -15
   ```
   Flag: components >300 lines, convex >500 lines (per CLAUDE.md Rule 9)

3. **Check for architecture violations:**
   - Raw color classes: `grep -rn "zinc-\|slate-\|gray-[1-9]" app/ components/ --include="*.tsx" | head -10`
   - Raw _id in UI: `grep -rn "\._id" app/ components/ --include="*.tsx" | grep -v "key=" | head -10`
   - Legacy table usage: `grep -rn "agentMessages\|meshMessages" app/ components/ convex/ --include="*.ts" --include="*.tsx" | grep -v schema | grep -v "read-only" | head -10`

4. **Check for dead code:**
   - Unused exports: files in components/ not imported anywhere
   - V1 compat aliases still in globals.css

5. **Categorize by severity:**

   | Severity | Category | File:Line | Description |
   |----------|----------|-----------|-------------|
   | CRITICAL | ... | ... | Blocks functionality or causes bugs |
   | HIGH | ... | ... | Architecture violation or security risk |
   | MEDIUM | ... | ... | Code smell or maintainability issue |
   | LOW | ... | ... | Nice-to-have cleanup |

6. **Top 3 priorities:**
   Recommend the 3 most impactful items to fix first, with estimated effort (Simple/Medium/Large).
