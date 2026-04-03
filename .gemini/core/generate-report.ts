import { MemoryClient } from './memory-client.ts';
import { Logger } from './utils/logger.ts';

const logger = new Logger('ReportGenerator');

async function generateAnnualReport() {
  try {
    const memory = new MemoryClient();
    const collection = await memory.chroma.getCollection({ name: memory.defaultCollection });
    
    // Fetch all historical backfill records
    const results = await collection.get({
      where: { type: 'historical_backfill' }
    });

    if (!results || !results.documents || results.documents.length === 0) {
      console.log("No historical records found in the database.");
      return;
    }

    console.log("==================================================");
    console.log("📅 12-MONTH STRATEGIC RETROSPECTIVE (VOPAK AI)");
    console.log("==================================================\n");

    // Sort results by timeframe (chronological)
    const records = results.documents.map((doc, index) => {
      const metadata = results.metadatas![index] as any;
      return {
        timeframe: metadata.timeframe,
        summary: doc,
        timestamp: metadata.timestamp
      };
    });

    records.sort((a, b) => a.timeframe.localeCompare(b.timeframe));

    for (const record of records) {
      console.log(`📌 Month: ${record.timeframe}`);
      console.log(`   ${record.summary}\n`);
    }

    console.log("==================================================");
    console.log(`Total Months Processed: ${records.length}`);
    console.log("==================================================");

  } catch (error) {
    logger.error('Failed to generate report', error);
  }
}

generateAnnualReport();
