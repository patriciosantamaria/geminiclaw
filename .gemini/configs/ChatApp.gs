/**
 * GeminiClaw Google Chat App (Cloud Interface)
 * Deployed via Google Apps Script
 * Receives messages from Google Chat and publishes them to GCP Pub/Sub.
 */

const PROJECT_ID = 'flow-forward-with-ai';
const TOPIC_NAME = 'geminiclaw-commands';

/**
 * Handles messages sent to the Chat App.
 */
function onMessage(event) {
  const userMessage = event.message.text.trim().toLowerCase();
  const senderEmail = event.user.email;
  const spaceName = event.space.name;

  // 1. Security Authorization (Only you and Yassin can command the bot)
  const AUTHORIZED_USERS = ['patricio.santamaria@vopak.com', 'yassin.bahasuan@vopak.com'];
  if (!AUTHORIZED_USERS.includes(senderEmail)) {
    return { text: "⛔ Unauthorized: You do not have clearance to command GeminiClaw." };
  }

  // 2. Parse Commands
  let commandToRun = '';
  if (userMessage.includes('news') || userMessage.includes('briefing')) {
    commandToRun = 'run_news';
  } else if (userMessage.includes('synthesis') || userMessage.includes('report')) {
    commandToRun = 'run_synthesis';
  } else {
    return { 
      text: "🤖 *GeminiClaw Awaiting Orders*\nAvailable commands:\n• `@GeminiClaw run news`\n• `@GeminiClaw run synthesis`" 
    };
  }

  // 3. Publish to GCP Pub/Sub
  publishToPubSub(commandToRun, spaceName, senderEmail);

  // 4. Immediate feedback to user
  return {
    text: `⚡ Command acknowledged. Transmitting \`${commandToRun}\` to local Chromebox via secure Pub/Sub...`
  };
}

/**
 * Publishes the command to Google Cloud Pub/Sub via REST API.
 */
function publishToPubSub(command, replySpace, userEmail) {
  // Requires OAuth scope: https://www.googleapis.com/auth/pubsub
  const token = ScriptApp.getOAuthToken();
  const url = `https://pubsub.googleapis.com/v1/projects/${PROJECT_ID}/topics/${TOPIC_NAME}:publish`;

  const payload = {
    messages: [{
      data: Utilities.base64Encode(JSON.stringify({
        command: command,
        replySpace: replySpace,
        requestedBy: userEmail,
        timestamp: new Date().toISOString()
      }))
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${token}` },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(url, options);
}

/**
 * Required handler for when the bot is added to a space.
 */
function onAddToSpace(event) {
  return { text: "🦅 GeminiClaw Cloud Bridge established. Awaiting commands." };
}
