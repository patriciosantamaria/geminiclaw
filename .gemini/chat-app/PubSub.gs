/**
 * Publishes the command or question to Google Cloud Pub/Sub via REST API.
 */
function triggerPubSub(command, event, query) {
  const data = getEventData(event);
  const senderEmail = (data.email || '').toLowerCase();
  
  if (!AUTHORIZED_USERS.includes(senderEmail)) {
    return { text: `⛔ Unauthorized: You do not have Super Admin clearance. Detected: ${senderEmail}` };
  }

  try {
    const token = ScriptApp.getOAuthToken();
    const url = `https://pubsub.googleapis.com/v1/projects/${PROJECT_ID}/topics/${TOPIC_NAME}:publish`;

    const spaceName = data.space || '';

    const payload = {
      messages: [{
        data: Utilities.base64Encode(JSON.stringify({
          command: command,
          query: query,
          replySpace: spaceName,
          requestedBy: senderEmail,
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

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      console.error('Pub/Sub Error:', response.getContentText());
      return { text: `❌ Error: Pub/Sub Publish Failed (${responseCode}): ${response.getContentText()}` };
    }

    if (command === 'ask_colleague') {
        return { text: `🧠 Thinking... Transmitting query to secure local core.` };
    }

    return { text: `✅ Command \`${command}\` acknowledged. Transmitting to local Chromebox via secure Pub/Sub. You will receive the output shortly.` };

  } catch (e) {
    console.error('Exception in triggerPubSub:', e.toString());
    return { text: `❌ Internal Error: ${e.toString()}` };
  }
}