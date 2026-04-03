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
  public defaultCollection: string;
  private embeddingCache = new Map<string, number[]>();
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
  async remember(id: string, text: string, metadata: any = {}, collectionName?: string) {
    try {
      const targetCollection = collectionName || this.defaultCollection;
      const embedding = await this.getEmbedding(text);
      const collection = await this.chroma.getOrCreateCollection({ name: targetCollection });

      // Inject timestamp for time-decay weighting
      const enrichedMetadata = {
        ...metadata,
        timestamp: metadata.timestamp || new Date().toISOString(),
      };

      await collection.add({
        ids: [id],
        embeddings: [embedding],
        metadatas: [enrichedMetadata],
        documents: [text],
      });
      logger.info(`Stored fact: ${id}`);
    } catch (e) {
      throw handleError(logger, e, `Failed to store fact: ${id}`);
    }
  }

  /**
   * Query local memory semantically with Time-Decay Weighting
   */
  async recall(query: string, nResults: number = 3, collectionName?: string) {
    try {
      const targetCollection = collectionName || this.defaultCollection;
      const queryEmbedding = await this.getEmbedding(query);
      const collection = await this.chroma.getCollection({ name: targetCollection });

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
   * Pipeline method to generate a "Golden Record" summary of a project's history
   */
  async generateGoldenRecord(projectId: string): Promise<string> {
    try {
      const collection = await this.chroma.getCollection({ name: this.defaultCollection });

      // Get all documents for this project from Chroma
      const results = await collection.get({
        where: { project_id: projectId }
      });

      if (!results || !results.documents || results.documents.length === 0) {
        return `No historical records found for project ${projectId}.`;
      }

      // Prepare documents for summarization
      const history = results.documents.join('\n---\n');

      // Return a stubbed prompt/context for LLM summarization
      return `GOLDEN RECORD CONTEXT - PROJECT: ${projectId}\n\nRECORDS:\n${history}\n\n[PROMPT: Summarize the above trajectory, identifying key pivots and outcomes.]`;
    } catch (e) {
      logger.error(`Golden Record generation failed for ${projectId}`, e);
      return `Failed to generate golden record for project ${projectId}.`;
    }
  }
}
