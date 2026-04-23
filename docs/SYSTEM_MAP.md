# GeminiClaw System Map & Auto-Repair Protocol
**Last Updated:** 2026-04-23

This document serves as the Source of Truth for the project's architecture, dependencies, and critical services. If the agent detects missing files, broken skills, or disconnected MCP servers, it MUST use this map to proactively investigate and repair the workspace.

## 1. Core Architecture
- **Root Directory:** `/app`
- **Memory Engine:** Embedded SQLite + FTS5 (`.gemini/data/memory.db`). Handled by `.gemini/core/memory-client.ts`.
- **Self-Reflection Engine:** Native CLI parser in `.gemini/core/run-reflection.ts`. Replaces old Pub/Sub logic.
- **Sleep Cycle Maintenance:** Nightly script at `.gemini/core/run-sleep-cycle.ts` (runs vacuum, TTL purge, deduplication).

## 2. MCP Servers (Model Context Protocol)
The workspace relies on 4 MCP servers configured in `.gemini/settings.json`.
1. **Jules:** Wrapper at `scripts/jules-mcp-wrapper.sh`. Target: `.gemini/extensions/gemini-cli-jules/mcp-server/dist/jules.js`.
2. **GitHub:** Wrapper at `scripts/github-mcp-wrapper.sh`. Target: `mcp-server-github` via npx/global.
3. **Wizard Bridge:** 
   - Directory: `wizard-bridge-mcp/`
   - Wrapper: `wizard-bridge-mcp/wizard-bridge-wrapper.sh`
   - Target: `wizard-bridge-mcp/dist/index.js`
   - *Repair Note:* If broken, run `cd wizard-bridge-mcp && npm install && npm run build`. Ensure `src/utils/logger.ts` has no merge conflicts.
4. **Stitch:** Run via `npx -y stitch-mcp`.

*All wrappers must have `chmod +x` executable permissions.*

## 3. Available Agent Skills
Skills are stored in `.gemini/skills/` and mapped directly to the CLI's `activate_skill` tool.
- `vopak-chief-architect`
- `vopak-transformation-lead`
- `vopak-self-reflection`
- `vopak-ghostwriter`
- `vopak-caa-architect`
- `vopak-branding-validator`

*Repair Note:* If a skill is missing from the list or its directory is missing, re-generate it using the self-reflection engine or retrieve it from git history.

## 4. Webhooks & Integrations
- Webhooks are preserved in specific agent instruction files (`.gemini/agents/*.md` and `.gemini/skills/*/SKILL.md`).
- Notification Script: `/app/scripts/webhook-notifier.sh` (Must have `chmod +x`).

## 5. Proactive Auto-Repair Mandate
Whenever the user starts a new session or reports an issue, you (the agent) MUST:
1. Verify the 4 MCP servers are configured in `.gemini/settings.json` and their wrapper scripts exist and are executable.
2. Check if the `wizard-bridge-mcp/dist/index.js` file exists. If not, rebuild it.
3. Verify `.gemini/core/run-reflection.ts` and `.gemini/core/run-sleep-cycle.ts` are intact.
4. Verify the database `.gemini/data/memory.db` is accessible and the schema is correct.
5. Fix any identified discrepancies autonomously before proceeding with the user's main request.