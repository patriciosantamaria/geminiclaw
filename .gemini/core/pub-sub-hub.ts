import { Logger } from './utils/logger.ts';

const logger = new Logger('PubSubHub');

export type WorkspaceEvent = 'GMAIL_WEBHOOK' | 'DRIVE_CHANGE' | 'CALENDAR_UPDATE' | 'TASK_CREATED';

export interface Signal {
  type: WorkspaceEvent;
  sourceId: string;
  payload: any;
  timestamp: string;
}

export type SkillSubscriber = (signal: Signal) => Promise<void>;

/**
 * 📡 Pub/Sub Proactivity Hub
 * Pillar 5: Signal Hub.
 * Centralized listener for workspace events and internal signal dispatching.
 */
export class PubSubHub {
  private subscribers: Map<WorkspaceEvent, SkillSubscriber[]> = new Map();

  /**
   * Register a skill to listen for specific workspace events.
   */
  subscribe(event: WorkspaceEvent, handler: SkillSubscriber): void {
    const existing = this.subscribers.get(event) || [];
    this.subscribers.set(event, [...existing, handler]);
    logger.info(`Skill subscribed to ${event}`);
  }

  /**
   * Dispatch an incoming workspace signal to all interested skills.
   */
  async dispatch(signal: Signal): Promise<void> {
    const handlers = this.subscribers.get(signal.type) || [];
    logger.info(`Dispatching ${signal.type} signal to ${handlers.length} subscribers.`);

    const results = await Promise.allSettled(
      handlers.map(handler => handler(signal))
    );

    results.forEach((res, index) => {
      if (res.status === 'rejected') {
        logger.error(`Error in ${signal.type} handler at index ${index}:`, res.reason);
      }
    });
  }
}
