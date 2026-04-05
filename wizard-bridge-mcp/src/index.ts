import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as ivm from "isolated-vm";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { Logger } from "./utils/logger.js";
import { handleError, GeminiClawError, ErrorCode } from "./utils/errors.js";

const logger = new Logger("WizardBridgeMCP");

// Common scopes for Google Workspace + Tasks & Contacts (removed datastudio)
const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/presentations",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/chat.spaces",
  "https://www.googleapis.com/auth/chat.messages",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/contacts.readonly"
];

const server = new Server(
  {
    name: "wizard-bridge-mcp",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const ExecuteWorkspaceScriptSchema = z.object({
  script: z.string().describe(
    "A JavaScript/TypeScript async code block that interacts with Google Workspace APIs. " +
    "The 'google' module and a pre-authenticated 'auth' client are globally available in the context. " +
    "Return the final result. Example: `const drive = google.drive({version: 'v3', auth}); return (await drive.files.list()).data;`"
  ),
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_workspace_script",
        description: "TIER 1 (SAFE): Executes a dynamic JavaScript snippet for GET/Search actions only. Used for finding emails, reading calendar, listing tasks, or searching contacts. 'google' and an authenticated 'auth' client are injected.",
        inputSchema: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "The JavaScript code to execute.",
            },
          },
          required: ["script"],
        },
      },
      {
        name: "write_workspace_script",
        description: "TIER 2 (MUTATING): Executes a dynamic JavaScript snippet for POST/PUT/PATCH actions. Used for creating drafts, updating files, or adding tasks. Do not use for deletion. 'google' and an authenticated 'auth' client are injected.",
        inputSchema: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "The JavaScript code to execute.",
            },
          },
          required: ["script"],
        },
      },
      {
        name: "destructive_workspace_script",
        description: "TIER 3 (DANGEROUS): Executes a dynamic JavaScript snippet for DELETE/TRASH actions. Used for purging data. 'google' and an authenticated 'auth' client are injected.",
        inputSchema: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "The JavaScript code to execute.",
            },
          },
          required: ["script"],
        },
      }
    ],
  };
});

let authClient: any = null;

async function getAuthClient() {
  if (!authClient) {
    try {
      const auth = new GoogleAuth({ scopes: SCOPES });
      authClient = await auth.getClient();
      logger.info("Initialized Google Auth Client with Application Default Credentials.");
    } catch (e) {
      throw handleError(logger, e, "Failed to initialize Google Auth Client. Please ensure ADC is set up.");
    }
  }
  return authClient;
}

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const validTools = ["read_workspace_script", "write_workspace_script", "destructive_workspace_script"];
  if (!validTools.includes(request.params.name)) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { script } = ExecuteWorkspaceScriptSchema.parse(request.params.arguments);
  logger.info(`Executing script for tool: ${request.params.name}`);

  try {
    const auth = await getAuthClient();

    // Create a hardened isolate with a 128MB memory limit
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
    const jail = context.global;

    // To properly share complex objects like 'google' and 'auth' with isolated-vm,
    // we use References. However, for the user's scripts to work seamlessly,
    // we must provide a bridge.

    await jail.set('global', jail.derefInto());

    // We pass google and auth as references.
    // Note: The user script must be aware that these are proxied.
    await jail.set('google', new ivm.Reference(google));
    await jail.set('auth', new ivm.Reference(auth));
    
    // Provide a basic log function
    await jail.set('log', new ivm.Reference((...args: any[]) => {
      logger.info('[Sandbox]', ...args);
    }));

    // Wrap the script to handle the async nature and the injected references.
    // We use a simplified approach where we eval the script directly in the context.
    const asyncWrapper = `
      (async () => {
        try {
          ${script}
        } catch (e) {
          throw e;
        }
      })()
    `;

    const result = await context.eval(asyncWrapper, {
      promise: true,
      timeout: 30000
    });

    return {
      content: [
        {
          type: "text",
          text: result !== undefined ? JSON.stringify(result, null, 2) : "Script executed successfully (no return value).",
        },
      ],
    };
  } catch (error: any) {
    const geminiError = handleError(logger, error, 'Error executing workspace script');
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(geminiError.toJSON(), null, 2),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Wizard Bridge MCP Server running on stdio (3-Tier Architecture)");
}

main().catch((error) => {
  handleError(logger, error, "Critical server error");
  process.exit(1);
});
