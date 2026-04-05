import fs from 'node:fs';
import path from 'node:path';
import { MemoryClient } from './memory-client.js';
import { Logger } from './utils/logger.js';
import { handleError } from './utils/errors.js';

const logger = new Logger('CommitmentEngine');

export class CommitmentEngine {
  private memory: MemoryClient;
  private commitmentPatterns = [
    /i will (look into|check|follow up|send|update|prepare|draft|review)/i,
    /plan to (execute|implement|schedule|meet|discuss|finalize)/i,
    /need to (respond|action|complete|verify)/i,
    /action item:?\s*(.*)/i,
    /commitment:?\s*(.*)/i
  ];

  constructor(memory: MemoryClient) {
    this.memory = memory;
  }

  /**
   * 🦅 Parse a text block for potential 'soft commitments'
   */
  public extractCommitments(text: string): string[] {
    const lines = text.split(/\n|\. /);
    const commitments: string[] = [];

    for (const line of lines) {
      for (const pattern of this.commitmentPatterns) {
        if (pattern.test(line)) {
          commitments.push(line.trim());
          break;
        }
      }
    }

    return [...new Set(commitments)];
  }

  /**
   * 🏛️ Process the latest briefing and persist commitments
   */
  public async processLatestBriefing(briefingPath: string = '.gemini/briefings/latest_brief.json'): Promise<number> {
    try {
      if (!fs.existsSync(briefingPath)) {
        logger.warn(`Briefing file not found at ${briefingPath}`);
        return 0;
      }

      const data = JSON.parse(fs.readFileSync(briefingPath, 'utf-8'));
      const text = data.response || '';

      const extracted = this.extractCommitments(text);
      logger.info(`Extracted ${extracted.length} potential commitments from briefing.`);

      for (const commitment of extracted) {
        await this.persistCommitment(commitment, 'latest_briefing');
      }

      return extracted.length;
    } catch (e) {
      throw handleError(logger, e, 'Failed to process briefing for commitments');
    }
  }

  /**
   * 💾 Persist commitment to SQLite knowledge_index
   */
  private async persistCommitment(text: string, sourceId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO knowledge_index (key, value, source_id, type, tag, confidence_score)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      this.memory.db.run(query, ['COMMITMENT', text, sourceId, 'COMMITMENT', 'URGENCY', 1.0], (err) => {
        if (err) {
          logger.error('Failed to persist commitment', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 📋 Retrieve active commitments for the morning briefing
   */
  public async getActiveCommitments(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT value, last_updated FROM knowledge_index
        WHERE type = 'COMMITMENT'
        ORDER BY last_updated DESC
        LIMIT 5
      `;
      this.memory.db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}
