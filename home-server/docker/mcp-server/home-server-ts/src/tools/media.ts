import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { request } from '../utils/api.js';
import { getSecretLogic } from '../utils/vault.js';
import { getServiceUrl } from '../utils/env.js';
import { zodToJsonSchema } from "../utils/schema.js";

function getUrl(service: string) {
  const defaults: Record<string, string> = {
    SONARR: "http://sonarr:8989",
    RADARR: "http://radarr:7878",
    PROWLARR: "http://gluetun:9696",
    OVERSEERR: "http://overseerr:5055",
    TDARR: "http://tdarr:8266",
    IMMICH: "http://immich_server:2283"
  };
  return getServiceUrl(service, defaults[service]);
}

async function getApiKey(service: string) {
  return await getSecretLogic(`op://Server/Key - ${service}/credential`);
}

export function registerMediaTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    media_health_check: async (args: any) => {
      const app = (args.app || '').toLowerCase();
      let url = '', apiPath = '', key = '';
      if (app === 'radarr') { url = getUrl('RADARR'); apiPath = '/api/v3'; key = await getApiKey('Radarr'); }
      else if (app === 'sonarr') { url = getUrl('SONARR'); apiPath = '/api/v3'; key = await getApiKey('Sonarr'); }
      else if (app === 'prowlarr') { url = getUrl('PROWLARR'); apiPath = '/api/v1'; key = await getApiKey('Prowlarr'); }
      else { return "❌ Unknown app."; }

      const headers = { "X-Api-Key": key };
      const report: string[] = [];

      try {
        await request('GET', `${url}${apiPath}/system/status`, undefined, undefined, { headers });
        report.push(`🟢 ${app}: System UP`);
      } catch (e: any) {
        report.push(`🔴 ${app}: Connection Failed (${e.message})`);
        return report.join('\n');
      }

      try {
        const resp = await request('GET', `${url}${apiPath}/health`, undefined, undefined, { headers });
        const health = resp.data || [];
        const errors = health.filter((h: any) => h.type === 'error');
        const warnings = health.filter((h: any) => h.type === 'warning');

        if (errors.length) {
          report.push(`🔴 ${errors.length} Critical Errors:`);
          errors.forEach((e: any) => report.push(`  - ${e.message}`));
        }
        if (warnings.length) {
          report.push(`🟡 ${warnings.length} Warnings:`);
          warnings.forEach((e: any) => report.push(`  - ${e.message}`));
        }
        if (!errors.length && !warnings.length) {
          report.push("🟢 Configuration Healthy.");
        }
      } catch (e) {
        report.push("⚠️ Failed to fetch health check.");
      }

      return report.join('\n');
    },
    media_sync_status: async () => {
      const apps = ['radarr', 'sonarr', 'prowlarr'];
      const results: Record<string, any> = {};

      for (const app of apps) {
        try {
          let url = '', apiPath = '', key = '';
          if (app === 'radarr') { url = getUrl('RADARR'); apiPath = '/api/v3'; key = await getApiKey('Radarr'); }
          else if (app === 'sonarr') { url = getUrl('SONARR'); apiPath = '/api/v3'; key = await getApiKey('Sonarr'); }
          else if (app === 'prowlarr') { url = getUrl('PROWLARR'); apiPath = '/api/v1'; key = await getApiKey('Prowlarr'); }

          const headers = { "X-Api-Key": key };
          const statusResp = await request('GET', `${url}${apiPath}/system/status`, undefined, undefined, { headers });

          results[app] = {
            status: "UP",
            version: statusResp.data.version,
            appData: statusResp.data.appData
          };
        } catch (e: any) {
          results[app] = { status: "DOWN", error: e.message };
        }
      }
      return results;
    },
    media_prowlarr_sync: async () => {
      try {
        const url = getUrl('PROWLARR');
        const key = await getApiKey('Prowlarr');
        const headers = { "X-Api-Key": key };
        const resp = await request('POST', `${url}/api/v1/command`, { name: "ApplicationIndexerSync" }, undefined, { headers });
        return `✅ Prowlarr sync triggered. Command ID: ${resp.data.id}`;
      } catch (e: any) {
        return `Sync failed: ${e.message}`;
      }
    },
    media_repair_client: async (args: any) => {
      return `ℹ️ Automatic repair for ${args.app} download client is not yet implemented. Please check settings manually.`;
    },
    overseerr_list_pending: async () => {
      try {
        const url = getUrl('OVERSEERR');
        const apiKey = await getApiKey('Overseerr');
        const resp = await request('GET', `${url}/api/v1/request?filter=pending`, undefined, undefined, { headers: { 'X-Api-Key': apiKey } });
        return resp.data.results || [];
      } catch (e: any) {
        return { error: e.message };
      }
    },
    overseerr_manage_request: async (args: any) => {
      try {
        const url = getUrl('OVERSEERR');
        const { request_id, action } = args;
        const apiKey = await getApiKey('Overseerr');
        await request('POST', `${url}/api/v1/request/${request_id}/${action}`, undefined, undefined, { headers: { 'X-Api-Key': apiKey } });
        return "Success";
      } catch (e: any) {
        return `Error: ${e.response?.data?.message || e.message}`;
      }
    },
    tdarr_queue_status: async () => {
      try {
        const url = getUrl('TDARR');
        const apiKey = await getSecretLogic("op://Server/Key - Tdarr/credential").catch(() => process.env.TDARR_API_KEY || "");

        const resp = await request('GET', `${url}/api/v2/get-nodes`, undefined, undefined, {
          headers: {
            'X-Api-Key': apiKey,
            'Accept': 'application/json'
          },
          timeout: 5000
        });

        const nodes = resp.data;
        if (!nodes || typeof nodes !== 'object' || Object.keys(nodes).length === 0) {
          return "No Tdarr nodes found or unauthorized. Check API Key and Port 8266.";
        }

        const stats: Record<string, any> = {};
        for (const nodeId in nodes) {
          const node = nodes[nodeId];
          // Tdarr V2 API might omit 'online' property for online nodes.
          // In V2, processPid is often nested inside 'config'. We check both to be robust.
          const isOnline = node.online === true || (!('online' in node) && !!(node.processPid || node.config?.processPid));
          stats[node.nodeName || nodeId] = {
            status: isOnline ? "Online" : "Offline",
            paused: node.nodePaused,
            workers: node.workerCounts,
            queue: node.queueLengths || {}
          };
        }
        return stats;
      } catch (e: any) {
        return {
          error: `Tdarr API Error: ${e.message}`,
          details: e.response?.data || "Verify Tdarr is running on port 8266."
        };
      }
    },
    tdarr_library_scan: async (args: any) => {
      try {
        const url = getUrl('TDARR');
        const { library_id } = args;
        const apiKey = await getSecretLogic("op://Server/Key - Tdarr/credential").catch(() => process.env.TDARR_API_KEY || "");
        await request('POST', `${url}/api/v2/scan-files`, {
          data: {
            scanConfig: {
              dbID: library_id,
              mode: 'scanFindNew',
              arrayOrPath: true
            }
          }
        }, undefined, { headers: { 'X-Api-Key': apiKey } });
        return "Scan triggered.";
      } catch (e: any) {
        return `Error: ${JSON.stringify(e.response?.data) || e.message}`;
      }
    },
    tdarr_node_control: async (args: any) => {
      try {
        const url = getUrl('TDARR');
        const { node_id, action } = args;
        const apiKey = await getSecretLogic("op://Server/Key - Tdarr/credential").catch(() => process.env.TDARR_API_KEY || "");
        const isPaused = action === 'pauseNode';
        await request('POST', `${url}/api/v2/update-node`, {
          data: {
            nodeID: node_id,
            nodeUpdates: { nodePaused: isPaused }
          }
        }, undefined, { headers: { 'X-Api-Key': apiKey } });
        return `Node ${node_id} ${isPaused ? 'paused' : 'resumed'}.`;
      } catch (e: any) {
        return `Error: ${e.response?.data || e.message}`;
      }
    },
    immich_status: async () => {
      try {
        const url = getUrl('IMMICH');
        // const apiKey = await getApiKey('Immich'); // Version endpoint doesn't need auth usually
        const resp = await request('GET', `${url}/api/server/version`, undefined, undefined, { /* headers: { 'x-api-key': apiKey } */ });
        return `Immich reachable. Version: ${resp.data.major}.${resp.data.minor}.${resp.data.patch}`;
      } catch (e: any) {
        return `Error: ${e.message}`;
      }
    },
    immich_library_scan: async (args: any) => {
      try {
        const url = getUrl('IMMICH');
        const { library_id } = args;
        const apiKey = await getApiKey('Immich');
        await request('POST', `${url}/api/libraries/${library_id}/scan`, undefined, undefined, { headers: { 'x-api-key': apiKey } });
        return "Scan initiated.";
      } catch (e: any) {
        return `Error: ${e.response?.data?.message || e.message}`;
      }
    }
  };

  toolList.push(
    {
      name: 'media_health_check',
      description: "MediaAutomation: Comprehensive health and configuration audit for Radarr/Sonarr/Prowlarr.",
      inputSchema: zodToJsonSchema(z.object({
        app: z.enum(['sonarr', 'radarr', 'prowlarr']).describe("The application to audit")
      }))
    },
    {
      name: 'media_sync_status',
      description: "MediaAutomation: High-level overview of synchronization status across the media stack.",
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'media_prowlarr_sync',
      description: "MediaAutomation: Triggers a 'SyncIndexers' command in Prowlarr.",
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'media_repair_client',
      description: "MediaAutomation: Attempts to reconnect the application to its download client.",
      inputSchema: zodToJsonSchema(z.object({
        app: z.string().describe("The application whose download client connection needs repair")
      }))
    },
    {
      name: 'overseerr_list_pending',
      description: 'MediaCuration: List all pending media requests in Overseerr.',
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'overseerr_manage_request',
      description: 'MediaCuration: Approve or decline an Overseerr request.',
      inputSchema: zodToJsonSchema(z.object({
        request_id: z.string().describe("The ID of the request"),
        action: z.enum(['approve', 'decline']).describe("Action to perform")
      }))
    },
    {
      name: 'tdarr_queue_status',
      description: 'MediaAutomation: Get the status of the Tdarr transcode queue across all nodes.',
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'tdarr_library_scan',
      description: 'MediaAutomation: Trigger a scan for a specific Tdarr library to find new files.',
      inputSchema: zodToJsonSchema(z.object({
        library_id: z.string().describe("The ID of the library to scan")
      }))
    },
    {
      name: 'tdarr_node_control',
      description: 'MediaAutomation: Start or pause a Tdarr transcode node.',
      inputSchema: zodToJsonSchema(z.object({
        node_id: z.string().describe("The ID of the node to control"),
        action: z.enum(['pauseNode', 'resumeNode']).describe("Action to perform")
      }))
    },
    {
      name: 'immich_status',
      description: 'MediaAutomation: Get the current status of Immich.',
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'immich_library_scan',
      description: 'MediaAutomation: Trigger a scan of an Immich library.',
      inputSchema: zodToJsonSchema(z.object({ library_id: z.string() }))
    }
  );

  return handlers;
}
