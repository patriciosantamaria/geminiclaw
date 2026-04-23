
import { MemoryClient } from './memory-client.ts';
import fs from 'fs';
import { Logger } from './utils/logger';
import { handleError } from './utils/errors';

const logger = new Logger('IndexBranding');

async function indexBranding() {
  try {
    const memory = new MemoryClient();
    const brandingPath = '../configs/BRANDING.md';
    if (!fs.existsSync(brandingPath)) {
        logger.warn(`Branding file not found at ${brandingPath}, skipping indexing.`);
        return;
    }
    const brandingContent = fs.readFileSync(brandingPath, 'utf-8');

    logger.info('🧠 Indexing Vopak Branding v3.0 into Embedded Knowledge Engine...');

    await memory.remember(
      'vopak_branding_v3',
      brandingContent,
      'Patterns',
      'L2',
      'branding-init',
      {
        type: 'branding_standard',
        version: '3.0',
        source: 'Vopak Brand guidelines version 3.0.pdf'
      }
    );

    logger.info('✅ Branding successfully indexed.');
  } catch (error) {
    handleError(logger, error, 'Branding indexing failed');
  }
}

indexBranding().catch(err => {
    // If it reaches here it's likely already been logged by handleError, but we make sure.
    if (!(err instanceof GeminiClawError)) {
      logger.error(`Critical error during branding indexing: ${err.message}`);
    }
});
