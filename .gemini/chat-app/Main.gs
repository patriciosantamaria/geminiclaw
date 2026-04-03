/**
 * Triggered when a user sends a message to the bot.
 */
function onMessage(event) {
  try {
    console.log('onMessage event received:', JSON.stringify(event));
    const data = getEventData(event);
    const userMessage = (data.text || '').trim();
    const senderEmail = (data.email || '').toLowerCase();

    if (!senderEmail) {
      console.error('No sender email found in event');
      return { text: "❌ Error: Missing user email. Please ensure the app has permission to access your identity." };
    }

    if (!AUTHORIZED_USERS.includes(senderEmail)) {
      console.warn('Unauthorized access attempt:', senderEmail);
      return { text: `⛔ Unauthorized: You do not have clearance. Detected: ${senderEmail}` };
    }

    const cleanMsg = userMessage.replace(/@geminiclaw/gi, '').trim().toLowerCase();
    
    if (cleanMsg === '' || cleanMsg === 'menu' || cleanMsg === 'help') {
      return buildHelpResponse();
    }

    if (cleanMsg === 'run news') {
        return triggerPubSub('run_news', event, '');
    }
    
    if (cleanMsg === 'run synthesis') {
        return triggerPubSub('run_synthesis', event, '');
    }

    // Otherwise, treat it as a natural language question/command and send it to Pub/Sub
    return triggerPubSub('ask_colleague', event, userMessage);
  } catch (e) {
    console.error('Exception in onMessage:', e.toString());
    return { text: `❌ Internal Error: ${e.toString()}` };
  }
}

/**
 * Triggered when the bot is added to a space or DM.
 */
function onAddedToSpace(event) {
  console.log('onAddedToSpace event received');
  return buildHelpResponse();
}

/**
 * Builds a simple help response.
 */
function buildHelpResponse() {
  return { 
    text: `🦅 *GeminiClaw V4.0 | Flow Forward AI*\n\nAvailable commands:\n• \`run news\`: Run News Intelligence\n• \`run synthesis\`: Run Synthesis Reports\n• \`help\`: Show this help menu\n\nOr just type any question to ask your Digital Colleague.` 
  };
}