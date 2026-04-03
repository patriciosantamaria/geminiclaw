import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { getSecretLogic } from '../utils/vault.js';
import { getServiceUrl } from '../utils/env.js';
import axios from 'axios';
import { zodToJsonSchema } from "../utils/schema.js";

async function qbitApi(method: string, path: string, params?: any, data?: any) {
  const url = getServiceUrl('QBITTORRENT', 'http://gluetun:8080');
  let username = process.env.QBITTORRENT_USERNAME || "admin";
  let password = process.env.QBITTORRENT_PASSWORD;

  if (!password) {
    try {
      username = await getSecretLogic("op://Server/qBittorrent/username");
    } catch (e) {}
    password = await getSecretLogic("op://Server/qBittorrent/credential");
  }

  try {
    const loginResp = await axios.post(
      `${url}/api/v2/auth/login`,
      new URLSearchParams({ username, password }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const cookie = loginResp.headers['set-cookie'];
    if (!cookie) {
      throw new Error("Login to qBittorrent failed, no cookie returned.");
    }

    const resp = await axios({
      method,
      url: `${url}/api/v2${path}`,
      params,
      data: data ? new URLSearchParams(data).toString() : undefined,
      headers: {
        'Cookie': cookie.join('; '),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return resp.data;
  } catch (e: any) {
    throw new Error(`qBittorrent API error: ${e.response?.data || e.message}`);
  }
}

export function registerQbittorrentTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    qbit_list: async (args: any) => {
      try {
        const filter = args.filter || 'all';
        return await qbitApi('GET', '/torrents/info', { filter });
      } catch (e: any) {
        return { error: e.message };
      }
    },
    qbit_manage: async (args: any) => {
      try {
        const { hash, action } = args;
        if (action === "delete") {
            await qbitApi('POST', '/torrents/delete', undefined, { hashes: hash, deleteFiles: "true" });
            return `Torrent ${hash} deleted.`;
        }
        await qbitApi('POST', `/torrents/${action}`, undefined, { hashes: hash });
        return `Torrent ${hash} ${action}ed.`;
      } catch (e: any) {
        return { error: e.message };
      }
    },
    qbit_cleanup_orphans: async () => {
      try {
        const torrents = await qbitApi('GET', '/torrents/info', { filter: 'all' });
        const orphans = torrents.filter((t: any) => t.state === 'missingFiles');
        if (!orphans.length) {
            return "No orphaned torrents found.";
        }
        const hashes = orphans.map((t: any) => t.hash).join('|');
        await qbitApi('POST', '/torrents/delete', undefined, { hashes, deleteFiles: "true" });
        return `Cleaned up ${orphans.length} orphaned torrents.`;
      } catch (e: any) {
        return { error: e.message };
      }
    },
    qbit_get_stats: async () => {
      try {
        const stats = await qbitApi('GET', '/transfer/info');
        return {
          dlSpeed: stats.dl_info_speed,
          upSpeed: stats.up_info_speed,
          dlData: stats.dl_info_data,
          upData: stats.up_info_data,
          status: stats.connection_status
        };
      } catch (e: any) {
        return { error: e.message };
      }
    }
  };

  toolList.push(
    {
      name: 'qbit_list',
      description: 'List torrents from qBittorrent with optional filtering.',
      inputSchema: zodToJsonSchema(z.object({
        filter: z.string().optional().default("all").describe("Filter torrents by state (all, downloading, completed, paused, active, inactive, resumed, error, stale)")
      }))
    },
    {
      name: 'qbit_manage',
      description: 'Manage a specific torrent.',
      inputSchema: zodToJsonSchema(z.object({
        hash: z.string().describe("The torrent hash"),
        action: z.enum(['pause', 'resume', 'delete', 'topPrio', 'bottomPrio']).describe("Action to perform")
      }))
    },
    {
      name: 'qbit_cleanup_orphans',
      description: 'Automatically scans qBittorrent for items in a missingFiles state and deletes them to keep the library clean.',
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'qbit_get_stats',
      description: 'Get global transfer statistics and connection status from qBittorrent.',
      inputSchema: zodToJsonSchema(z.object({}))
    }
  );

  return handlers;
}
