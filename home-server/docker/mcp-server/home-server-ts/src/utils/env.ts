import * as dotenv from 'dotenv';
import * as path from 'node:path';
import * as fs from 'node:fs';

class Config {
  public readonly HOME_SERVER_ROOT: string;
  public readonly MODE: string;
  public readonly REDIS_HOST: string;
  public readonly REDIS_PORT: number;
  public readonly PUID: string;
  public readonly PGID: string;
  public readonly LOG_LEVEL: string;

  constructor() {
    const envPath = path.resolve(process.cwd(), '../.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    } else {
      dotenv.config();
    }

    this.HOME_SERVER_ROOT = process.env.HOME_SERVER_ROOT || '/app';
    this.MODE = (process.env.MODE || 'production').toLowerCase();
    this.REDIS_HOST = process.env.REDIS_HOST || 'home-server-redis';
    this.REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
    this.PUID = process.env.PUID || '1000';
    this.PGID = process.env.PGID || '1000';
    this.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
  }

  public isDevMode(): boolean {
    return this.MODE === 'development';
  }

  public checkDevMode(): void {
    if (!this.isDevMode()) {
      throw new Error(`❌ Developer tools are disabled in '${this.MODE}' mode. Requires MODE='development'.`);
    }
  }

  public getServiceUrl(service: string, defaultUrl: string): string {
    return process.env[`${service.toUpperCase()}_URL`] || defaultUrl;
  }
}

export const config = new Config();

// Legacy exports for compatibility
export const HOME_SERVER_ROOT = config.HOME_SERVER_ROOT;
export const MODE = config.MODE;
export const REDIS_HOST = config.REDIS_HOST;
export const REDIS_PORT = config.REDIS_PORT;
export const PUID = config.PUID;
export const PGID = config.PGID;

export function isDevMode() { return config.isDevMode(); }
export function checkDevMode() { config.checkDevMode(); }
export function getServiceUrl(service: string, defaultUrl: string) { return config.getServiceUrl(service, defaultUrl); }
