import { jules, Activity, Outcome } from '@google/jules-sdk';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export interface Task {
  id: string;
  prompt: string;
  sourceRepo?: string;
  baseBranch?: string;
}

export class FleetOrchestrator {
  private client = jules;

  /**
   * Dispatches multiple Jules agents in parallel to handle a set of tasks.
   * This implements the 'Dispatch' phase of the 5-phase pipeline utilizing the
   * latest SDK fleet management features (jules.all) for concurrency control.
   *
   * @param tasks Array of tasks to perform
   * @returns Array of outcomes from each session
   */
  async dispatchParallel(tasks: Task[]): Promise<Outcome[]> {
    logger.info({ tasksCount: tasks.length }, '🚀 Dispatching agent fleet via jules.all...');

    // Map internal tasks to SDK run configurations
    const runConfigs = tasks.map(task => {
      logger.info({ taskId: task.id }, `  - Queuing task: ${task.id}`);
      return {
        prompt: task.prompt,
        title: `Fleet Task: ${task.id}`,
        source: task.sourceRepo ? {
          github: task.sourceRepo,
          baseBranch: task.baseBranch || 'main'
        } : undefined,
        autoPr: true // Automatically open PRs for fleet operations
      };
    });

    try {
      // Use the built-in fleet management with concurrency limits to prevent JulesRateLimitError
      const outcomes = await this.client.all(runConfigs, {
        concurrency: 2,
        delayMs: 2000
      });

      logger.info('✅ All fleet agents have returned. Processing outcomes...');
      return outcomes;
    } catch (error: any) {
      logger.error({ error: error.message }, '❌ Fleet dispatch failed, likely due to JulesApiError or JulesRateLimitError');
      throw error;
    }
  }
}
