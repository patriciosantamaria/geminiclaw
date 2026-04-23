/**
 * 😴 Sleep Cycle Entry Point
 * Orchestrates nightly system maintenance.
 */
import { MemoryClient } from './memory-client.ts';
import { SleepCycle } from './sleep-cycle.ts';
import { Logger } from './utils/logger.ts';

const logger = new Logger('SleepCycleRunner');

async function main() {
  logger.info('🦅 Initiating Manual Sleep Cycle Trigger...');
  const memory = new MemoryClient();
  const cycle = new SleepCycle(memory);
  
  await cycle.runMaintenanceCycle();
  
  logger.info('✅ Sleep Cycle successfully completed.');
  process.exit(0);
}

main().catch(err => {
  logger.error('❌ Sleep Cycle Runner failed', err);
  process.exit(1);
});
