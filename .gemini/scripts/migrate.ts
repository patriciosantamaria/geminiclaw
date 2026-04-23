import { MemoryClient } from '../core/memory-client.ts';
import sqlite3 from 'sqlite3';

async function migrate() {
  console.log('Starting migration...');
  const tempDb = new sqlite3.Database('.gemini/data/memory.db');
  
  await new Promise<void>((resolve, reject) => {
    tempDb.serialize(() => {
      // DROP triggers first to prevent schema errors during ALTER TABLE
      tempDb.run('DROP TRIGGER IF EXISTS knowledge_ai');
      tempDb.run('DROP TRIGGER IF EXISTS knowledge_ad');
      tempDb.run('DROP TABLE IF EXISTS knowledge_fts');
      
      // Now rename the table
      tempDb.run('ALTER TABLE knowledge_index RENAME TO knowledge_index_old', (err) => {
        if (err && !err.message.includes('no such table')) {
          console.error('Rename error:', err);
        }
      });
    });
    tempDb.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log('Old tables moved. Initializing new schema...');
  const client = new MemoryClient('.gemini/data/memory.db');
  
  // Wait for initDatabase to finish
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('Migrating old data directly with SQL...');
  const migrateDb = new sqlite3.Database('.gemini/data/memory.db');
  const rows: any[] = await new Promise((resolve) => {
    migrateDb.all('SELECT * FROM knowledge_index_old', (err, rows) => {
      if (err) console.error('Select error:', err);
      resolve(rows || []);
    });
  });

  for (const row of rows) {
    if (row.key && row.value) {
      const idStr = row.key.replace(/[^a-zA-Z0-0]/g, '_').toLowerCase();
      const content = row.value;
      const category = 'Legacy'; 
      const tier = 'L2';
      const metadataStr = JSON.stringify({
        source_id: row.source_id,
        original_key: row.key,
        migrated_from: 'v2',
        confidence_score: row.confidence_score
      });
      const dummyEmbedding = JSON.stringify(new Array(768).fill(0));
      
      await new Promise<void>((resolve, reject) => {
        const sql = `INSERT OR REPLACE INTO knowledge_index 
          (id_str, category, tier, content, metadata, embedding, project_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`;
        migrateDb.run(sql, [idStr, category, tier, content, metadataStr, dummyEmbedding, row.project_id || null], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log(`Migrated: ${row.key}`);
    }
  }
  
  await new Promise<void>((resolve) => {
    migrateDb.run('DROP TABLE IF EXISTS knowledge_index_old', () => {
      migrateDb.close(() => resolve());
    });
  });
  
  console.log('Migration complete.');
}

migrate().catch(console.error);