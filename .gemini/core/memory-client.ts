import { ChromaClient } from 'chromadb';
import ollama from 'ollama';
import sqlite3 from 'sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { Logger } from './utils/logger.ts';
import { handleError } from './utils/errors.ts';

const logger = new Logger('MemoryClient');

/**
 * Ultimate Assistant Memory Client
 * Interfaces with local Ollama (embeddings), ChromaDB (vector storage), and SQLite (structured storage).
 */
export class MemoryClient {
  public chroma: ChromaClient;
  public collectionName = 'vopak_assistant_memory';
  private embeddingCache = new Map<string, number[]>();
  public db: sqlite3.Database;

  constructor(dbPath: string = '.gemini/data/memory.db') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.chroma = new ChromaClient({ path: 'http://localhost:8000' });
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        throw handleError(logger, err, 'Failed to connect to SQLite');
      }
      logger.info(`Connected to SQLite at ${dbPath}`);
    });
    this.initDatabase();
  }

  /**
   * Initialize tables and perform schema evolution
   */
  private initDatabase() {
    this.db.serialize(() => {
      // Enable WAL mode for better concurrency
      this.db.run('PRAGMA journal_mode=WAL;', (err) => {
        if (err) logger.error('Failed to enable WAL mode', err);
      });

      // Create base tables if they don't exist
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

      // Ensure knowledge_index exists and evolve schema
      this.db.run(`CREATE TABLE IF NOT EXISTS knowledge_index (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        source_id TEXT,
        project_id TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        time_saved_minutes INTEGER DEFAULT 0,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`);

      // Add confidence_score column if it doesn't exist
      this.db.all("PRAGMA table_info(knowledge_index)", (err, rows: any[]) => {
        if (err) {
          logger.error('Failed to query table info for knowledge_index', err);
          return;
        }
        const hasConfidenceScore = rows && rows.some(row => row.name === 'confidence_score');
        if (!hasConfidenceScore) {
          this.db.run("ALTER TABLE knowledge_index ADD COLUMN confidence_score FLOAT DEFAULT 1.0", (err) => {
            if (err) logger.error('Failed to add confidence_score column', err);
            else logger.info('Added confidence_score column to knowledge_index');
          });
        }
      });

      // ROI Metrics table
      this.db.run(`CREATE TABLE IF NOT EXISTS roi_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT,
        metric_name TEXT,
        value REAL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`);

      // Stakeholder Preferences table
      this.db.run(`CREATE TABLE IF NOT EXISTS stakeholder_preferences (
        stakeholder_email TEXT,
        preference_key TEXT,
        preference_value TEXT,
        PRIMARY KEY (stakeholder_email, preference_key),
        FOREIGN KEY(stakeholder_email) REFERENCES stakeholders(email)
      )`);

      // Entity Linkage table (Stakeholders to Projects)
      this.db.run(`CREATE TABLE IF NOT EXISTS entity_links (
        stakeholder_email TEXT,
        project_id TEXT,
        PRIMARY KEY (stakeholder_email, project_id),
        FOREIGN KEY(stakeholder_email) REFERENCES stakeholders(email),
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`);
    });
  }

  /**
   * Run a vacuum command to compress the database
   */
  async vacuum(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('VACUUM', (err) => {
        if (err) {
          logger.error('Vacuum failed', err);
          reject(err);
        } else {
          logger.info('Database vacuumed successfully');
          resolve();
        }
      });
    });
  }

  /**
   * Turn text into a vector using local Ollama model with in-memory caching
   */
  async getEmbedding(text: string): Promise<number[]> {
    try {
      if (this.embeddingCache.has(text)) {
        logger.debug('⚡ Using cached embedding');
        return this.embeddingCache.get(text)!;
      }

      const response = await ollama.embeddings({
        model: 'nomic-embed-text',
        prompt: text,
      });

      this.embeddingCache.set(text, response.embedding);
      return response.embedding;
    } catch (e) {
      throw handleError(logger, e, 'Failed to get embedding');
    }
  }

  /**
   * Save a fact to local vector memory
   */
  async remember(id: string, text: string, metadata: any = {}) {
    try {
      const embedding = await this.getEmbedding(text);
      const collection = await this.chroma.getOrCreateCollection({ name: this.collectionName });

      await collection.add({
        ids: [id],
        embeddings: [embedding],
        metadatas: [metadata],
        documents: [text],
      });
      logger.info(`Stored fact: ${id}`);
    } catch (e) {
      throw handleError(logger, e, `Failed to store fact: ${id}`);
    }
  }

  /**
   * Query local memory semantically
   */
  async recall(query: string, nResults: number = 3) {
    try {
      const queryEmbedding = await this.getEmbedding(query);
      const collection = await this.chroma.getCollection({ name: this.collectionName });

      return await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults,
      });
    } catch (e) {
      throw handleError(logger, e, 'Recall failed');
    }
  }
}
