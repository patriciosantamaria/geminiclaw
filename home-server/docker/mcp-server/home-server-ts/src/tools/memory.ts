import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { zodToJsonSchema } from "../utils/schema.js";
import { ChromaClient } from "chromadb";
import axios from "axios";
import * as crypto from "crypto";

const OLLAMA_URL = "http://ollama:11434/api/embeddings";
const MODEL_NAME = "nomic-embed-text";

async function getEmbedding(text: string): Promise<number[]> {
  const response = await axios.post(OLLAMA_URL, {
    model: MODEL_NAME,
    prompt: text
  });
  return response.data.embedding;
}

export function registerMemoryTools(server: Server, toolList: any[]) {
  const client = new ChromaClient({ tenant: 'default_tenant', database: 'default_database', host: 'chromadb', port: 8000 });

  const handlers: Record<string, Function> = {
    memorize_architecture: async (args: any) => {
      try {
        const { text, tags } = args;
        const collection = await client.getOrCreateCollection({ name: "server_memory" });
        const embedding = await getEmbedding(text);
        const id = crypto.randomUUID();
        
        const metadata: any = { timestamp: new Date().toISOString() };
        if (tags && tags.length > 0) {
            metadata.tags = tags.join(",");
        }

        await collection.add({
            ids: [id],
            embeddings: [embedding],
            metadatas: [metadata],
            documents: [text]
        });

        return `✅ Successfully memorized context. ID: ${id}`;
      } catch (e: any) {
        return `❌ Failed to memorize: ${e.message}`;
      }
    },
    recall_context: async (args: any) => {
      try {
        const { query, n_results = 3 } = args;
        const collection = await client.getOrCreateCollection({ name: "server_memory" });
        const embedding = await getEmbedding(query);
        
        const results = await collection.query({
            queryEmbeddings: [embedding],
            nResults: n_results
        });

        if (!results.documents || results.documents[0].length === 0) {
            return "No relevant context found in memory.";
        }

        const formatted = results.documents[0].map((doc: any, i: number) => {
            const meta = results.metadatas && results.metadatas[0] && results.metadatas[0][i] ? results.metadatas[0][i] : {};
            return `--- Result ${i + 1} ---\nContent: ${doc}\nMetadata: ${JSON.stringify(meta)}`;
        }).join("\n\n");

        return formatted;
      } catch (e: any) {
        return `❌ Failed to recall: ${e.message}`;
      }
    }
  };

  toolList.push(
    {
      name: 'memorize_architecture',
      description: 'Memory: Store architectural decisions, configurations, and complex script logic into the vector database.',
      inputSchema: zodToJsonSchema(z.object({
        text: z.string().describe("The detailed context or architectural information to memorize."),
        tags: z.array(z.string()).optional().describe("Optional tags like 'network', 'tailscale', 'docker'")
      }))
    },
    {
      name: 'recall_context',
      description: 'Memory: Search the vector database for past configurations, decisions, or system context using semantic search.',
      inputSchema: zodToJsonSchema(z.object({
        query: z.string().describe("The question or topic to search for."),
        n_results: z.number().optional().default(3).describe("Number of relevant snippets to return.")
      }))
    }
  );

  return handlers;
}