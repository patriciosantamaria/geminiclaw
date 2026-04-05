import { PubSub } from '@google-cloud/pubsub';
import { Logger } from './utils/logger.js';
import { handleError } from './utils/errors.js';

const logger = new Logger('PubSubListener');

export class PubSubListener {
  private pubsub: PubSub;
  private readonly SUBSCRIPTION_NAME = 'geminiclaw-workspace-events-sub';

  constructor() {
    this.pubsub = new PubSub();
  }

  /**
   * 📡 Start listening for Google Cloud Pub/Sub events for Workspace (Gmail/Calendar)
   */
  public startListening() {
    logger.info(`Starting Pub/Sub listener on subscription: ${this.SUBSCRIPTION_NAME}`);

    const subscription = this.pubsub.subscription(this.SUBSCRIPTION_NAME);

    const messageHandler = async (message: any) => {
      logger.info(`Received event: ${message.id}`);
      try {
        const data = JSON.parse(message.data.toString());
        await this.handleWorkspaceEvent(data);
        message.ack();
      } catch (e) {
        handleError(logger, e, 'Failed to handle Pub/Sub message');
        // Let it retry
        message.nack();
      }
    };

    subscription.on('message', messageHandler);
    subscription.on('error', (err) => {
      handleError(logger, err, 'Pub/Sub subscription error');
    });
  }

  /**
   * 🦅 Trigger relevant worker skills based on incoming events
   */
  private async handleWorkspaceEvent(eventData: any) {
    // Gmail watch events usually contain emailAddress and historyId
    if (eventData.emailAddress) {
      logger.info(`Gmail event detected for ${eventData.emailAddress}. Invoking vopak-inbox-triage...`);
      // In a live system, this would call the orchestrator or shell out to 'gemini --skill vopak-inbox-triage'
    } else if (eventData.calendarId) {
      logger.info(`Calendar event detected for ${eventData.calendarId}. Preparing briefing update...`);
      // In a live system, this would trigger a partial morning-brief or news update
    }
  }
}
