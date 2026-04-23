import ollama from 'ollama';
import sqlite3 from 'sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { Logger } from './utils/logger.ts';
import { handleError } from './utils/errors.ts';

const logger = new Logger('MemoryClient');

/**
 * V3.0 Memory Client: "The Embedded Knowledge Engine"
 * 
 * Integrated Architecture:
 * - 🛡️ Hermes: 100% Serverless/Embedded via SQLite + FTS5 (Full-Text Search).
 * - 🌊 OpenViking: L0/L1/L2 Tiered Context & 8-Category Extraction.
 * - 🧠 Local Vectors: Embeddings stored in SQLite with Cosine Similarity in JS.
 */
export class MemoryClient {
  public db: sqlite3.Database;
  private embeddingCache = new Map<string, number[]>();
  private isProcessingQueue = false;
  private embeddingQueue: { text: string; resolve: (v: number[]) => void; reject: (e: any) => void }[] = [];

  constructor(dbPath: string = '.gemini/data/memory.db') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) throw handleError(logger, err, 'Failed to connect to SQLite');
      logger.info(`Connected to SQLite (v3.0 Engine) at ${dbPath}`);
    });
    this.initDatabase();
  }

  private initDatabase() {
    this.db.serialize(() => {
      this.db.run('PRAGMA journal_mode=WAL;');

      // 1. Core Relational Tables
      this.db.run(`CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'Active',
        narrative_arc TEXT
      )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS stakeholders (
        email TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT,
        context_notes TEXT
      )`);

      // 2. The Hermes Knowledge Store (SQLite + FTS5)
      // Stores structured facts, 8-category extraction, and vector embeddings
      this.db.run(`CREATE TABLE IF NOT EXISTS knowledge_index (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_str TEXT UNIQUE,
        category TEXT NOT NULL, -- Profile, Preferences, Entities, Events, Cases, Patterns, Tools, Skills
        tier TEXT DEFAULT 'L2', -- L0 (Abstract), L1 (Overview), L2 (Full)
        content TEXT NOT NULL,
        metadata TEXT, -- JSON string
        embedding TEXT, -- JSON array of floats
        project_id TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        confidence_score FLOAT DEFAULT 1.0,
        security_ring INTEGER DEFAULT 2,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`);

      // FTS5 Virtual Table for Instant Text Search
      this.db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
        content,
        category,
        tier,
        content='knowledge_index',
        content_rowid='id'
      )`);

      // Triggers to keep FTS in sync
      this.db.run(`CREATE TRIGGER IF NOT EXISTS knowledge_ai AFTER INSERT ON knowledge_index BEGIN
        INSERT INTO knowledge_fts(rowid, content, category, tier) VALUES (new.id, new.content, new.category, new.tier);
      END`);

      this.db.run(`CREATE TRIGGER IF NOT EXISTS knowledge_ad AFTER DELETE ON knowledge_index BEGIN
        INSERT INTO knowledge_fts(knowledge_fts, rowid, content, category, tier) VALUES('delete', old.id, old.content, old.category, old.tier);
      END`);

      // 3. Analytics & Proactive Layer
      this.db.run(`CREATE TABLE IF NOT EXISTS roi_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT,
        metric_name TEXT,
        value REAL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS proactive_triggers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        summary TEXT NOT NULL,
        payload TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS autonomy_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`);
      this.db.run("INSERT OR IGNORE INTO autonomy_config (key, value) VALUES ('autonomy_level', '3')");
    });
  }

  /**
   * OpenViking Pattern: Extract and categorize a fact into the tiered system
   */
  async remember(id: string, content: string, category: string, tier: string = 'L2', project_id?: string, metadata: any = {}) {
    try {
      const embedding = await this.getEmbedding(content);
      const metadataStr = JSON.stringify(metadata);
      const embeddingStr = JSON.stringify(embedding);

      return new Promise<void>((resolve, reject) => {
        const sql = `INSERT OR REPLACE INTO knowledge_index 
          (id_str, category, tier, content, metadata, embedding, project_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`;
        this.db.run(sql, [id, category, tier, content, metadataStr, embeddingStr, project_id], (err) => {
          if (err) reject(err);
          else {
            logger.info(`🧠 [Remembered] Category: ${category} | Tier: ${tier} | ID: ${id}`);
            resolve();
          }
        });
      });
    } catch (e) {
      throw handleError(logger, e, `Failed to store fact: ${id}`);
    }
  }

  /**
   * Hermes Pattern: Hybrid Recall (FTS5 + Semantic Vector Re-ranking)
   */
  async recall(query: string, nResults: number = 3, category?: string, tier?: string) {
    try {
      // 1. Get query embedding for semantic check
      const queryEmbedding = await this.getEmbedding(query);

      // 2. Perform FTS5 search first (Fastest)
      let sql = `SELECT i.* FROM knowledge_index i 
                 JOIN knowledge_fts f ON i.id = f.rowid 
                 WHERE knowledge_fts MATCH ?`;
      let params: any[] = [query];

      if (category) {
        sql += ` AND i.category = ?`;
        params.push(category);
      }
      
      if (tier) {
        sql += ` AND i.tier = ?`;
        params.push(tier);
      }

      const rows: any[] = await new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      // 3. If no FTS results, or to augment, fetch by category and tier
      if (rows.length < nResults) {
        let fallbackSql = `SELECT * FROM knowledge_index WHERE 1=1`;
        let fallbackParams: any[] = [];
        
        if (category) {
          fallbackSql += ` AND category = ?`;
          fallbackParams.push(category);
        }
        
        if (tier) {
          fallbackSql += ` AND tier = ?`;
          fallbackParams.push(tier);
        }
        
        fallbackSql += ` LIMIT 50`;
        
        const allRows: any[] = await new Promise((resolve, reject) => {
          this.db.all(fallbackSql, fallbackParams, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });
        rows.push(...allRows.filter(r => !rows.find(existing => existing.id === r.id)));
      }

      // 4. Manual Cosine Similarity Re-ranking
      const scoredResults = rows.map(row => {
        const embedding = JSON.parse(row.embedding || '[]');
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        return { ...row, similarity };
      });

      scoredResults.sort((a, b) => b.similarity - a.similarity);
      const topResults = scoredResults.slice(0, nResults);

      return {
        documents: [topResults.map(r => r.content)],
        metadatas: [topResults.map(r => JSON.parse(r.metadata || '{}'))],
        ids: [topResults.map(r => r.id_str)],
        similarities: [topResults.map(r => r.similarity)]
      };

    } catch (e) {
      throw handleError(logger, e, 'Recall failed');
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]) {
    if (!vecA.length || !vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async getEmbedding(text: string): Promise<number[]> {
    if (this.embeddingCache.has(text)) return this.embeddingCache.get(text)!;

    return new Promise((resolve, reject) => {
      this.embeddingQueue.push({ text, resolve, reject });
      this.processEmbeddingQueue();
    });
  }

  private async processEmbeddingQueue() {
    if (this.isProcessingQueue || this.embeddingQueue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.embeddingQueue.length > 0) {
      const { text, resolve, reject } = this.embeddingQueue.shift()!;
      try {
        const response = await ollama.embeddings({
          model: 'nomic-embed-text',
          prompt: text,
        });
        this.embeddingCache.set(text, response.embedding);
        resolve(response.embedding);
      } catch (e) {
        reject(e);
      }
    }
    this.isProcessingQueue = false;
  }

  // Pillar-based helper methods (Backward Compatibility)
  async getAutonomyLevel(): Promise<number> {
    return new Promise((resolve) => {
      this.db.get("SELECT value FROM autonomy_config WHERE key = 'autonomy_level'", (err, row: any) => {
        resolve(parseInt(row?.value || '3', 10));
      });
    });
  }

  async generateGoldenRecord(projectId: string): Promise<string> {
    const rows: any[] = await new Promise((resolve) => {
      this.db.all("SELECT category, content FROM knowledge_index WHERE project_id = ? ORDER BY last_updated DESC LIMIT 10", [projectId], (err, rows) => {
        resolve(rows || []);
      });
    });

    if (rows.length === 0) return `No records found for project ${projectId}.`;

    const summary = rows.map(r => `[${r.category}] ${r.content}`).join('\n---\n');
    return `GOLDEN RECORD: ${projectId}\n\n${summary}\n\n[PROMPT: Summarize the trajectory.]`;
  }
}
