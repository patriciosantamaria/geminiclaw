const { ChromaClient } = require('chromadb');
const axios = require('axios');
const fs = require('fs');

async function getEmbedding(text) {
  const response = await axios.post('http://localhost:11434/api/embeddings', {
    model: 'nomic-embed-text',
    prompt: text,
  });
  return response.data.embedding;
}

async function indexBranding() {
  const chroma = new ChromaClient({ path: 'http://localhost:8000' });
  const brandingContent = fs.readFileSync('/home/patosoto/geminiclaw/.agent/BRANDING.md', 'utf-8');
  const embedding = await getEmbedding(brandingContent);
  
  const collection = await chroma.getOrCreateCollection({ name: 'vopak_assistant_memory' });
  
  await collection.add({
    ids: ['vopak_branding_v3'],
    embeddings: [embedding],
    metadatas: [{ type: 'branding_standard', version: '3.0' }],
    documents: [brandingContent],
  });
  
  console.log('✅ Vopak Branding v3.0 indexed into ChromaDB via Ollama.');
}

indexBranding().catch(console.error);
