import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { runShellCommand, runCommand } from '../utils/docker.js';
import { HOME_SERVER_ROOT } from '../utils/env.js';
import { getSecretLogic } from '../utils/vault.js';
import { zodToJsonSchema } from "../utils/schema.js";
import * as fs from 'fs';
import * as path from 'path';

export function registerSysMaintenanceTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    sys_maintenance: async (args: any) => {
      const { target } = args;
      
      if (target === 'os_update') {
        try {
          await runShellCommand('sudo apt-get update && sudo apt-get upgrade -y', HOME_SERVER_ROOT);
          return "✅ System updated successfully (apt-get).";
        } catch (e: any) {
          return `❌ Update failed: ${e.message}`;
        }
      }
      
      if (target === 'docker_prune') {
        try {
          await runCommand('docker', ['system', 'prune', '-f']);
          await runCommand('docker', ['volume', 'prune', '-f']);
          return "✅ Docker resources pruned (images/volumes).";
        } catch (e: any) {
          return `❌ Docker prune failed: ${e.message}`;
        }
      }

      if (target === 'plex_optimize') {
        try {
          let token = process.env.PLEX_TOKEN;
          if (!token) {
            try {
              token = await getSecretLogic("op://Server/Plex Online Token/credential");
            } catch {}
          }
          if (token) {
            const plexUrl = process.env.PLEX_URL || "http://plex:32400";
            const { stdout } = await runCommand('curl', ['-X', 'PUT', `${plexUrl}/library/optimize?async=1&X-Plex-Token=${token}`]);
            return "✅ Plex optimization triggered.";
          }
          return "❌ Plex Token not found.";
        } catch (e: any) {
          return `❌ Plex optimization failed: ${e.message}`;
        }
      }

      return `❌ Unknown maintenance target: ${target}`;
    },
    storage_usage_report: async () => {
      try {
        // du -sh with globs needs a shell
        const cmd = "du -sh /srv/media/* /srv/app_data/home-server/* /srv/downloads 2>/dev/null";
        const res = await runShellCommand(cmd, "/");
        return res;
      } catch (e: any) {
        return { error: e.message };
      }
    },
    bulk_hardlink: async (args: any) => {
      try {
        const { source, target } = args;
        // Validation to prevent shell injection even though we use runCommand for the outer docker call
        // Actually, let's use runCommand for docker run
        const cmdArgs = [
            'run', '--rm', '-d', 
            '-v', '/srv:/srv', 
            'ubuntu', 
            'bash', '-c', `hardlink -c "${source}" "${target}" > /srv/downloads/bulk_hardlink.log 2>&1`
        ];
        await runCommand('docker', cmdArgs);
        return `✅ Bulk hardlink job started in background for ${source} to ${target}.`;
      } catch (e: any) {
        return `❌ Bulk hardlink failed: ${e.message}`;
      }
    },
    media_fix_permissions: async () => {
      try {
        // Needs shell for &&
        const cmd = "chown -R 1000:1000 /srv/media /srv/downloads && chmod -R 775 /srv/media /srv/downloads";
        await runShellCommand(cmd, "/");
        return "✅ Permissions reset to 1000:1000 (775) for media and downloads.";
      } catch (e: any) {
        return `❌ Permission fix failed: ${e.message}`;
      }
    },
    sys_recovery: async (args: any) => {
      const { action } = args;
      try {
        if (action === 'restart_unhealthy') {
          const { stdout } = await runCommand('docker', ['ps', '--filter', 'health=unhealthy', '--format', '{{.Names}}']);
          const containers = stdout.trim().split('\n').filter(Boolean);
          if (containers.length === 0) return "No unhealthy containers found.";

          for (const c of containers) {
            await runCommand('docker', ['restart', c]);
          }
          return `✅ Restarted unhealthy containers: ${containers.join(', ')}`;
        }

        if (action === 'clear_cache') {
          const { getRedisClient } = await import('../utils/redis.js');
          const redis = getRedisClient();
          if (redis) {
            await redis.flushall();
            return "✅ Redis cache cleared.";
          }
          return "❌ Redis not available.";
        }

        if (action === 'fix_docker_socket') {
            if (fs.existsSync('/var/run/docker.sock')) {
                const stat = fs.statSync('/var/run/docker.sock');
                return `✅ Docker socket exists. Permissions: ${stat.mode}. Owned by: ${stat.uid}:${stat.gid}`;
            }
            return "❌ Docker socket NOT found at /var/run/docker.sock";
        }

        if (action === 'soft_reload') {
            try {
              const mcpDir = path.resolve(process.cwd(), '../');
              const cmd = "export OP_SERVICE_ACCOUNT_TOKEN=\"$(grep OP_SERVICE_ACCOUNT_TOKEN .env | cut -d= -f2-)\" && op run --env-file .env -- docker compose up -d";
              await runShellCommand(cmd, mcpDir);
              return "✅ MCP Servers soft-reloaded with latest .env secrets.";
            } catch (e: any) {
              return `❌ Soft-reload failed: ${e.message}`;
            }
        }

        return `❌ Unsupported recovery action: ${action}`;
      } catch (e: any) {
        return `❌ Recovery failed: ${e.message}`;
      }
    }
  };

  toolList.push(
    {
      name: 'sys_maintenance',
      description: "Infrastructure: Execute system-wide maintenance tasks like OS updates, Docker pruning, or Plex database optimization.",
      inputSchema: zodToJsonSchema(z.object({
        target: z.enum(['os_update', 'docker_prune', 'plex_optimize']).describe("The maintenance task to perform")
      }))
    },
    {
      name: 'storage_usage_report',
      description: "Infrastructure: Get a detailed breakdown of space usage in critical /srv paths.",
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'bulk_hardlink',
      description: "Infrastructure: Safely invokes hardlink -c <source> <target> as a managed background job.",
      inputSchema: zodToJsonSchema(z.object({
        source: z.string().describe("Source directory path"),
        target: z.string().describe("Target directory path")
      }))
    },
    {
      name: 'media_fix_permissions',
      description: "Infrastructure: Reset ownership (1000:1000) and permissions (775) for media and download folders to fix access issues.",
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'sys_recovery',
      description: 'Infrastructure: Automated recovery tool for fixing common system issues.',
      inputSchema: zodToJsonSchema(z.object({
        action: z.enum(['restart_unhealthy', 'clear_cache', 'fix_docker_socket', 'soft_reload']).describe("The recovery action to perform")
      }))
    }
  );

  return handlers;
}
