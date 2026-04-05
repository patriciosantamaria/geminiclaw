import { Janitor } from './janitor.ts';
import { MemoryClient } from './memory-client.ts';
import { Logger } from './utils/logger.ts';

const logger = new Logger('SleepCycle');

/**
 * 😴 Sleep Cycle
 * Pillar 4: Circadian Maintenance.
 * Orchestrates maintenance tasks during low-activity windows.
 */
export class SleepCycle {
  private janitor: Janitor;

  constructor(memoryClient: MemoryClient) {
    this.janitor = new Janitor(memoryClient);
  }

  /**
   * Run the full circadian maintenance cycle.
   * Includes vacuuming, purging old records, and deduplication.
   */
  async runMaintenanceCycle(): Promise<void> {
    logger.info('Starting Sleep Cycle maintenance...');
    try {
      // 1. Run all Janitor tasks
      await this.janitor.runAll();

      // 2. Additional optimizations can be added here
      logger.info('Sleep Cycle maintenance complete.');
    } catch (e) {
      logger.error('Sleep Cycle maintenance failed', e);
    }
  }

  /**
   * Check if the agent is currently in a "Sleep" window (02:00 - 04:00).
   */
  isSleepWindow(): boolean {
    const hour = new Date().getHours();
    return hour >= 2 && hour < 4;
  }

  /**
   * Pillar 4: Circadian Maintenance Cycle Trigger.
   * Starts a background loop that checks for the sleep window every hour.
   */
  startCircadianLoop(): void {
    logger.info('Circadian Loop started. Will check for sleep window hourly.');
    setInterval(async () => {
      if (this.isSleepWindow()) {
        logger.info('Sleep window detected (02:00-04:00). Initiating maintenance...');
        await this.runMaintenanceCycle();
      }
    }, 60 * 60 * 1000); // 1 hour check
  }
}
