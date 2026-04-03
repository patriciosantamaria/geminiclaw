import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from './logger.js';

const circuitBreakers = new Map<string, { failures: number, lastFailure: number, open: boolean }>();
const MAX_FAILURES = 5;
const COOLDOWN_MS = 30000;

export async function request(method: string, url: string, data?: any, params?: any, config?: AxiosRequestConfig, retries: number = 2): Promise<AxiosResponse> {
  const host = new URL(url).host;
  const breaker = circuitBreakers.get(host) || { failures: 0, lastFailure: 0, open: false };

  if (breaker.open) {
    if (Date.now() - breaker.lastFailure > COOLDOWN_MS) {
      breaker.open = false;
      breaker.failures = 0;
      logger.info({ host }, "Circuit breaker half-open, trying again.");
    } else {
      throw new Error(`Circuit breaker open for ${host}`);
    }
  }

  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await axios({
        method,
        url,
        data,
        params,
        timeout: 10000,
        ...config
      });

      // Success! Reset breaker
      if (breaker.failures > 0 || breaker.open) {
        breaker.failures = 0;
        breaker.open = false;
        circuitBreakers.set(host, breaker);
        logger.info({ host }, "Circuit breaker reset to closed.");
      }
      return resp;
    } catch (e: any) {
      lastError = e;

      // Update breaker state
      breaker.failures++;
      breaker.lastFailure = Date.now();
      if (breaker.failures >= MAX_FAILURES) {
        breaker.open = true;
        logger.error({ host, failures: breaker.failures }, "Circuit breaker opened.");
      }
      circuitBreakers.set(host, breaker);

      // Only retry on network errors or 5xx
      if (!e.response || e.response.status < 500) {
        throw e;
      }
      if (i < retries) {
        const delay = Math.pow(2, i) * 1000;
        logger.warn({ host, retry: i + 1, delay }, "Retrying request...");
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export async function checkUrlHealth(url: string, timeout: number = 5000): Promise<{ healthy: boolean; status_code?: number; error?: string }> {
  try {
    const resp = await axios.get(url, { 
      timeout,
      maxRedirects: 0,
      validateStatus: () => true
    });
    return { healthy: resp.status < 500, status_code: resp.status };
  } catch (e: any) {
    return { healthy: false, error: e.message };
  }
}
