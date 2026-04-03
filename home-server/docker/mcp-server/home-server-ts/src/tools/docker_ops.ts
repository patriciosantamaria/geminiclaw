import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { runCommand } from '../utils/docker.js';
import { zodToJsonSchema } from "../utils/schema.js";

export function registerDockerOpsTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    docker_compose_control: async (args: any) => {
      const { project, action } = args;
      const validActions = ['up', 'down', 'restart', 'pull'];
      if (!validActions.includes(action)) return `❌ Invalid action: ${action}`;

      const cmdArgs = ['compose'];
      if (project !== 'home-server') {
          // If a specific service is provided
          cmdArgs.push(action);
          if (action === 'up') cmdArgs.push('-d');
          cmdArgs.push(project);
      } else {
          cmdArgs.push(action);
          if (action === 'up') cmdArgs.push('-d');
      }

      try {
        const { stdout, stderr } = await runCommand('docker', cmdArgs);
        return `✅ ${project} ${action} SUCCESS.\n${stdout}\n${stderr}`;
      } catch (e: any) {
        return `❌ Action failed: ${e.message}`;
      }
    },
    docker_list: async () => {
      try {
        const { stdout } = await runCommand('docker', ['ps', '--format', '{{.Names}}']);
        const names = stdout.trim().split('\n').filter(Boolean);
        const report: string[] = [];

        for (const name of names) {
          const { stdout: inspectOut } = await runCommand('docker', ['inspect', '--format', '{{.State.Status}} | {{.HostConfig.NetworkMode}} | {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', name]);
          const [status, netMode, ip] = inspectOut.trim().split(' | ');
          report.push(`${name.padEnd(20)} | ${status.padEnd(10)} | ${netMode.padEnd(15)} | ${ip || 'host'}`);
        }

        return `NAME                 | STATUS     | NETWORK         | IP\n` + '-'.repeat(60) + '\n' + report.join('\n');
      } catch (e: any) {
        return `❌ Failed to list containers: ${e.message}`;
      }
    },
    docker_logs: async (args: any) => {
      try {
        const { name, lines } = args;
        const { stdout, stderr } = await runCommand('docker', ['logs', '--tail', String(lines || 50), name]);
        return stdout + stderr;
      } catch (e: any) {
        return `❌ Failed to get logs for ${args.name}: ${e.message}`;
      }
    },
    docker_stats: async (args: any) => {
      try {
        const { name } = args;
        const { stdout } = await runCommand('docker', ['stats', '--no-stream', '--format', '{{.Name}}: CPU {{.CPUPerc}} / MEM {{.MemUsage}}', name]);
        return stdout;
      } catch (e: any) {
        return `❌ Failed to get stats for ${args.name}: ${e.message}`;
      }
    },
    docker_manage: async (args: any) => {
      const { name, action } = args;
      const validActions = ['start', 'stop', 'restart'];
      if (!validActions.includes(action)) return `❌ Invalid action: ${action}`;
      try {
        const { stdout } = await runCommand('docker', [action, name]);
        return `✅ Container ${name} ${action}ed SUCCESS.\n${stdout}`;
      } catch (e: any) {
        return `❌ Failed to ${action} ${name}: ${e.message}`;
      }
    },
    docker_inspect: async (args: any) => {
      try {
        const { name } = args;
        const { stdout } = await runCommand('docker', ['inspect', name]);
        return stdout;
      } catch (e: any) {
        return `❌ Failed to inspect ${args.name}: ${e.message}`;
      }
    }
  };

  toolList.push(
    {
      name: 'docker_compose_control',
      description: 'Infrastructure: Controls docker-compose projects (up, down, restart, pull).',
      inputSchema: zodToJsonSchema(z.object({
        project: z.string().describe("The name of the project or specific service"),
        action: z.enum(['up', 'down', 'restart', 'pull']).describe("Action to perform")
      }))
    },
    {
      name: 'docker_list',
      description: 'Infrastructure: Lists all active containers and their current status.',
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'docker_logs',
      description: 'Infrastructure: Returns recent log entries from a specific container.',
      inputSchema: zodToJsonSchema(z.object({
        name: z.string().describe("Container name"),
        lines: z.number().optional().default(50).describe("Number of lines to return")
      }))
    },
    {
      name: 'docker_stats',
      description: 'Infrastructure: Returns real-time CPU and Memory usage for a specific container.',
      inputSchema: zodToJsonSchema(z.object({
        name: z.string().describe("Container name")
      }))
    },
    {
      name: 'docker_manage',
      description: 'Infrastructure: Start, stop, or restart a specific container.',
      inputSchema: zodToJsonSchema(z.object({
        name: z.string().describe("Container name"),
        action: z.enum(['start', 'stop', 'restart']).describe("Action to perform")
      }))
    },
    {
      name: 'docker_inspect',
      description: 'Infrastructure: Returns low-level JSON information on Docker objects.',
      inputSchema: zodToJsonSchema(z.object({
        name: z.string().describe("Object name or ID")
      }))
    }
  );

  return handlers;
}
