
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { MemoryClient } from './memory-client.ts';
import { Janitor } from './janitor.ts';
import { Logger, LogLevel } from './utils/logger.ts';

describe('Janitor Service', () => {
  const logger = new Logger('JanitorTest', LogLevel.DEBUG);
  const testDb = './janitor_test.db';
  let client: MemoryClient;
  let janitor: Janitor;

  before(async () => {
    if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
    client = new MemoryClient(testDb);
    janitor = new Janitor(client);
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  after(async () => {
    client.db.close();
    if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
    if (fs.existsSync(`${testDb}-shm`)) fs.unlinkSync(`${testDb}-shm`);
    if (fs.existsSync(`${testDb}-wal`)) fs.unlinkSync(`${testDb}-wal`);
  });

  test('runVacuum() should complete successfully', async () => {
    await janitor.runVacuum();
  });

  test('ttlPurge() should remove old records', async () => {
    return new Promise((resolve, reject) => {
      client.db.serialize(() => {
        // Insert some old records and some new records
        client.db.run("INSERT INTO knowledge_index (key, value, last_updated) VALUES ('old', 'info', date('now', '-91 days'))");
        client.db.run("INSERT INTO knowledge_index (key, value, last_updated) VALUES ('new', 'info', date('now'))", async (err) => {
          if (err) return reject(err);

          try {
            const removed = await janitor.ttlPurge(90);
            assert.strictEqual(removed, 1);

            client.db.all("SELECT key FROM knowledge_index", (err, rows: any[]) => {
              if (err) return reject(err);
              assert.strictEqual(rows.length, 1);
              assert.strictEqual(rows[0].key, 'new');
              resolve();
            });
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  });

  // Mocking ChromaDB for deduplication test might be complex, so we'll do a basic check
  // that it handles an empty collection (or no collection) gracefully as we've tested with empty db
  test('deduplicateChroma() should handle empty collection gracefully', async () => {
    const removed = await janitor.deduplicateChroma();
    assert.strictEqual(typeof removed, 'number');
  });
});
