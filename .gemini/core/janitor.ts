import { MemoryClient } from './memory-client.ts';
import { Logger } from './utils/logger.ts';
import { handleError, GeminiClawError, ErrorCode } from './utils/errors.ts';

const logger = new Logger('Janitor');

/**
 * 🧹 Janitor Service
 * Handles routine maintenance for the hybrid memory stack.
 */
export class Janitor {
  private memoryClient: MemoryClient;

  constructor(memoryClient: MemoryClient) {
    this.memoryClient = memoryClient;
  }

  /**
   * Compress SQLite database
   */
  async runVacuum(): Promise<void> {
    logger.info('Starting SQLite vacuum...');
    try {
      await new Promise<void>((resolve, reject) => {
        this.memoryClient.db.run('VACUUM', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      logger.info('SQLite vacuum complete.');
    } catch (e) {
      throw handleError(logger, e, 'Janitor vacuum failed');
    }
  }

  /**
   * Enforce Data Lifecycle Management (90-day TTL)
   */
  async ttlPurge(days: number = 90): Promise<number> {
    logger.info(`Starting TTL purge (records older than ${days} days)...`);
    return new Promise((resolve, reject) => {
      const sql = "DELETE FROM knowledge_index WHERE last_updated < date('now', ?)";
      this.memoryClient.db.run(sql, [`-${days} days`], function(err) {
        if (err) {
          reject(handleError(logger, err, 'TTL purge failed'));
        } else {
          logger.info(`TTL purge complete. Removed ${this.changes} records.`);
          resolve(this.changes);
        }
      });
    });
  }

  /**
   * Basic semantic deduplication in Embedded Memory
   * (Removing exact duplicate documents)
   */
  async deduplicateMemory(): Promise<number> {
    logger.info('Starting Memory deduplication...');
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM knowledge_index
        WHERE id NOT IN (
          SELECT MIN(id)
          FROM knowledge_index
          GROUP BY content
        )
      `;
      this.memoryClient.db.run(sql, function(err) {
        if (err) {
          reject(handleError(logger, err, 'Memory deduplication failed'));
        } else {
          logger.info(`Removed ${this.changes} duplicate documents from Memory.`);
          resolve(this.changes);
        }
      });
    });
  }

  /**
   * Run all maintenance tasks
   */
  async runAll(): Promise<void> {
    logger.info('--- Starting Janitor Maintenance Cycle ---');
    await this.runVacuum();
    await this.ttlPurge();
    await this.deduplicateMemory();
    logger.info('--- Janitor Maintenance Cycle Complete ---');
  }
}
