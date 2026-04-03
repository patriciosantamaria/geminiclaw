import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import { jules, Outcome } from "@google/jules-sdk";
import { PROMPT_LIBRARY } from "../prompts/library.js";
import { FleetOrchestrator } from "../orchestration/fleet.js";
import { zodToJsonSchema } from "../utils/schema.js";
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export function registerJulesOrchestratorTools(server: Server, toolList: any[]) {
  const orchestrator = new FleetOrchestrator();

  const handlers: Record<string, Function> = {
    mcp_jules_spawn_fix: async (args: any) => {
      const { error, context, repo, branch } = args;
      logger.info({ error, repo }, "🚀 Spawning Jules Fix Agent...");

      try {
        const prompt = PROMPT_LIBRARY.DEBUG_ERROR(error, context);
        // Leverage latest SDK features: Repoless sessions (if repo undefined) & autoPr
        const session = await jules.run({
          prompt,
          title: `Fix: ${error.slice(0, 30)}...`,
          source: repo ? { github: repo, baseBranch: branch || 'main' } : undefined,
          autoPr: true
        });

        const outcome = await session.result();
        return {
            status: outcome.state,
            sessionId: outcome.sessionId,
            changeSet: (outcome as any).changeSet?.()?.diff || "No diff generated."
        };
      } catch (e: any) {
        if (e.name === 'JulesRateLimitError') {
          return { error: `Jules Rate Limit Exceeded. Please try again later. Details: ${e.message}` };
        }
        if (e.name === 'JulesApiError') {
          return { error: `Jules API Error: ${e.message}` };
        }
        return { error: `Jules Spawn Fix failed: ${e.message}` };
      }
    },

    mcp_jules_audit_codebase: async (args: any) => {
      const { repo, branch, focus } = args;
      logger.info({ repo, focus }, "🏛️ Dispatching Codebase Audit Fleet...");

      try {
        const tasks = [
          {
            id: 'tech-debt-audit',
            prompt: PROMPT_LIBRARY.CLEAN_TECH_DEBT,
            sourceRepo: repo,
            baseBranch: branch
          },
          {
            id: 'sqlite-path-audit',
            prompt: PROMPT_LIBRARY.SQLITE_HOST_MIGRATION,
            sourceRepo: repo,
            baseBranch: branch
          }
        ];

        const outcomes = await orchestrator.dispatchParallel(tasks);
        return outcomes.map(o => ({
            sessionId: o.sessionId,
            state: o.state,
            hasChanges: !!(o as any).changeSet?.()
        }));
      } catch (e: any) {
        return { error: `Audit fleet failed: ${e.message}` };
      }
    }
  };

  const spawnFixSchema = z.object({
    error: z.string().describe("The error message or bug description"),
    context: z.string().describe("Contextual info (logs, file paths)"),
    repo: z.string().optional().describe("GitHub repo in owner/repo format"),
    branch: z.string().optional().describe("Base branch to work from")
  });

  const auditSchema = z.object({
    repo: z.string().describe("GitHub repo in owner/repo format"),
    branch: z.string().optional().describe("Base branch to work from"),
    focus: z.enum(['tech-debt', 'sqlite-standard', 'all']).default('all')
  });

  toolList.push(
    {
      name: 'mcp_jules_spawn_fix',
      description: "AI-Autonomous: Spawns a Jules coding agent to fix a specific error in the source code.",
      inputSchema: zodToJsonSchema(spawnFixSchema as any)
    },
    {
      name: 'mcp_jules_audit_codebase',
      description: "AI-Autonomous: Dispatches a fleet of Jules agents to audit and refactor the codebase for tech debt and standards.",
      inputSchema: zodToJsonSchema(auditSchema as any)
    }
  );

  return handlers;
}
