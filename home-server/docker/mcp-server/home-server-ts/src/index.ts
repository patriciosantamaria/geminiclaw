import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./utils/logger.js";
import { getState, setState, disconnectRedis } from "./utils/redis.js";
import { registerCoreTools } from "./tools/core.js";
import { registerAdguardTools } from "./tools/adguard.js";
import { registerSystemHealthTools } from "./tools/system_health.js";
import { registerVaultTools } from "./tools/vault.js";
import { registerMediaTools } from "./tools/media.js";
import { registerSysMaintenanceTools } from "./tools/sys_maintenance.js";
import { registerHomeTools } from "./tools/home.js";
import { registerDockerOpsTools } from "./tools/docker_ops.js";
import { registerDeveloperTools } from "./tools/developer.js";
import { registerNetworkTools } from "./tools/network.js";
import { registerQbittorrentTools } from "./tools/qbittorrent.js";
import { registerDiagnosticsTools } from "./tools/diagnostics.js";
import { registerMemoryTools } from "./tools/memory.js";
import { registerPlexTools } from "./tools/plex.js";
import { registerServarrTools } from "./tools/servarr.js";
import { randomUUID } from "node:crypto";

const server = new Server(
  {
    name: "home_server",
    version: "2.2.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

const toolList: any[] = [];
const handlers: Record<string, Function> = {};

const mode = process.env.MCP_SERVER_MODE || "all";
logger.info(`Starting MCP server in mode: ${mode}`);

const allRegisters: Record<string, Function[]> = {
  core: [registerCoreTools, registerVaultTools, registerSystemHealthTools, registerMemoryTools],
  infra: [registerDockerOpsTools, registerNetworkTools, registerAdguardTools, registerSysMaintenanceTools, registerDiagnosticsTools],
  media: [registerMediaTools, registerQbittorrentTools, registerPlexTools, registerServarrTools],
  home: [registerHomeTools],
  developer: [registerDeveloperTools]
};

let activeRegisters: Function[] = [];

if (mode === "all") {
  activeRegisters = Object.values(allRegisters).flat();
} else {
  const modes = mode.split(",").map(m => m.trim());
  for (const m of modes) {
    if (allRegisters[m]) {
      activeRegisters.push(...allRegisters[m]);
    } else {
      logger.warn(`Unknown mode: ${m}`);
    }
  }
}

if (activeRegisters.length === 0) {
  activeRegisters = allRegisters.core;
}

for (const register of activeRegisters) {
  const result = register(server, toolList); if (result) Object.assign(handlers, result);
}

// Register MCP Prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "home-status",
        description: "Get a high-level overview of the home server status.",
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === "home-status") {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Please provide a comprehensive status report for the home server. Include container health, storage usage on /srv, and any active alerts from the monitoring stack.",
          },
        },
      ],
    };
  }
  throw new Error(`Prompt not found: ${request.params.name}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolList };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  logger.info({ tool: request.params.name }, "🚀 RECEIVED TOOL CALL");
  const handler = handlers[request.params.name];
  if (!handler) {
    throw new Error(`Tool not found: ${request.params.name}`);
  }

  const traceId = randomUUID();
  const childLogger = logger.child({ traceId, tool: request.params.name });
  const startTime = Date.now();

  try {
    childLogger.info({ args: request.params.arguments }, "Calling tool");

    const result = await handler(request.params.arguments);
    const duration = Date.now() - startTime;

    // Telemetry
    const stats = await getState('telemetry:tools', {});
    const toolStats = stats[request.params.name] || { calls: 0, errors: 0, totalDuration: 0 };
    toolStats.calls++;
    toolStats.totalDuration += duration;
    stats[request.params.name] = toolStats;
    await setState('telemetry:tools', stats);

    childLogger.info({ duration }, "Tool execution completed");

    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    childLogger.error({ duration, error: error.message, stack: error.stack }, "Tool execution failed");

    // Telemetry
    const stats = await getState('telemetry:tools', {});
    const toolStats = stats[request.params.name] || { calls: 0, errors: 0, totalDuration: 0 };
    toolStats.calls++;
    toolStats.errors++;
    toolStats.totalDuration += duration;
    stats[request.params.name] = toolStats;
    await setState('telemetry:tools', stats);

    return {
      content: [
        {
          type: "text",
          text: `Error executing tool '${request.params.name}': ${error.message} [TraceID: ${traceId}]`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Home Server TS Server running on stdio");

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    try {
      await disconnectRedis();
      process.exit(0);
    } catch (error: any) {
      logger.error("Error during shutdown", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  logger.error("Fatal error in Home Server TS Server", error);
  process.exit(1);
});
