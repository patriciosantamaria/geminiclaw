"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
async function main() {
    const transport = new stdio_js_1.StdioClientTransport({
        command: "node",
        args: ["/home/patosoto/geminiclaw/wizard-bridge-mcp/dist/index.js"]
    });
    const client = new index_js_1.Client({
        name: "test-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });
    await client.connect(transport);
    console.log("Calling tool...");
    const result = await client.callTool({
        name: "execute_workspace_script",
        arguments: {
            script: `
        const drive = google.drive({ version: 'v3', auth });
        const res = await drive.files.list({ pageSize: 3, fields: 'files(id, name)' });
        return res.data.files;
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
