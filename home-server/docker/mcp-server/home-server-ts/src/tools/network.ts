import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { runCommand } from '../utils/docker.js';
import { request } from '../utils/api.js';
import { getSecretLogic } from '../utils/vault.js';
import { zodToJsonSchema } from "../utils/schema.js";

async function tailscaleApi(method: string, path: string, data?: any) {
  let apiKey, tailnet;
  try {
    apiKey = await getSecretLogic("op://Server/Key - Tailscale/credential");
    tailnet = await getSecretLogic("op://Server/Key - Tailscale/username");
  } catch (e: any) {
    if (!tailnet) {
      tailnet = "-";
    } else {
      throw new Error(`Failed to retrieve Tailscale credentials: ${e.message}`);
    }
  }

  const url = `https://api.tailscale.com/api/v2/tailnet/${tailnet}${path}`;
  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  };

  try {
    const resp = await request(method, url, data, undefined, { headers });
    return resp.data;
  } catch (e: any) {
    throw new Error(`Tailscale API error: ${e.message}`);
  }
}

export function registerNetworkTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    network_vpn_check: async () => {
      try {
        const resp = await request('GET', 'https://api.ipify.org');
        const hostIp = String(resp.data).trim();
        const { stdout: vpnIp } = await runCommand('docker', ['exec', 'qbittorrent', 'curl', '-4', '-s', 'ifconfig.me/ip'], { timeout: 5000 });
        
        const status = vpnIp.trim() !== hostIp ? "🟢 PROTECTED" : "🔴 EXPOSED";
        return `Host IP: ${hostIp} | VPN IP: ${vpnIp.trim()} | Status: ${status}`;
      } catch (e: any) {
        return `Check failed: ${e.message}`;
      }
    },
    tailscale_status: async () => {
      try {
        const { stdout } = await runCommand('docker', ['exec', 'tailscale', 'tailscale', 'status', '--json']);
        return JSON.parse(stdout);
      } catch (e: any) {
        return { error: e.message };
      }
    },
    tailscale_list_devices: async () => {
      try {
        const res = await tailscaleApi('GET', '/devices');
        return (res.devices || []).map((d: any) => ({
          name: d.name,
          ip: d.addresses?.[0],
          id: d.id,
          routes: d.extraSubnets || []
        }));
      } catch (e: any) {
        return { error: e.message };
      }
    },
    tailscale_approve_routes: async (args: any) => {
      try {
        const { device_id, routes } = args;
        const payload = { routeSettings: { routes: { enabled: routes } } };
        await tailscaleApi('POST', `/devices/${device_id}/routes`, payload);
        return `Successfully approved routes ${JSON.stringify(routes)} for device ${device_id}.`;
      } catch (e: any) {
        return { error: e.message };
      }
    },
    tailscale_set_dns_config: async (args: any) => {
      try {
        const { nameserver } = args;
        await tailscaleApi('POST', '/dns/nameservers', { nameservers: [nameserver] });
        await tailscaleApi('POST', '/dns/settings', { magicDNS: true, overrideLocalDNS: true });
        return `Global DNS set to ${nameserver} with local override enabled.`;
      } catch (e: any) {
        return { error: e.message };
      }
    }
  };

  toolList.push(
    { name: 'network_vpn_check', description: 'Infrastructure: Verify VPN integrity by comparing host IP vs container IP.', inputSchema: zodToJsonSchema(z.object({})) },
    { name: 'tailscale_status', description: 'Infrastructure: Check Tailscale connectivity and MagicDNS status.', inputSchema: zodToJsonSchema(z.object({})) },
    { name: 'tailscale_list_devices', description: 'Infrastructure: Get all devices in the tailnet with their status and advertised routes.', inputSchema: zodToJsonSchema(z.object({})) },
    { name: 'tailscale_approve_routes', description: 'Infrastructure: Approve advertised routes for a specific Tailscale device.', inputSchema: zodToJsonSchema(z.object({ device_id: z.string(), routes: z.array(z.string()) })) },
    { name: 'tailscale_set_dns_config', description: 'Infrastructure: Set the global DNS nameserver for the tailnet and enable Override Local DNS.', inputSchema: zodToJsonSchema(z.object({ nameserver: z.string() })) }
  );

  return handlers;
}
