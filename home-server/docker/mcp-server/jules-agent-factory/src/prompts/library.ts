/**
 * Specialized "Home Server" Prompt Library
 * Adapted from google-labs-code/jules-awesome-list
 */

export const PROMPT_LIBRARY = {
  // 🛠️ DEBUGGING & HEALING
  DEBUG_ERROR: (error: string, context: string) => `
    Analyze the following error and fix the root cause in the source code.
    Error: ${error}
    Context: ${context}
    
    Ensure the fix follows the existing architectural patterns (e.g., using host-mapped paths for SQLite).
  `,

  HEAL_AUTH_401: `
    The MCP server is reporting '401 Unauthorized' for Radarr/Sonarr. 
    1. Check if 'servarr.ts' is correctly reading API keys.
    2. Verify it uses 'getSecretLogic' for 1Password references.
    3. Ensure it trims any whitespace from the resolved keys.
    Refactor the code to be more resilient to authentication failures.
  `,

  // 🏛️ ARCHITECTURE & REFACTORING
  SQLITE_HOST_MIGRATION: `
    Refactor all database queries in this file to use the host-mapped path standard:
    - Path Template: /srv/app_data/home-server/<app>/<db_name>.db
    - Avoid using 'docker exec' to find the database.
    - Use the 'sqlite3' binary available on the host.
  `,

  CLEAN_TECH_DEBT: `
    Analyze this file and identify technical debt. 
    Look specifically for:
    1. Hardcoded paths outside of /srv.
    2. Inconsistent error handling in tool handlers.
    3. Lack of proper type safety for tool arguments.
    Refactor the code to improve maintainability and reliability.
  `,

  // 📝 DOCUMENTATION
  UPDATE_USER_MANUAL: `
    Analyze the recent changes in the MCP server tools (src/tools/*.ts).
    Update '/srv/docs/UserManual.md' to include the new tools, their descriptions, and usage examples.
    Maintain the existing formatting and structure.
  `,

  // 🚀 AI-NATIVE EVOLUTION
  PROPOSE_AUTOMATIONS: `
    Analyze the entire project structure and the 'MANIFEST.md'.
    Propose 3 new automation ideas that would improve the home server's efficiency, security, or "auto-evolve" capabilities.
    Output the proposals in a structured format with 'Rationale' and 'Implementation Strategy'.
  `
};
