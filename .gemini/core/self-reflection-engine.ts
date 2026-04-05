import { MemoryClient } from './memory-client.js';
import { Logger } from './utils/logger.js';
import { handleError } from './utils/errors.js';
import fs from 'node:fs';

const logger = new Logger('SelfReflectionEngine');

export class SelfReflectionEngine {
  private memory: MemoryClient;
  private readonly LESSONS_COLLECTION = 'vopak_lessons_learned';

  constructor(memory: MemoryClient) {
    this.memory = memory;
  }

  /**
   * 🌙 Automated Sleep Cycle: Distill daily interactions into lessons
   */
  public async performSleepCycle(): Promise<void> {
    logger.info('Starting automated Sleep Cycle distillation...');
    try {
      // 1. Fetch recent interaction outcomes from SQLite
      const interactions = await this.getRecentInteractions();

      if (interactions.length === 0) {
        logger.info('No new interactions to distill.');
        return;
      }

      // 2. Synthesize 'Lessons Learned' (In a real scenario, this would use an LLM)
      // For the architectural upgrade, we implement the structure to store these.
      for (const interaction of interactions) {
        const lessonId = `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const lessonText = `Lesson from interaction: ${interaction.summary}`;

        await this.memory.remember(
          lessonId,
          lessonText,
          {
            type: 'LESSON_LEARNED',
            original_interaction_id: interaction.id,
            timestamp: new Date().toISOString()
          },
          this.LESSONS_COLLECTION
        );
      }

      logger.info(`Sleep Cycle complete. Distilled ${interactions.length} lessons into ChromaDB.`);
    } catch (e) {
      throw handleError(logger, e, 'Sleep Cycle failed');
    }
  }

  private async getRecentInteractions(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // Logic to pull from proactive_triggers or a new 'logs' table if it existed
      const query = "SELECT * FROM proactive_triggers WHERE timestamp > date('now', '-1 day')";
      this.memory.db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}
