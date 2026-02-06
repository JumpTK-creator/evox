Plan an implementation before writing code. Argument: goal description.

1. **Understand the goal:**
   - Parse the argument to extract what needs to be built/fixed
   - Read CLAUDE.md for architecture rules and constraints
   - Check MEMORY.md for relevant context or past decisions

2. **Research the codebase:**
   - Search for existing related code (grep/glob)
   - Read the files that will be affected
   - Check for existing patterns to follow (docs/patterns/)
   - Identify dependencies and potential conflicts

3. **Break into steps (max 5):**
   - Each step must be a concrete, verifiable action
   - Include file paths that will be touched
   - Estimate complexity per step:
     - **Simple** (5-10 min): single file edit, config change, typo fix
     - **Medium** (15-30 min): multi-file edit, new query, component update
     - **Large** (30-60 min): new feature, schema change, migration

4. **Present the plan:**

   ## Plan: [goal]

   | # | Step | Files | Complexity |
   |---|------|-------|------------|
   | 1 | ... | ... | Simple/Medium/Large |
   | 2 | ... | ... | Simple/Medium/Large |

   **Total estimate:** X-Y min
   **Risks:** [any risks or unknowns]
   **Architecture rules affected:** [list any CLAUDE.md rules that apply]

5. **Get approval before coding:**
   - Ask: "Approve this plan? Or adjust?"
   - Do NOT write any code until approved
