import { logger } from "./logger.js";
import { Redis } from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from './env.js';

let _redisClient: Redis | null = null;
let _memState: Record<string, any> = { active_missions: [], shared_context: {} };

export function getRedisClient(): Redis | null {
  if (_redisClient === null) {
    try {
      _redisClient = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
      });
      _redisClient.on('error', (err: any) => {
        logger.error(`Redis connection failed (${err.message}). Falling back to in-memory state.`);
        // To prevent constant crashing, we nullify it and rely on memory
        _redisClient?.disconnect();
        _redisClient = null as any; 
      });
    } catch (e) {
      logger.error(`Redis setup failed: ${e}`);
    }
  }
  // Ignore errors if it's the proxy "null" we assigned in error
  if (_redisClient && (_redisClient as any) !== null) {
      return _redisClient;
  }
  return null;
}

export async function getState(key: string, defaultValue: any = null): Promise<any> {
  const r = getRedisClient();
  if (r && r.status === 'ready') {
    try {
      const val = await r.get(`home-server:${key}`);
      if (val) {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  }
  return _memState[key] !== undefined ? _memState[key] : defaultValue;
}

export async function setState(key: string, value: any): Promise<void> {
  const r = getRedisClient();
  if (r && r.status === 'ready') {
    try {
      const storeVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await r.set(`home-server:${key}`, storeVal);
      return;
    } catch (e) {
      logger.error(`Failed to set state in Redis: ${e}`);
    }
  }
  _memState[key] = value;
}

export async function disconnectRedis(): Promise<void> {
  if (_redisClient) {
    await _redisClient.quit();
    _redisClient = null;
  }
}
