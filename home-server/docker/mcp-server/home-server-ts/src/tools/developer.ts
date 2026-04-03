import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { runShellCommand } from '../utils/docker.js';
import { checkDevMode, isDevMode, HOME_SERVER_ROOT } from '../utils/env.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { zodToJsonSchema } from "../utils/schema.js";

export function registerDeveloperTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    env_manager: async (args: any) => {
      try {
        const { key, value, action = 'set', target = 'mcp' } = args;
        const envPath = target === 'mcp' 
          ? path.resolve(process.cwd(), '../.env')
          : path.resolve(HOME_SERVER_ROOT, '../../home-server/.env');

        if (!fs.existsSync(envPath)) return `❌ .env not found at ${envPath}`;

        let content = fs.readFileSync(envPath, 'utf-8');
        const lines = content.split('\n');
        const index = lines.findIndex(l => l.startsWith(`${key}=`));

        if (action === 'set') {
          if (index > -1) {
            lines[index] = `${key}=${value}`;
          } else {
            lines.push(`${key}=${value}`);
          }
        } else if (action === 'delete') {
          if (index > -1) {
            lines.splice(index, 1);
          }
        }

        fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
        return `✅ ${action === 'set' ? 'Updated' : 'Deleted'} ${key} in ${path.basename(envPath)}`;
      } catch (e: any) {
        return `❌ Env Manager Error: ${e.message}`;
      }
    }
  };

  toolList.push({
    name: 'env_manager',
    description: 'Infrastructure: Safely update or delete environment variables in .env files.',
    inputSchema: zodToJsonSchema(z.object({
      key: z.string().describe("Environment variable key"),
      value: z.string().optional().describe("New value (required for 'set' action)"),
      action: z.enum(['set', 'delete']).optional().default('set').describe("Action to perform"),
      target: z.enum(['mcp', 'home-server']).optional().default('mcp').describe("Target .env file")
    }))
  });

  if (isDevMode()) {
    handlers.dev_shell = async (args: any) => {
      checkDevMode();
      const cwd = args.cwd || HOME_SERVER_ROOT;
      return await runShellCommand(args.command, cwd);
    };

    handlers.dev_write = async (args: any) => {
      checkDevMode();
      try {
        fs.writeFileSync(args.path, args.content, 'utf-8');
        return `✅ Wrote to ${args.path}`;
      } catch (e: any) {
        return `❌ Write failed: ${e.message}`;
      }
    };

    handlers.dev_git_sync = async (args: any) => {
      checkDevMode();
      const cwd = HOME_SERVER_ROOT;
      try {
        await runShellCommand('git pull', cwd);
        await runShellCommand('git add .', cwd);
        try {
          await runShellCommand('git commit -m "Home Server Auto-Sync"', cwd);
        } catch {} // ignore if nothing to commit
        await runShellCommand('git push', cwd);
        return "✅ Git Sync Complete.";
      } catch (e: any) {
        return `❌ Git Sync Failed: ${e.message}`;
      }
    };

    toolList.push(
      {
        name: 'dev_shell',
        description: 'Executes raw Bash commands. HIGH RISK. Development Mode Only.',
        inputSchema: zodToJsonSchema(z.object({ command: z.string(), cwd: z.string().optional() }))
      },
      {
        name: 'dev_write',
        description: 'Overwrites arbitrary files. Development Mode Only.',
        inputSchema: zodToJsonSchema(z.object({ path: z.string(), content: z.string() }))
      },
      {
        name: 'dev_git_sync',
        description: 'Syncs the project with GitHub. Development Mode Only.',
        inputSchema: zodToJsonSchema(z.object({ project_name: z.string(), remote_url: z.string().optional().default('') }))
      }
    );
  }

  return handlers;
}
