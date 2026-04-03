import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { HOME_SERVER_ROOT, getServiceUrl } from "../utils/env.js";
import { getState } from "../utils/redis.js";
import { checkUrlHealth, request } from "../utils/api.js";
import { getSecretLogic } from "../utils/vault.js";
import { zodToJsonSchema } from "../utils/schema.js";

async function validateConfig() {
  const report: string[] = ["### CONFIGURATION VALIDATION REPORT ###"];
  
  // 1. Check 1Password
  try {
    await getSecretLogic("op://Server/Key - Radarr/credential");
    report.push("✅ 1Password Connectivity: OK");
  } catch (e: any) {
    report.push(`❌ 1Password Connectivity: FAILED (${e.message})`);
  }

  // 2. Check Core Services Connectivity
  const services = [
    { name: "Radarr", url: process.env.RADARR_URL || "http://radarr:7878" },
    { name: "Sonarr", url: process.env.SONARR_URL || "http://sonarr:8989" },
    { name: "Prowlarr", url: process.env.PROWLARR_URL || "http://prowlarr:9696" },
    { name: "AdGuard", url: process.env.ADGUARD_URL || "http://adguardhome:80" },
  ];

  for (const s of services) {
    const health = await checkUrlHealth(s.url);
    if (health.healthy) {
      report.push(`✅ Service ${s.name}: REACHABLE (${s.url})`);
    } else {
      report.push(`❌ Service ${s.name}: UNREACHABLE (${s.url}) - Error: ${health.error || "Unknown"}`);
    }
  }

  // 3. Environment variables
  report.push(`ℹ️ HOME_SERVER_ROOT: ${HOME_SERVER_ROOT}`);

  return report.join("\n");
}

export function registerCoreTools(server: Server, toolList: any[]) {
  // Resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "home-server://config",
          name: "Home Server Configuration",
          description: "Get system config",
        },
        {
          uri: "home-server://state",
          name: "Squad State",
          description: "Get squad state",
        },
        {
          uri: "home-server://inventory",
          name: "Skill Inventory",
          description: "Get list of available skills",
        },
        {
          uri: "home-server://health",
          name: "System Health",
          description: "Get health report",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === "home-server://config") {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: JSON.stringify({ home_server_root: HOME_SERVER_ROOT, typescript: true, version: "2.1.0" }, null, 2),
          },
        ],
      };
    }
    if (request.params.uri === "home-server://state") {
      const active_missions = await getState("active_missions", []);
      const shared_context = await getState("shared_context", {});
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: JSON.stringify({ active_missions, shared_context }, null, 2),
          },
        ],
      };
    }
    if (request.params.uri === "home-server://inventory") {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/plain",
            text: "TS Server: Skills registered statically via domain-specific instances.",
          },
        ],
      };
    }
    if (request.params.uri === "home-server://health") {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: JSON.stringify({ status: "TS Server Active", mode: process.env.MCP_SERVER_MODE }, null, 2),
          },
        ],
      };
    }
    throw new Error("Resource not found");
  });

  // Tools
  const handlers: Record<string, Function> = {
    config_validate: async () => {
      return await validateConfig();
    },
    system_list_tools: async () => {
      const categories: Record<string, string[]> = {};

      toolList.forEach(tool => {
        const prefix = tool.description.split(':')[0] || 'Other';
        if (!categories[prefix]) categories[prefix] = [];
        categories[prefix].push(`${tool.name}: ${tool.description}`);
      });

      return Object.entries(categories)
        .map(([cat, tools]) => `### ${cat.toUpperCase()}\n${tools.map(t => `- ${t}`).join('\n')}`)
        .join('\n\n');
    },
    firefly_log_server_cost: async (args: any) => {
      try {
        const url = getServiceUrl('FIREFLY', 'http://firefly_app:8080');
        const { amount, description, category } = args;
        const apiKey = await getSecretLogic("op://Server/Key - Firefly III/credential");
        const payload = {
          transactions: [{
            type: "withdrawal",
            date: new Date().toISOString().split('T')[0],
            amount: String(amount),
            description: description,
            source_name: "Checking Account",
            destination_name: "Server Subscriptions",
            category_name: category || "Subscriptions"
          }]
        };
        const headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.api+json'
        };
        await request('POST', `${url}/api/v1/transactions`, payload, undefined, { headers });
        return "Transaction logged.";
      } catch (e: any) {
        return `Error: ${e.response?.data?.message || e.message}`;
      }
    }
  };

  toolList.push({
    name: "config_validate",
    description: "EnterpriseAudit: Validates the home server configuration, 1Password connectivity, and core service reachability.",
    inputSchema: zodToJsonSchema(z.object({})),
  });

  toolList.push({
    name: "system_list_tools",
    description: "EnterpriseAudit: Provides a categorized list of all available tools and their purposes.",
    inputSchema: zodToJsonSchema(z.object({})),
  });

  toolList.push({
    name: 'firefly_log_server_cost',
    description: 'Financial: Log a server-related cost to Firefly III.',
    inputSchema: zodToJsonSchema(z.object({
      amount: z.number(),
      description: z.string(),
      category: z.string().optional().default("Subscriptions")
    }))
  });

  return handlers;
}
