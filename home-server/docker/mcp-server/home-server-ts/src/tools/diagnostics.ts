import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { runCommand } from '../utils/docker.js';
import * as fs from 'fs';
import { zodToJsonSchema } from "../utils/schema.js";

export function registerDiagnosticsTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    hardlink_verifier: async (args: any) => {
      try {
        const { source_path, target_path } = args;
        const statSrc = fs.statSync(source_path);
        const statTgt = fs.statSync(target_path);
        if (statSrc.ino === statTgt.ino) {
          return `✅ SUCCESS: ${source_path} and ${target_path} are hardlinked (Inode: ${statSrc.ino}).`;
        } else {
          return `❌ FAILED: Different inodes. Source: ${statSrc.ino}, Target: ${statTgt.ino}.`;
        }
      } catch (e: any) {
        return `Error checking hardlink: ${e.message}`;
      }
    },
    audit_library_space: async (args: any) => {
      try {
        const { library_path } = args;
        const { stdout: hardlinkedStdout } = await runCommand('find', [library_path, '-type', 'f', '-links', '+1']);
        const hardlinkedCount = hardlinkedStdout.split('\n').filter(Boolean).length;
        
        const { stdout: totalStdout } = await runCommand('find', [library_path, '-type', 'f']);
        const totalCount = totalStdout.split('\n').filter(Boolean).length;
        
        if (totalCount === 0) {
          return `Library ${library_path} is empty.`;
        }
        
        const ratio = (hardlinkedCount / totalCount) * 100;
        return `Audit for ${library_path}:
Total Files: ${totalCount}
Hardlinked Files: ${hardlinkedCount}
Hardlink Ratio: ${ratio.toFixed(2)}%`;
      } catch (e: any) {
        return `Error auditing library: ${e.message}`;
      }
    },
    docker_connectivity_tester: async (args: any) => {
      try {
        const { source_container, target_url } = args;
        const { stdout, exitCode } = await runCommand('docker', [
          'exec', source_container, 'curl', '-sI', '-w', '%{http_code}', '-o', '/dev/null', '--connect-timeout', '5', target_url
        ]);
        
        if (exitCode === 0) {
          return `✅ Connectivity from ${source_container} to ${target_url} SUCCESS. HTTP Code: ${stdout.trim()}`;
        } else {
          return `❌ Connectivity from ${source_container} to ${target_url} FAILED.
Curl exit code: ${exitCode}`;
        }
      } catch (e: any) {
        return `Error testing network: ${e.message}`;
      }
    },
    compose_volume_migrator: async (args: any) => {
      try {
        const { service, old_volume, new_volume } = args;
        const composePath = "/srv/docker/home-server/docker-compose.yml";
        let content = fs.readFileSync(composePath, 'utf8');
        const lines = content.split('\n');
        
        let inService = false;
        let inVolumes = false;
        let modified = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith(`  ${service}:`)) {
            inService = true;
            continue;
          } else if (inService && line.startsWith("  ") && !line.startsWith("    ")) {
            inService = false;
            inVolumes = false;
          }
          
          if (inService && line.trim() === "volumes:") {
            inVolumes = true;
            continue;
          } else if (inService && inVolumes && line.trim().startsWith("-")) {
            if (line.includes(old_volume)) {
              lines[i] = line.replace(old_volume, new_volume);
              modified = true;
            }
          } else if (inService && inVolumes && !line.trim().startsWith("-")) {
            inVolumes = false;
          }
        }
        
        if (!modified) {
          return `Volume ${old_volume} not found for service ${service}.`;
        }
        
        fs.writeFileSync(composePath, lines.join('\n'));
        await runCommand('docker', ['compose', '-f', composePath, 'up', '-d', service]);
        return `✅ Successfully migrated volume ${old_volume} to ${new_volume} for ${service} and restarted container.`;
      } catch (e: any) {
        return `Error migrating volume: ${e.message}`;
      }
    },
    docker_stack_security_audit: async () => {
      try {
        const { stdout: psOut } = await runCommand('docker', ['ps', '-q']);
        const containerIds = psOut.split('\n').filter(Boolean);
        const report = ["### STACK SECURITY AUDIT ###"];
        const protectedApps = ["qbittorrent", "prowlarr", "flaresolverr"];
        
        let gluetunId = "";
        try {
          const { stdout: gOut } = await runCommand('docker', ['ps', '-q', '-f', 'name=gluetun']);
          gluetunId = gOut.trim();
        } catch (e) {}
        
        for (const cid of containerIds) {
          const { stdout: inspectOut } = await runCommand('docker', ['inspect', cid]);
          const data = JSON.parse(inspectOut)[0];
          const name = data.Name.replace(/^\//, '');
          const env = data.Config.Env || [];
          
          let puid = env.find((e: string) => e.startsWith("PUID=")) || "MISSING";
          let pgid = env.find((e: string) => e.startsWith("PGID=")) || "MISSING";
          
          const userObj = data.Config.User || "";
          if (puid === "MISSING" && userObj) {
            const parts = userObj.split(':');
            if (parts[0]) puid = `PUID=${parts[0]}`;
            if (parts.length > 1) pgid = `PGID=${parts[1]}`;
          }
          
          let status = `Container: ${name} | ${puid} | ${pgid}`;
          
          if (protectedApps.includes(name)) {
            const netMode = data.HostConfig.NetworkMode || "";
            if (netMode.includes("container:gluetun") || netMode.includes("service:gluetun") || (gluetunId && netMode.includes(`container:${gluetunId}`))) {
              status += " | 🟢 VPN PROTECTED";
            } else {
              status += " | 🔴 EXPOSED";
            }
          }
          report.push(status);
        }
        return report.join('\n');
      } catch (e: any) {
        return `Audit failed: ${e.message}`;
      }
    },
    compose_env_editor: async (args: any) => {
      try {
        const { key, value } = args;
        const envPath = "/srv/docker/home-server/.env";
        let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        const lines = content.split('\n');
        
        let found = false;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith(`${key}=`)) {
            lines[i] = `${key}="${value}"`;
            found = true;
            break;
          }
        }
        
        if (!found) {
          lines.push(`${key}="${value}"`);
        }
        
        fs.writeFileSync(envPath, lines.join('\n'));
        return `✅ Successfully updated ${key} in .env. Restart stack to apply.`;
      } catch (e: any) {
        return `Error updating .env: ${e.message}`;
      }
    },
    sys_storage_analysis: async (args: any) => {
      try {
        const path = args.path || "/srv";
        const { stdout: duOut } = await runCommand('du', ['-sh', '-d', '1', path]);
        const { stdout: dfOut } = await runCommand('df', ['-h', path]);

        return `### Storage Analysis for ${path} ###\n\n` +
               `**Disk Usage Summary:**\n${dfOut}\n\n` +
               `**Top Level Folders:**\n${duOut}`;
      } catch (e: any) {
        return `Error analyzing storage: ${e.message}`;
      }
    }
  };

  toolList.push(
    {
      name: 'hardlink_verifier',
      description: 'Infrastructure: Verify if two files are hardlinked by comparing their inodes. Useful for verifying media automation.',
      inputSchema: zodToJsonSchema(z.object({
        source_path: z.string().describe("Path to the source file"),
        target_path: z.string().describe("Path to the target file")
      }))
    },
    {
      name: 'audit_library_space',
      description: 'Infrastructure: Audit a library folder to find the ratio of hardlinked vs copied files. High ratios indicate efficient storage use.',
      inputSchema: zodToJsonSchema(z.object({
        library_path: z.string().describe("Root path of the library to audit")
      }))
    },
    {
      name: 'docker_connectivity_tester',
      description: 'Infrastructure: Test network connectivity from a specific container to a target URL using curl.',
      inputSchema: zodToJsonSchema(z.object({
        source_container: z.string().describe("Name of the container to run curl from"),
        target_url: z.string().describe("URL to test connectivity to")
      }))
    },
    {
      name: 'compose_volume_migrator',
      description: 'Infrastructure: Updates a volume mount for a specific service in docker-compose.yml and restarts it.',
      inputSchema: zodToJsonSchema(z.object({
        service: z.string().describe("The service name in docker-compose"),
        old_volume: z.string().describe("The old volume path/string to replace"),
        new_volume: z.string().describe("The new volume path/string")
      }))
    },
    {
      name: 'docker_stack_security_audit',
      description: 'Infrastructure: Audit the entire stack for project standards: PUID=1000, PGID=1000, and VPN protection for media apps.',
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'compose_env_editor',
      description: 'Infrastructure: Update or add an environment variable in the .env file for the home-server project.',
      inputSchema: zodToJsonSchema(z.object({
        key: z.string().describe("The environment variable key"),
        value: z.string().describe("The new value")
      }))
    },
    {
      name: 'sys_storage_analysis',
      description: 'EnterpriseAudit: Detailed analysis of disk usage within the /srv hierarchy or specified path.',
      inputSchema: zodToJsonSchema(z.object({
        path: z.string().optional().default("/srv").describe("The path to analyze")
      }))
    }
  );

  return handlers;
}
