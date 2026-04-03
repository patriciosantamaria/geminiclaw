
import { MemoryClient } from './memory-client.ts';
import fs from 'fs';

async function indexBranding() {
  const memory = new MemoryClient();
  const brandingContent = fs.readFileSync('../configs/BRANDING.md', 'utf-8');
  
  console.log('🧠 Indexing Vopak Branding v3.0 into ChromaDB...');
  
  await memory.remember(
    'vopak_branding_v3',
    brandingContent,
    { 
      type: 'branding_standard', 
      version: '3.0', 
      source: 'Vopak Brand guidelines version 3.0.pdf' 
    }
  );
  
  console.log('✅ Branding successfully indexed.');
}

indexBranding().catch(console.error);
