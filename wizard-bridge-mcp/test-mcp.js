import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: ["./dist/index.js"]
    });
    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });
    await client.connect(transport);
    console.log("Calling tool...");
    const result = await client.callTool({
        name: "read_workspace_script",
        arguments: {
            script: `
        return "Connection Test Successful";
      `
        }
    });
    console.log("Result:", JSON.stringify(result, null, 2));
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
