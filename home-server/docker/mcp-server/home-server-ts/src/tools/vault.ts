import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { getSecretLogic, getItemLogic, saveSecretLogic, whoamiLogic } from '../utils/vault.js';
import { zodToJsonSchema } from "../utils/schema.js";

export function registerVaultTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    vault_get_secret: async (args: any) => {
      return await getSecretLogic(args.reference);
    },
    vault_get_item: async (args: any) => {
      return await getItemLogic(args.item, args.vault);
    },
    vault_save_secret: async (args: any) => {
      return await saveSecretLogic(args.title, args.secret_value, args.vault || 'Server', args.category || 'Secure Note');
    },
    vault_whoami: async () => {
      return await whoamiLogic();
    }
  };

  toolList.push(
    {
      name: 'vault_get_secret',
      description: 'Read a secret from 1Password using a reference (e.g. op://Vault/Item/Field).',
      inputSchema: zodToJsonSchema(z.object({
        reference: z.string()
      }))
    },
    {
      name: 'vault_get_item',
      description: 'Read a full item from 1Password including all fields (returns JSON).',
      inputSchema: zodToJsonSchema(z.object({
        item: z.string().describe("Item name or ID"),
        vault: z.string().optional().default('Server').describe("Vault name")
      }))
    },
    {
      name: 'vault_save_secret',
      description: 'Save a new secret to 1Password.',
      inputSchema: zodToJsonSchema(z.object({
        title: z.string(),
        secret_value: z.string(),
        vault: z.string().optional().default('Server'),
        category: z.string().optional().default('Secure Note')
      }))
    },
    {
      name: 'vault_whoami',
      description: 'Check the current 1Password session status.',
      inputSchema: zodToJsonSchema(z.object({}))
    }
  );

  return handlers;
}
