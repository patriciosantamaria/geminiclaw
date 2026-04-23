import { MemoryClient } from './memory-client.ts';
import { Logger } from './utils/logger.ts';

const logger = new Logger('ReportGenerator');

async function generateAnnualReport() {
  try {
    const memory = new MemoryClient();
    
    // Fetch all historical backfill records
    const results: any[] = await new Promise((resolve, reject) => {
      memory.db.all("SELECT content, metadata FROM knowledge_index WHERE json_extract(metadata, '$.type') = 'historical_backfill'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    if (results.length === 0) {
      console.log("No historical records found in the database.");
      return;
    }

    console.log("==================================================");
    console.log("📅 12-MONTH STRATEGIC RETROSPECTIVE (VOPAK AI)");
    console.log("==================================================\n");

    // Sort results by timeframe (chronological)
    const records = results.map((row) => {
      const metadata = JSON.parse(row.metadata || '{}');
      return {
        timeframe: metadata.timeframe,
        summary: row.content,
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
