import { PubSub } from '@google-cloud/pubsub';
import { exec } from 'child_process';
import { Logger } from './utils/logger.ts';

const logger = new Logger('CloudListener');

/**
 * ☁️ GCP Pub/Sub Listener (The "Ground" Side of the Cloud Bridge)
 * Runs constantly on the ASUS Chromebox. Securely pulls messages from GCP
 * and executes local Gemini CLI commands on demand.
 */

// Replace with your actual GCP Project ID and Subscription Name
const PROJECT_ID = 'flow-forward-with-ai';
const SUBSCRIPTION_NAME = 'geminiclaw-commands-sub';

const pubSubClient = new PubSub({ projectId: PROJECT_ID });

async function listenForMessages() {
  const subscription = pubSubClient.subscription(SUBSCRIPTION_NAME);

  logger.info(`🎧 Securely listening to GCP Pub/Sub [${SUBSCRIPTION_NAME}]...`);

  // Handle incoming messages
  subscription.on('message', message => {
    try {
      const payload = JSON.parse(message.data.toString());
      const command = payload.command;
      const requestedBy = payload.requestedBy;

      logger.info(`📥 Received command: [${command}] from ${requestedBy}`);

      if (command === 'run_news') {
        executeCommand('docker run --rm --env-file .env -v $(pwd):/app -w /app geminiclaw-sandbox --skill vopak-news-intelligence run "Run the daily news intelligence gathering and generate the HTML newsletter"');
      } else if (command === 'run_synthesis') {
        executeCommand('docker run --rm --env-file .env -v $(pwd):/app -w /app geminiclaw-sandbox --skill vopak-synthesis run "Generate the personal and business synthesis reports"');
      } else {
        logger.warn(`Unknown command received: ${command}`);
      }

      // Always acknowledge the message so it's removed from the GCP queue
      message.ack();
      logger.info(`✅ Message acknowledged and removed from cloud queue.`);

    } catch (error) {
      logger.error('Failed to process incoming Pub/Sub message', error);
      // Nack the message if it failed to parse, so it can be retried or sent to a dead-letter queue
      message.nack(); 
    }
  });

  // Handle errors
  subscription.on('error', error => {
    logger.error('Pub/Sub Subscription Error:', error);
  });
}

/**
 * Executes the shell command locally on the Chromebox
 */
function executeCommand(cmd: string) {
  logger.info(`⚙️ Executing Local Command: ${cmd}`);
  
  exec(cmd, { cwd: '/home/patosoto/geminiclaw' }, (error, stdout, stderr) => {
    if (error) {
      logger.error(`Execution Error: ${error.message}`);
      return;
    }
    if (stderr) {
      logger.warn(`Execution Stderr: ${stderr}`);
    }
    logger.info(`🚀 Execution Complete. Output:\n${stdout}`);
    
    // Note: The actual skill (e.g., vopak-news-intelligence) already handles
    // sending the final Webhook notification to Google Chat when it finishes.
  });
}

// Start the daemon
listenForMessages().catch(err => {
  logger.error("Fatal Listener Error", err);
  process.exit(1);
});
