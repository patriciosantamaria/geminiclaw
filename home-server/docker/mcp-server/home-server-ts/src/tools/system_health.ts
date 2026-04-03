import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { checkUrlHealth } from '../utils/api.js';
import { execa } from 'execa';
import { getState } from '../utils/redis.js';
import { zodToJsonSchema } from "../utils/schema.js";

async function _check_media_health() {
  const report: string[] = [];
  const plexBaseUrl = process.env.PLEX_URL || "http://plex:32400";
  const plexHealth = await checkUrlHealth(`${plexBaseUrl}/identity`);
  report.push(plexHealth.healthy ? "🟢 Plex: UP" : "🔴 Plex: Unreachable");

  const services = [
    { name: "Sonarr", url: process.env.SONARR_URL || "http://sonarr:8989" },
    { name: "Radarr", url: process.env.RADARR_URL || "http://radarr:7878" },
    { name: "Prowlarr", url: process.env.PROWLARR_URL || "http://prowlarr:9696" },
    { name: "Bazarr", url: process.env.BAZARR_URL || "http://bazarr:6767" },
    { name: "Tdarr", url: process.env.TDARR_URL || "http://tdarr:8265" }
  ];

  for (const s of services) {
    const health = await checkUrlHealth(s.url);
    report.push(health.healthy ? `🟢 ${s.name}: UP` : `🔴 ${s.name}: DOWN (${s.url})`);
  }
  return report.join('\n');
}

async function _check_monitoring_health() {
  const report: string[] = [];
  const services = [
    { name: "Grafana", url: "http://grafana:3000" },
    { name: "Prometheus", url: "http://prometheus:9090" },
    { name: "cAdvisor", url: "http://cadvisor:8080" }
  ];
  for (const s of services) {
    const health = await checkUrlHealth(s.url);
    report.push(health.healthy ? `🟢 ${s.name}: UP` : `🔴 ${s.name}: DOWN`);
  }
  return report.join('\n');
}

async function _check_system_health() {
  const report: string[] = [];
  const haUrl = process.env.HOMEASSISTANT_URL || "http://homeassistant:8123";
  const haHealth = await checkUrlHealth(haUrl);
  report.push(haHealth.healthy ? "🟢 Home Assistant: UP" : "🔴 Home Assistant: DOWN");

  const fireflyHealth = await checkUrlHealth("http://firefly_app:8080");
  report.push(fireflyHealth.healthy ? "🟢 Firefly III: UP" : "🔴 Firefly III: DOWN");

  const filebrowserHealth = await checkUrlHealth("http://filebrowser:80");
  report.push(filebrowserHealth.healthy ? "🟢 Filebrowser: UP" : "🔴 Filebrowser: DOWN");

  return report.join('\n');
}

async function _check_infrastructure_health() {
  const report: string[] = [];
  try {
    await execa('docker', ['exec', 'tailscale', 'tailscale', 'status']);
    report.push("🟢 Tailscale: UP");
  } catch {
    report.push("🔴 Tailscale: Error / Container not found");
  }

  const flareUrl = process.env.FLARESOLVERR_URL || "http://gluetun:8191";
  const flareHealth = await checkUrlHealth(flareUrl);
  report.push(flareHealth.healthy ? "🟢 FlareSolverr: UP" : `🔴 FlareSolverr: DOWN (${flareUrl})`);

  try {
    const { stdout } = await execa('docker', ['ps', '--filter', 'name=unpackerr', '--format', '{{.Status}}']);
    report.push(stdout.includes('Up') ? "🟢 Unpackerr: Running" : "🔴 Unpackerr: Stopped");
  } catch {
    report.push("🔴 Unpackerr: Error");
  }

  report.push("🟢 Swarm Director: Online (Self)");
  return report.join('\n');
}

export function registerSystemHealthTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    system_health_check: async (args: any) => {
      const scope = (args.scope || 'all').toLowerCase();
      if (scope === "media") return await _check_media_health();
      if (scope === "monitoring") return await _check_monitoring_health();
      if (scope === "system") return await _check_system_health();
      if (scope === "infrastructure") return await _check_infrastructure_health();
      if (scope === "agent") return "🟢 Home Server Agent Online";
      if (scope === "security") return "Use 'infrastructure' or specific tools for security.";
      if (scope === "diagnostics") {
        if (!args.url) return "Error: 'url' parameter required.";
        return `Web Health: ${JSON.stringify(await checkUrlHealth(args.url))}`;
      }
      return [
        "--- MEDIA ---", await _check_media_health(),
        "--- MONITORING ---", await _check_monitoring_health(),
        "--- SYSTEM ---", await _check_system_health(),
        "--- INFRASTRUCTURE ---", await _check_infrastructure_health()
      ].join('\n');
    },
    system_status_snapshot: async () => {
      try {
        const stats = await execa('docker', ['stats', '--no-stream', '--format', 'json']);
        const containers = stats.stdout.trim().split('\n').map(l => {
            try { return JSON.parse(l); } catch(e) { return null; }
        }).filter(c => c !== null);
        
        const totalCpu = containers.reduce((acc, c) => acc + (parseFloat(c.CPUPerc?.replace('%','')) || 0), 0);
        const topCpu = containers.sort((a,b) => (parseFloat(b.CPUPerc?.replace('%','')) || 0) - (parseFloat(a.CPUPerc?.replace('%','')) || 0))[0]?.Name;

        return {
          container_count: containers.length,
          top_cpu_container: topCpu,
          total_cpu_usage: totalCpu.toFixed(2) + "%",
          vpn_status: "Check network_vpn_check for details"
        };
      } catch (e: any) {
        return { error: e.message };
      }
    },
    system_telemetry: async () => {
      try {
        const stats = await getState('telemetry:tools', {});
        const report = ["### TOOL PERFORMANCE TELEMETRY ###"];

        for (const [tool, data] of Object.entries(stats) as [string, any][]) {
          const avg = data.calls > 0 ? (data.totalDuration / data.calls).toFixed(2) : 0;
          const errorRate = data.calls > 0 ? ((data.errors || 0) / data.calls * 100).toFixed(2) : 0;
          report.push(`- ${tool}: ${data.calls} calls, ${avg}ms avg, ${errorRate}% error rate`);
        }

        if (report.length === 1) return "No telemetry data available yet.";
        return report.join('\n');
      } catch (e: any) {
        return { error: e.message };
      }
    }
  };

  toolList.push({
    name: 'system_health_check',
    description: "Infrastructure: Comprehensive health check across different system domains (media, monitoring, system, infrastructure).",
    inputSchema: zodToJsonSchema(z.object({
      scope: z.enum(['all', 'media', 'monitoring', 'system', 'infrastructure', 'agent', 'diagnostics']).optional().default("all").describe("The scope of the health check"),
      url: z.string().optional().describe("URL to check (only for 'diagnostics' scope)")
    }))
  });

  toolList.push({
    name: 'system_status_snapshot',
    description: "Infrastructure: Get a real-time snapshot of system resources, including container count and top CPU consumers.",
    inputSchema: zodToJsonSchema(z.object({}))
  });

  toolList.push({
    name: 'system_telemetry',
    description: "EnterpriseAudit: Detailed performance metrics for all executed tools.",
    inputSchema: zodToJsonSchema(z.object({}))
  });

  return handlers;
}
