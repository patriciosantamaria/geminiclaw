import { ChromaClient } from 'chromadb';
import ollama from 'ollama';

/**
 * Ultimate Assistant Memory Client
 * Interfaces with local Ollama (embeddings) and ChromaDB (vector storage).
 */
export class MemoryClient {
  private chroma: ChromaClient;
  private collectionName = 'vopak_assistant_memory';

  constructor() {
    this.chroma = new ChromaClient({ path: 'http://localhost:8000' });
  }

  /**
   * Turn text into a vector using local Ollama model
   */
  async getEmbedding(text: string): Promise<number[]> {
    const response = await ollama.embeddings({
      model: 'nomic-embed-text',
      prompt: text,
    });
    return response.embedding;
  }

  /**
   * Save a fact to local vector memory
   */
  async remember(id: string, text: string, metadata: any = {}) {
    const embedding = await this.getEmbedding(text);
    const collection = await this.chroma.getOrCreateCollection({ name: this.collectionName });
    
    await collection.add({
      ids: [id],
      embeddings: [embedding],
      metadatas: [metadata],
      documents: [text],
    });
    console.log(`Stored fact: ${id}`);
  }

  /**
   * Query local memory semantically
   */
  async recall(query: string, nResults: number = 3) {
    const queryEmbedding = await this.getEmbedding(query);
    const collection = await this.chroma.getCollection({ name: this.collectionName });
    
    return await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults,
    });
  }
}
