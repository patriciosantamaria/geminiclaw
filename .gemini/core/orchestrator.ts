import { MemoryClient } from './memory-client.js';
import { CommitmentEngine } from './commitment-engine.js';
import { SelfReflectionEngine } from './self-reflection-engine.js';
import { PubSubListener } from './pubsub-listener.js';
import { Logger } from './utils/logger.js';

const logger = new Logger('Orchestrator');

/**
 * 🦅 GeminiClaw V5.0 Central Orchestrator
 * Wires up the core engines for the Digital Chief of Staff model.
 */
export class Orchestrator {
  private memory: MemoryClient;
  private commitmentEngine: CommitmentEngine;
  private reflectionEngine: SelfReflectionEngine;
  private pubsubListener: PubSubListener;

  constructor() {
    this.memory = new MemoryClient();
    this.commitmentEngine = new CommitmentEngine(this.memory);
    this.reflectionEngine = new SelfReflectionEngine(this.memory);
    this.pubsubListener = new PubSubListener();
  }

  /**
   * 🚀 Start the Digital Chief of Staff ambient services
   */
  public async start() {
    logger.info('Initializing GeminiClaw V5.0 Digital Chief of Staff services...');

    // 1. Start Pub/Sub Listener for ambient awareness
    try {
      this.pubsubListener.startListening();
      logger.info('Ambient awareness (Pub/Sub) active.');
    } catch (e) {
      logger.warn('Pub/Sub listener failed to start. Ambient awareness disabled.');
    }

    // 2. Schedule Commitment Tracking (triggered after briefings)
    // In a live system, this would be hooked into the briefing lifecycle.

    logger.info('GeminiClaw V5.0 Orchestrator started successfully.');
  }

  /**
   * 🌙 Trigger the nightly Sleep Cycle
   */
  public async runNightlyMaintenance() {
    logger.info('Triggering nightly Reflective Sleep Cycle...');
    await this.reflectionEngine.performSleepCycle();
    await this.memory.vacuum();
    logger.info('Nightly maintenance complete.');
  }
}

// CLI entry point for the orchestrator
if (process.argv[1]?.endsWith('orchestrator.ts')) {
  const orchestrator = new Orchestrator();
  if (process.argv.includes('--maintenance')) {
    orchestrator.runNightlyMaintenance().catch(console.error);
  } else {
    orchestrator.start().catch(console.error);
  }
}
