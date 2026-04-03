import { ChromaClient } from 'chromadb';
import ollama from 'ollama';
import { Logger } from './utils/logger';
import { handleError } from './utils/errors';

const logger = new Logger('MemoryClient');

/**
 * Ultimate Assistant Memory Client
 * Interfaces with local Ollama (embeddings) and ChromaDB (vector storage).
 */
export class MemoryClient {
  private chroma: ChromaClient;
  private collectionName = 'vopak_assistant_memory';
  private embeddingCache = new Map<string, number[]>();

  constructor() {
    this.chroma = new ChromaClient({ path: 'http://localhost:8000' });
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
