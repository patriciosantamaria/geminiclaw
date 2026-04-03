
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
      await this.memoryClient.vacuum();
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
   * Basic semantic deduplication in ChromaDB
   * (Removing exact duplicate documents)
   */
  async deduplicateChroma(): Promise<number> {
    logger.info('Starting ChromaDB deduplication...');
    try {
      const collectionName = this.memoryClient.collectionName;
      const chroma = this.memoryClient.chroma;

      let collection;
      try {
        collection = await chroma.getCollection({ name: collectionName });
      } catch (err) {
        logger.warn('Could not find ChromaDB collection, skipping deduplication.');
        return 0;
      }

      const results = await collection.get();

      if (!results || !results.ids || results.ids.length === 0) {
        logger.info('ChromaDB is empty, no deduplication needed.');
        return 0;
      }

      const seenDocuments = new Set<string>();
      const idsToDelete: string[] = [];

      for (let i = 0; i < results.ids.length; i++) {
        const doc = results.documents[i];
        if (doc === null || doc === undefined) continue;

        if (seenDocuments.has(doc)) {
          idsToDelete.push(results.ids[i]);
        } else {
          seenDocuments.add(doc);
        }
      }

      if (idsToDelete.length > 0) {
        await collection.delete({ ids: idsToDelete });
        logger.info(`Removed ${idsToDelete.length} duplicate documents from ChromaDB.`);
      } else {
        logger.info('No duplicates found in ChromaDB.');
      }

      return idsToDelete.length;
    } catch (e) {
      throw handleError(logger, e, 'ChromaDB deduplication failed');
    }
  }

  /**
   * Run all maintenance tasks
   */
  async runAll(): Promise<void> {
    logger.info('--- Starting Janitor Maintenance Cycle ---');
    await this.runVacuum();
    await this.ttlPurge();
    await this.deduplicateChroma();
    logger.info('--- Janitor Maintenance Cycle Complete ---');
  }
}
