import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { request } from '../utils/api.js';
import { getSecretLogic } from '../utils/vault.js';
import { isDevMode, getServiceUrl } from '../utils/env.js';
import { zodToJsonSchema } from "../utils/schema.js";

const ADGUARD_URL = getServiceUrl('ADGUARD', "http://adguardhome:80/control");

async function getAdguardCreds() {
  const user = process.env.ADGUARD_USER?.startsWith('op://') 
    ? await getSecretLogic(process.env.ADGUARD_USER) 
    : (process.env.ADGUARD_USER || await getSecretLogic("op://Server/Key - AdGuard/notesPlain"));
  const pwd = process.env.ADGUARD_PASS?.startsWith('op://')
    ? await getSecretLogic(process.env.ADGUARD_PASS)
    : (process.env.ADGUARD_PASS || await getSecretLogic("op://Server/Key - AdGuard/credential"));
  return { user, pwd };
}

async function req(method: string, endpoint: string, data?: any, params?: any) {
  try {
    const creds = await getAdguardCreds();
    const url = `${ADGUARD_URL}${endpoint}`;
    const resp = await request(method, url, data, params, {
      auth: { username: creds.user, password: creds.pwd }
    });
    return resp.data;
  } catch (e: any) {
    if (e.response && e.response.data) {
      return { status: e.response.status, text: JSON.stringify(e.response.data) };
    }
    return { error: e.message };
  }
}

export function registerAdguardTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    adguard_status: async () => {
      return await req('GET', '/status');
    },
    adguard_stats: async () => {
      return await req('GET', '/stats');
    },
    adguard_filtering_status: async () => {
      return await req('GET', '/filtering/status');
    },
    adguard_refresh_filters: async () => {
      return await req('POST', '/filtering/refresh', {});
    },
    adguard_enable_filter: async (args: any) => {
      return await req('POST', '/filtering/set_url', {
        url: args.url,
        data: { enabled: args.enabled, name: '', url: args.url }
      });
    },
    adguard_add_filter: async (args: any) => {
      return await req('POST', '/filtering/add_url', {
        name: args.name, url: args.url, whitelist: false
      });
    }
  };

  toolList.push(
    { name: 'adguard_status', description: 'Infrastructure: Get general AdGuard Home status.', inputSchema: zodToJsonSchema(z.object({})) },
    { name: 'adguard_stats', description: 'Infrastructure: Get 24h DNS query statistics.', inputSchema: zodToJsonSchema(z.object({})) },
    { name: 'adguard_filtering_status', description: 'Infrastructure: Get current filtering status.', inputSchema: zodToJsonSchema(z.object({})) },
    { name: 'adguard_refresh_filters', description: 'Infrastructure: Force refresh of all filter lists.', inputSchema: zodToJsonSchema(z.object({})) },
    {
      name: 'adguard_enable_filter',
      description: 'Infrastructure: Enable or disable a specific filter list by URL.',
      inputSchema: zodToJsonSchema(z.object({
        url: z.string().describe("The URL of the filter"),
        enabled: z.boolean().describe("Whether to enable or disable")
      }))
    },
    {
      name: 'adguard_add_filter',
      description: 'Infrastructure: Add a new blocklist/allowlist by URL.',
      inputSchema: zodToJsonSchema(z.object({
        name: z.string().describe("Display name"),
        url: z.string().describe("The URL of the filter list")
      }))
    }
  );

  if (isDevMode()) {
    handlers['adguard_rewrite_list'] = async () => await req('GET', '/rewrite/list');
    handlers['adguard_rewrite_add'] = async (args: any) => await req('POST', '/rewrite/add', { domain: args.domain, answer: args.answer });
    handlers['adguard_rewrite_delete'] = async (args: any) => await req('POST', '/rewrite/delete', { domain: args.domain, answer: args.answer });

    toolList.push(
      {
        name: 'adguard_rewrite_list',
        description: 'Infrastructure: List all DNS rewrites. Dev Mode Only.',
        inputSchema: zodToJsonSchema(z.object({}))
      },
      {
        name: 'adguard_rewrite_add',
        description: 'Infrastructure: Add a DNS rewrite. Dev Mode Only.',
        inputSchema: zodToJsonSchema(z.object({
          domain: z.string().describe("The domain name"),
          answer: z.string().describe("The target IP or domain")
        }))
      },
      {
        name: 'adguard_rewrite_delete',
        description: 'Infrastructure: Delete a DNS rewrite. Dev Mode Only.',
        inputSchema: zodToJsonSchema(z.object({
          domain: z.string().describe("The domain name"),
          answer: z.string().describe("The answer")
        }))
      }
    );
  }

  return handlers;
}
