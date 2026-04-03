import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["/home/patosoto/geminiclaw/wizard-bridge-mcp/dist/index.js"]
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
