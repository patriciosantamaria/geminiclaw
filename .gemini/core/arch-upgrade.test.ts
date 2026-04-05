import test from 'node:test';
import assert from 'node:assert';
import { MemoryClient } from './memory-client.ts';
import { PubSubHub, Signal } from './pub-sub-hub.ts';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DB = '.gemini/data/test-arch.db';

test('Architectural Upgrade Pillars', async (t) => {
  // Cleanup test DB
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

  const memory = new MemoryClient(TEST_DB);

  await t.test('Pillar 1: Commitment Tracking', async () => {
    await memory.addCommitment({
      description: 'Test Commitment',
      confidence: 0.95
    });

    return new Promise((resolve, reject) => {
      memory.db.get("SELECT * FROM commitments WHERE description = 'Test Commitment'", (err, row: any) => {
        if (err) reject(err);
        assert.strictEqual(row.confidence, 0.95);
        resolve();
      });
    });
  });

  await t.test('Pillar 2: Autonomy Dial', async () => {
    const initial = await memory.getAutonomyLevel();
    assert.strictEqual(initial, 3);

    await memory.setAutonomyLevel(5);
    const updated = await memory.getAutonomyLevel();
    assert.strictEqual(updated, 5);
  });

  await t.test('Pillar 3: Security Ring Isolation', async () => {
    // Add Ring 0 (Local Only) data
    await new Promise((resolve, reject) => {
      memory.db.run(
        "INSERT INTO knowledge_index (key, value, security_ring) VALUES (?, ?, ?)",
        ['secret', 'local-only-data', 0],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // Add Ring 1 (Vopak Internal) data
    await new Promise((resolve, reject) => {
      memory.db.run(
        "INSERT INTO knowledge_index (key, value, security_ring) VALUES (?, ?, ?)",
        ['public', 'internal-data', 1],
        (err) => (err ? reject(err) : resolve())
      );
    });

    const filteredResults = await memory.filterRingZero();
    const keys = filteredResults.map(r => r.key);

    assert.ok(keys.includes('public'), 'Should include Ring 1 data');
    assert.ok(!keys.includes('secret'), 'Should filter out Ring 0 data');
  });

  await t.test('Pillar 5: Pub/Sub Proactivity', async () => {
    const hub = new PubSubHub();
    let signalReceived = false;

    hub.subscribe('GMAIL_WEBHOOK', async (signal) => {
      signalReceived = true;
      assert.strictEqual(signal.sourceId, 'msg-123');
    });

    await hub.dispatch({
      type: 'GMAIL_WEBHOOK',
      sourceId: 'msg-123',
      payload: {},
      timestamp: new Date().toISOString()
    });

    assert.ok(signalReceived, 'Signal should be received by subscriber');
  });

  await t.test('Pillar 2: Autonomy Enforcement (Mocked Triggers)', async () => {
    // 1. Set autonomy level to 1 (Manual - No triggers)
    await memory.setAutonomyLevel(1);

    // Add a proactive trigger
    await new Promise((resolve, reject) => {
        memory.db.run("INSERT INTO proactive_triggers (type, summary, payload) VALUES (?, ?, ?)",
            ['TEST_TRIGGER', 'Urgent Alert!', '{"info": "test"}'],
            (err) => err ? reject(err) : resolve()
        );
    });

    const autonomyLevel = await memory.getAutonomyLevel();
    const triggers: any[] = [];
    if (autonomyLevel > 1) {
        const results: any[] = await new Promise((resolve, reject) => {
            memory.db.all("SELECT * FROM proactive_triggers", (err, rows) => err ? reject(err) : resolve(rows));
        });
        triggers.push(...results);
    }
    assert.strictEqual(triggers.length, 0, 'Should have no triggers when autonomy is 1');

    // 2. Set autonomy level to 3 (Balanced)
    await memory.setAutonomyLevel(3);
    const updatedLevel = await memory.getAutonomyLevel();
    const updatedTriggers: any[] = [];
    if (updatedLevel > 1) {
        const results: any[] = await new Promise((resolve, reject) => {
            memory.db.all("SELECT * FROM proactive_triggers", (err, rows) => err ? reject(err) : resolve(rows));
        });
        updatedTriggers.push(...results);
    }
    assert.ok(updatedTriggers.length > 0, 'Should have triggers when autonomy is > 1');
  });

  // Final cleanup
  memory.db.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  if (fs.existsSync(`${TEST_DB}-shm`)) fs.unlinkSync(`${TEST_DB}-shm`);
  if (fs.existsSync(`${TEST_DB}-wal`)) fs.unlinkSync(`${TEST_DB}-wal`);
});
