# EVOX — Mission Control MVP

## Tech Stack
- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Database: Convex (real-time, serverless)
- Repo: https://github.com/sonpiaz/evox

## Agent Territories (STRICT — no cross-editing)
- SAM (Backend): convex/, scripts/, lib/evox/
- LEO (Frontend): app/evox/, components/evox/

## Rules
- Commit format: closes EVOX-XX
- No auto-push unless Son approves
- Types first: schema.ts before UI
- AUTO-APPROVE: Do NOT ask for permission on file creation, edits, installs, or builds. Just do it. Only ask permission for: git push, API key changes, data deletion, or security-sensitive actions.
- AUTO-STATUS: For EVERY task, BEFORE starting update Linear issue to "In Progress", AFTER completing update to "Done" with comment (files, blockers, verification). If no Linear MCP access, print: STATUS_UPDATE: AGT-XX = DONE | Files: [list] | Verified: yes/no | Blockers: none
