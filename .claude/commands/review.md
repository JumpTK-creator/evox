Review code changes for quality and correctness. Argument: file path, PR number, or "staged" for staged changes.

Parse the argument:
- If a file path: review that file
- If a PR number: `gh pr diff <number>`
- If "staged" or empty: `git diff --cached` (or `git diff` if nothing staged)

Review checklist:

1. **Correctness:**
   - Does the logic match the intent?
   - Edge cases handled?
   - Null/undefined safety?
   - Are query results validated before use?

2. **Quality:**
   - Follows existing patterns in the codebase?
   - No duplicated logic (check with grep)?
   - File size within limits (components <300 lines, convex <500 lines)?
   - No hardcoded values that should be constants?

3. **Safety:**
   - No hardcoded secrets or API keys?
   - No raw user input in queries (injection risk)?
   - No `eval()`, `Function()`, or `dangerouslySetInnerHTML` with user data?
   - Convex mutations validate inputs?

4. **EVOX Architecture Rules:**
   - Design System V2 tokens used (no raw zinc-*, gray-*, slate-*)?
   - Agent identity via string names, not Convex IDs?
   - Single source of truth (agentRegistry, messageStatus)?
   - New messages → unifiedMessages table?

5. **Maintainability:**
   - Would another agent understand this code?
   - Dead code removed (no commented-out blocks)?
   - Imports clean (no unused)?

6. **Verdict:**

   | Category | Status | Issues |
   |----------|--------|--------|
   | Correctness | PASS/WARN/FAIL | details |
   | Quality | PASS/WARN/FAIL | details |
   | Safety | PASS/WARN/FAIL | details |
   | Architecture | PASS/WARN/FAIL | details |
   | Maintainability | PASS/WARN/FAIL | details |

   **Issues found:** (list each as `file:line — description`)
   **Verdict:** SHIP / FIX REQUIRED / NEEDS DISCUSSION
