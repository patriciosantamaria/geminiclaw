import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { request } from '../utils/api.js';
import { getSecretLogic } from '../utils/vault.js';
import { zodToJsonSchema } from "../utils/schema.js";

function getHaUrl() {
  return process.env.HOMEASSISTANT_URL || 'http://homeassistant:8123';
}

async function getToken() {
  let token = process.env.HOMEASSISTANT_TOKEN || '';
  if (!token || token.includes('placeholder') || token.startsWith('op://')) {
    try {
      const reference = token && token.startsWith('op://') ? token : 'op://Server/Key - Home Assistant/credential';
      token = await getSecretLogic(reference);
    } catch (e: any) {
      // Fallback
    }
  }
  return token;
}

async function getHeaders() {
  const token = await getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export function registerHomeTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    hass_get_state: async (args: any) => {
      try {
        const url = `${getHaUrl()}/api/states/${args.entity_id}`;
        const headers = await getHeaders();
        const resp = await request('GET', url, undefined, undefined, { headers });
        return resp.data;
      } catch (e: any) {
        return { error: e.message };
      }
    },
    hass_call_service: async (args: any) => {
      try {
        const { domain, service, entity_id, data } = args;
        const url = `${getHaUrl()}/api/services/${domain}/${service}`;
        const headers = await getHeaders();
        const payload = { entity_id, ...(data || {}) };
        const resp = await request('POST', url, payload, undefined, { headers });
        return resp.data;
      } catch (e: any) {
        return { error: e.message };
      }
    },
    hass_list_entities: async (args: any) => {
      try {
        const url = `${getHaUrl()}/api/states`;
        const headers = await getHeaders();
        const resp = await request('GET', url, undefined, undefined, { headers });
        let entities = resp.data.map((s: any) => s.entity_id);
        if (args.domain) {
          entities = entities.filter((e: string) => e.startsWith(`${args.domain}.`));
        }
        return entities;
      } catch (e: any) {
        return { error: e.message };
      }
    },
    hass_logbook_search: async (args: any) => {
      try {
        const url = `${getHaUrl()}/api/logbook`;
        const headers = await getHeaders();
        const params: any = {};
        if (args.entity_id) params.entity = args.entity_id;
        const resp = await request('GET', url, undefined, params, { headers });

        let events = resp.data;
        if (Array.isArray(events)) {
          const limit = args.limit || 10;
          return events.slice(-limit);
        }
        return events;
      } catch (e: any) {
        return { error: e.message };
      }
    }
  };

  toolList.push(
    {
      name: 'hass_get_state',
      description: "HomeAutomation: Gets the current state and attributes of a specific entity.",
      inputSchema: zodToJsonSchema(z.object({ entity_id: z.string() }))
    },
    {
      name: 'hass_call_service',
      description: "HomeAutomation: Controls devices by calling HA services.",
      inputSchema: zodToJsonSchema(z.object({
        domain: z.string(),
        service: z.string(),
        entity_id: z.string(),
        data: z.any().optional().default({})
      }))
    },
    {
      name: 'hass_list_entities',
      description: "HomeAutomation: Lists available entities with optional domain filter.",
      inputSchema: zodToJsonSchema(z.object({ domain: z.string().optional() }))
    },
    {
      name: 'hass_logbook_search',
      description: "HomeAutomation: Reads recent events from the Home Assistant logbook.",
      inputSchema: zodToJsonSchema(z.object({ entity_id: z.string().optional(), limit: z.number().optional().default(10) }))
    }
  );

  return handlers;
}
