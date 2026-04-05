import { ChromaClient, Collection } from 'chromadb';
import ollama from 'ollama';
import sqlite3 from 'sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Logger } from './utils/logger.ts';
import { handleError } from './utils/errors.ts';

const logger = new Logger('MemoryClient');

/**
 * Ultimate Assistant Memory Client
 * Interfaces with local Ollama (embeddings), ChromaDB (vector storage), and SQLite (structured storage).
 */
export class MemoryClient {
  public chroma: ChromaClient;
  public defaultCollection: string;
  private embeddingCache = new Map<string, number[]>();
  private embeddingCacheKeys: string[] = [];
  private readonly CACHE_LIMIT = 1000;
  private embeddingQueue: { text: string; resolve: (v: number[]) => void; reject: (e: any) => void }[] = [];
  private isProcessingQueue = false;
  private collectionCache = new Map<string, Collection>();
  public db: sqlite3.Database;

  constructor(
    dbPath: string = '.gemini/data/memory.db',
    defaultCollection: string = 'vopak_general'
  ) {
    this.defaultCollection = defaultCollection;
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
        type TEXT,
        tag TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        time_saved_minutes INTEGER DEFAULT 0,
        confidence_score FLOAT DEFAULT 1.0,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`);

      // Ensure type, tag, and confidence_score columns exist if table was already created
      this.db.all("PRAGMA table_info(knowledge_index)", (err, rows: any[]) => {
        if (err) {
          logger.error('Failed to query table info for knowledge_index', err);
          return;
        }
        const columns = rows.map(row => row.name);

        if (!columns.includes('type')) {
          this.db.run("ALTER TABLE knowledge_index ADD COLUMN type TEXT", (err) => {
            if (err) logger.error('Failed to add type column to knowledge_index', err);
          });
        }
        if (!columns.includes('tag')) {
          this.db.run("ALTER TABLE knowledge_index ADD COLUMN tag TEXT", (err) => {
            if (err) logger.error('Failed to add tag column to knowledge_index', err);
          });
        }
        if (!columns.includes('confidence_score')) {
          this.db.run("ALTER TABLE knowledge_index ADD COLUMN confidence_score FLOAT DEFAULT 1.0", (err) => {
            if (err) logger.error('Failed to add confidence_score column to knowledge_index', err);
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

      // Proactive Triggers table
      this.db.run(`CREATE TABLE IF NOT EXISTS proactive_triggers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        source_id TEXT,
        summary TEXT NOT NULL,
        payload TEXT,
        confidence FLOAT DEFAULT 1.0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
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
   * Process the embedding queue in parallel batches
   */
  private async processEmbeddingQueue() {
    if (this.isProcessingQueue || this.embeddingQueue.length === 0) return;
    this.isProcessingQueue = true;

    const BATCH_SIZE = 5;

    while (this.embeddingQueue.length > 0) {
      const batch = this.embeddingQueue.splice(0, BATCH_SIZE);

      await Promise.all(batch.map(async ({ text, resolve, reject }) => {
        try {
          // Double check cache in case it was added while in queue
          if (this.embeddingCache.has(text)) {
            // Update LRU position
            this.updateCache(text, this.embeddingCache.get(text)!);
            resolve(this.embeddingCache.get(text)!);
            return;
          }

          const response = await ollama.embeddings({
            model: 'nomic-embed-text',
            prompt: text,
          });

          this.updateCache(text, response.embedding);
          resolve(response.embedding);
        } catch (e) {
          reject(handleError(logger, e, 'Failed to get embedding from background queue'));
        }
      }));
    }

    this.isProcessingQueue = false;
  }

  /**
   * Update embedding cache with LRU policy
   */
  private updateCache(text: string, embedding: number[]) {
    if (this.embeddingCache.has(text)) {
      // Remove from keys to re-add at the end
      this.embeddingCacheKeys = this.embeddingCacheKeys.filter(k => k !== text);
    } else if (this.embeddingCacheKeys.length >= this.CACHE_LIMIT) {
      // Remove oldest
      const oldest = this.embeddingCacheKeys.shift();
      if (oldest) this.embeddingCache.delete(oldest);
    }

    this.embeddingCache.set(text, embedding);
    this.embeddingCacheKeys.push(text);
  }

  private async getCollection(name: string): Promise<Collection> {
    if (this.collectionCache.has(name)) {
      return this.collectionCache.get(name)!;
    }
    const collection = await this.chroma.getCollection({ name });
    this.collectionCache.set(name, collection);
    return collection;
  }


  /**
   * Query local memory semantically with Time-Decay Weighting
   */
  async recall(query: string, nResults: number = 3, collectionName?: string) {
    const startTime = performance.now();
    try {
      const targetCollection = collectionName || this.defaultCollection;
      const queryEmbedding = await this.getEmbedding(query);
      const collection = await this.getCollection(targetCollection);

      // Fetch 2x results to allow for re-ranking
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: nResults * 2,
      });

      if (!results || !results.distances || results.distances[0].length === 0) {
        return results;
      }

      // Re-rank based on recency bias
      const now = new Date().getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      const scoredResults = results.distances[0].map((distance, index) => {
        const metadata = results.metadatas![0][index] as any;
        const timestamp = metadata?.timestamp ? new Date(metadata.timestamp).getTime() : now;
        const age = now - timestamp;

        // Semantic score (lower distance is better)
        let score = distance;

        // Apply recency boost: if newer than 30 days, reduce the "distance" (improve score)
        // A simple linear boost up to 20% improvement for brand new content
        if (age < thirtyDaysMs) {
          const recencyFactor = 1 - (age / thirtyDaysMs);
          score = score * (1 - (0.2 * recencyFactor));
        }

        return {
          id: results.ids[0][index],
          document: results.documents![0][index],
          metadata,
          distance,
          score
        };
      });

      // Sort by boosted score
      scoredResults.sort((a, b) => a.score - b.score);

      // Return top nResults in the expected format
      const topResults = scoredResults.slice(0, nResults);

      const duration = performance.now() - startTime;
      logger.info(`Recall completed in ${duration.toFixed(2)}ms`);

      return {
        ids: [topResults.map(r => r.id)],
        distances: [topResults.map(r => r.distance)], // Keeping original distance here
        metadatas: [topResults.map(r => r.metadata)],
        documents: [topResults.map(r => r.document)],
      } as any;

    } catch (e) {
      throw handleError(logger, e, 'Recall failed');
    }
  }

  /**
   * Retrieve all associated stakeholders for a project using relational mapping
   */
  async getExecutivesForProject(projectId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT s.* FROM stakeholders s
        JOIN entity_links el ON s.email = el.stakeholder_email
        WHERE el.project_id = ?
      `;
      this.db.all(query, [projectId], (err, rows) => {
        if (err) {
          logger.error(`Failed to get executives for project: ${projectId}`, err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Multi-modal support: Get embedding for an image (STUB)
   */
  async getEmbedding(text: string): Promise<number[]>;
  async getEmbedding(textOrPath: string, isImage: boolean): Promise<number[]>;
  async getEmbedding(textOrPath: string, isImage: boolean = false): Promise<number[]> {
    const startTime = performance.now();
    if (isImage) {
      logger.info(`Multi-modal stub: Requesting embedding for image ${textOrPath}`);
      return Array(768).fill(0);
    }

    if (this.embeddingCache.has(textOrPath)) {
      logger.debug('⚡ Using cached embedding');
      // Update LRU position
      const embedding = this.embeddingCache.get(textOrPath)!;
      this.updateCache(textOrPath, embedding);
      return embedding;
    }

    const result = await new Promise<number[]>((resolve, reject) => {
      this.embeddingQueue.push({ text: textOrPath, resolve, reject });
      this.processEmbeddingQueue();
    });

    const duration = performance.now() - startTime;
    logger.debug(`Embedding retrieved in ${duration.toFixed(2)}ms`);
    return result;
  }

  /**
   * Save a fact to local vector memory (Overloaded for multi-modal support)
   */
  async remember(id: string, text: string, metadata?: any, collectionName?: string): Promise<void>;
  async remember(id: string, path: string, metadata: any, collectionName: string, isImage: boolean): Promise<void>;
  async remember(id: string, textOrPath: string, metadata: any = {}, collectionName?: string, isImage: boolean = false) {
    const startTime = performance.now();
    try {
      const targetCollection = collectionName || this.defaultCollection;
      const embedding = await this.getEmbedding(textOrPath, isImage);

      let collection: Collection;
      if (this.collectionCache.has(targetCollection)) {
        collection = this.collectionCache.get(targetCollection)!;
      } else {
        collection = await this.chroma.getOrCreateCollection({ name: targetCollection });
        this.collectionCache.set(targetCollection, collection);
      }

      // Inject timestamp for time-decay weighting
      const enrichedMetadata = {
        ...metadata,
        timestamp: metadata.timestamp || new Date().toISOString(),
      };

      await collection.add({
        ids: [id],
        embeddings: [embedding],
        metadatas: [enrichedMetadata],
        documents: [isImage ? `image_path: ${textOrPath}` : textOrPath],
      });

      const duration = performance.now() - startTime;
      logger.info(`Stored ${isImage ? 'image' : 'fact'}: ${id} in ${duration.toFixed(2)}ms`);
    } catch (e) {
      throw handleError(logger, e, `Failed to store ${isImage ? 'image' : 'fact'}: ${id}`);
    }
  }

  /**
   * Pipeline method to generate a "Golden Record" summary of a project's history.
   * Now incorporates proactive triggers for higher situational awareness.
   */
  async generateGoldenRecord(projectId: string): Promise<string> {
    try {
      const collection = await this.chroma.getCollection({ name: this.defaultCollection });

      // 1. Get historical vector records
      const vectorResults = await collection.get({
        where: { project_id: projectId }
      });

      // 2. Get recent proactive triggers
      const triggers: any[] = await new Promise((resolve, reject) => {
        this.db.all(
          "SELECT * FROM proactive_triggers WHERE timestamp > date('now', '-7 days') ORDER BY timestamp DESC",
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      const history = vectorResults?.documents?.join('\n---\n') || 'No historical vector records found.';
      const triggerSummary = triggers.length > 0
        ? triggers.map(t => `[${t.type}] ${t.summary} (Conf: ${t.confidence})`).join('\n')
        : 'No recent proactive triggers.';

      // Return a synthesized context for LLM summarization
      return `
GOLDEN RECORD CONTEXT - PROJECT: ${projectId}

HISTORICAL RECORDS:
${history}

RECENT PROACTIVE TRIGGERS (7 DAYS):
${triggerSummary}

[PROMPT: Synthesize the above trajectory and recent triggers. Identify key pivots, urgent risks, and recommended proactive actions.]
      `.trim();
    } catch (e) {
      logger.error(`Golden Record generation failed for ${projectId}`, e);
      return `Failed to generate golden record for project ${projectId}.`;
    }
  }
}
