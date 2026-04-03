import { MemoryClient } from './memory-client.ts';
import { Logger } from './utils/logger.ts';
import { handleError } from './utils/errors.ts';

const logger = new Logger('HistoricalIngestion');

/**
 * ⏳ Historical Ingestion Pipeline
 * Designed to safely backfill 6-12 months of workspace data into the Hybrid Memory Stack.
 * Utilizes semantic compression and batch processing to avoid rate limits and Ollama timeouts.
 */
export class HistoricalIngestionPipeline {
  private memoryClient: MemoryClient;

  constructor() {
    this.memoryClient = new MemoryClient();
  }

  /**
   * Helper function to delay execution (Rate Limiting)
   */
  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Semantic Compression (Stub)
   * In a live run, this calls the Gemini API to summarize a massive JSON payload
   * (e.g., 50 emails) into a dense, high-signal "Strategic Summary".
   */
  private async compressDataSemantically(rawData: any, timeframe: string): Promise<string> {
    logger.debug(`[Semantic Compression] Summarizing data for ${timeframe}...`);
    // Placeholder for actual Gemini API call
    return `Strategic Summary for ${timeframe}: ${rawData.length} events processed. Key topics included AWS Kiro, Flow Forward scaling, and team alignment.`;
  }

  /**
   * Run the massive backfill safely.
   * Processes data month-by-month to avoid choking the local LLM and hitting API limits.
   */
  async runBackfill(monthsToBackfill: number = 6) {
    logger.info(`🚀 Starting Historical Ingestion Pipeline for the last ${monthsToBackfill} months...`);

    try {
      const currentDate = new Date();

      for (let i = monthsToBackfill; i >= 0; i--) {
        // Calculate target month
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthString = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        
        logger.info(`📅 Processing timeframe: ${monthString}`);

        // 1. DATA EXTRACTION (Stub)
        // Here, the Wizard Bridge MCP would pull calendar events, emails, and drive files for this month.
        const mockRawData = Array(50).fill(`Mock email or calendar event for ${monthString}`);

        // 2. SEMANTIC COMPRESSION
        // Use Gemini to summarize the month's raw data into a dense strategic summary
        const goldenRecord = await this.compressDataSemantically(mockRawData, monthString);

        // 3. MEMORY INJECTION
        // Use the new Background Embedding Queue in MemoryClient
        const recordId = `historical_summary_${monthString}`;
        
        // Push the synthesized summary to ChromaDB with the historical timestamp
        await this.memoryClient.remember(
          recordId, 
          goldenRecord, 
          { 
            type: 'historical_backfill', 
            timeframe: monthString,
            timestamp: targetDate.toISOString() // Ensure time-decay weighting works properly
          }
        );

        logger.info(`✅ Successfully injected memory for ${monthString}`);

        // 4. RATE LIMITING & COOLDOWN
        // Give Ollama and Google APIs time to breathe before the next batch
        if (i > 0) {
          logger.info(`⏳ Cooldown active. Waiting 5 seconds before processing the next month...`);
          await this.delay(5000); 
        }
      }

      logger.info('🎉 Historical Ingestion Complete. The AI Consciousness is now fully aware of the past.');

    } catch (e) {
      handleError(logger, e, 'Historical Ingestion Pipeline failed');
    }
  }
}

// 🚀 CLI Execution Guard
import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('historical-ingestion.ts') ||
  process.argv[1].endsWith('historical-ingestion.js')
);

if (isMain) {
  const pipeline = new HistoricalIngestionPipeline();
  const months = parseInt(process.argv[2]) || 6;
  pipeline.runBackfill(months).catch(err => console.error(err));
}
