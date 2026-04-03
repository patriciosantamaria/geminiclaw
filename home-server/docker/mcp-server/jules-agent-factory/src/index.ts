import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import pino from 'pino';
import { registerJulesOrchestratorTools } from "./tools/jules_orchestrator.js";
import { randomUUID } from "node:crypto";

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, destination: 2 } // stderr for logging
  }
});

const server = new Server(
  {
    name: "jules_orchestrator",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const toolList: any[] = [];
const handlers: Record<string, Function> = {};

// Register our new orchestration tools
Object.assign(handlers, registerJulesOrchestratorTools(server, toolList));

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolList };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const handler = handlers[request.params.name];
  if (!handler) {
    throw new Error(`Tool not found: ${request.params.name}`);
  }

  const traceId = randomUUID();
  const childLogger = logger.child({ traceId, tool: request.params.name });
  
  try {
    childLogger.info({ args: request.params.arguments }, "Calling orchestrator tool");
    const result = await handler(request.params.arguments);

    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    childLogger.error({ error: error.message }, "Tool execution failed");
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("🚀 Jules Orchestrator MCP Server running on stdio");
}

main().catch((error) => {
  logger.error("Fatal error in Jules Orchestrator", error);
  process.exit(1);
});
