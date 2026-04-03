import { logger } from "./logger.js";
import { execa } from 'execa';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import * as fs from 'node:fs';

let cachedOpToken: string | null = null;

export function getOpToken(): string {
  if (cachedOpToken) return cachedOpToken;

  let token = process.env.OP_SERVICE_ACCOUNT_TOKEN;
  if (!token) {
    const envPath = path.resolve(process.cwd(), '../.env');
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      token = envConfig['OP_SERVICE_ACCOUNT_TOKEN'];
    }
  }

  if (!token) {
    throw new Error("OP_SERVICE_ACCOUNT_TOKEN is not set.");
  }

  cachedOpToken = token;
  return token;
}

export async function runOp(args: string[], inputData?: string): Promise<string> {
  const token = getOpToken();
  const env = { ...process.env, OP_SERVICE_ACCOUNT_TOKEN: token };

  try {
    const { stdout } = await execa('op', args, { env, input: inputData });
    return stdout;
  } catch (error: any) {
    throw new Error(`1Password Error: ${error.stderr || error.message}`);
  }
}

// Simple in-memory cache for secrets
const secretCache = new Map<string, { value: string; expires: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export async function getSecretLogic(reference: string): Promise<string> {
  const cached = secretCache.get(reference);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  try {
    const result = await runOp(["read", reference, "--no-newline"]);
    const value = result.trim();
    secretCache.set(reference, { value, expires: Date.now() + CACHE_TTL });
    return value;
  } catch (e) {
    logger.error(`Failed to read secret ${reference}: ${e}`);
    throw e;
  }
}

export async function getItemLogic(item: string, vault: string = "Server"): Promise<any> {
  try {
    const result = await runOp(["item", "get", item, `--vault=${vault}`, "--format=json"]);
    return JSON.parse(result);
  } catch (e: any) {
    throw new Error(`Failed to get item ${item}: ${e.message}`);
  }
}

export async function saveSecretLogic(title: string, secretValue: string, vault: string = "Server", category: string = "Secure Note"): Promise<string> {
  try {
    const args = [
      "item", "create",
      `--category=${category}`,
      `--title=${title}`,
      `--vault=${vault}`,
      `notes=${secretValue}`
    ];
    const result = await runOp(args);
    return `Saved to Vault '${vault}' as '${title}'. ID: ${result.trim()}`;
  } catch (e) {
    return `Error saving to Vault: ${e}`;
  }
}

export async function whoamiLogic(): Promise<string> {
  try {
    const res = await runOp(["whoami"]);
    return res.trim();
  } catch {
    return "Not Authenticated";
  }
}
