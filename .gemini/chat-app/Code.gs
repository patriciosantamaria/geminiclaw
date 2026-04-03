/**
 * GeminiClaw Google Chat App (Cloud Interface)
 * Deployed via Google Apps Script
 * Uses CardService to provide a beautiful, interactive Vopak UI.
 * Receives button clicks and natural language messages from Google Chat and publishes them to GCP Pub/Sub.
 */

const PROJECT_ID = 'flow-forward-with-ai';
const TOPIC_NAME = 'geminiclaw-commands';
const AUTHORIZED_USERS = ['patricio.santamaria@vopak.com', 'yassin.bahasuan@vopak.com'];

/**
 * Helper to extract data from both Native Chat and Add-on event structures.
 */
function getEventData(event) {
  if (event.chat && event.chat.messagePayload) {
    return {
      text: event.chat.messagePayload.message ? event.chat.messagePayload.message.text : '',
      email: event.chat.user ? event.chat.user.email : '',
      space: event.chat.messagePayload.space ? event.chat.messagePayload.space.name : ''
    };
  } else {
    return {
      text: event.message ? event.message.text : '',
      email: (event.user && event.user.email) || (event.message && event.message.sender && event.message.sender.email) || '',
      space: event.space ? event.space.name : ''
    };
  }
}

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
      return buildMenuCard();
    }

    // Otherwise, treat it as a natural language question/command and send it to Pub/Sub
    return triggerPubSub('ask_colleague', event, userMessage, data);
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
  return buildMenuCard();
}

/**
 * Action Handler: News Button Clicked
 */
function runNews(event) {
  console.log('runNews action triggered');
  const data = getEventData(event);
  return triggerPubSub('run_news', event, '', data);
}

/**
 * Action Handler: Synthesis Button Clicked
 */
function runSynthesis(event) {
  console.log('runSynthesis action triggered');
  const data = getEventData(event);
  return triggerPubSub('run_synthesis', event, '', data);
}

/**
 * Builds the Interactive Vopak AI Command Center Card using CardService
 */
function buildMenuCard() {
  const header = CardService.newCardHeader()
    .setTitle('Vopak AI Command Center')
    .setSubtitle('GeminiClaw V4.0 | Flow Forward')
    .setImageUrl('https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Google_Chat_icon_%282020%29.svg/1024px-Google_Chat_icon_%282020%29.svg.png')
    .setImageStyle(CardService.ImageStyle.CIRCLE);

  const section = CardService.newCardSection()
    .setHeader('Available Strategic Workflows')
    .addWidget(CardService.newTextParagraph().setText('Select a command or type a question to execute securely on the local Vopak infrastructure.'))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('📰 Run News Intelligence')
        .setBackgroundColor('#00cfe1') // Vopak Cyan
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction().setFunctionName('runNews')))
      .addButton(CardService.newTextButton()
        .setText('📊 Run Synthesis Reports')
        .setBackgroundColor('#0a2373') // Vopak Deep Blue
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction().setFunctionName('runSynthesis')))
    );

  const card = CardService.newCardBuilder()
    .setHeader(header)
    .addSection(section)
    .build();

  return {
    actionResponse: { type: 'NEW_MESSAGE' },
    cards: [card]
  };
}

/**
 * Publishes the command or question to Google Cloud Pub/Sub via REST API.
 */
function triggerPubSub(command, event, query, data) {
  const senderEmail = (data.email || '').toLowerCase();
  
  if (!AUTHORIZED_USERS.includes(senderEmail)) {
    return { text: `⛔ Unauthorized: You do not have Super Admin clearance. Detected: ${senderEmail}` };
  }

  try {
    const token = ScriptApp.getOAuthToken();
    const url = `https://pubsub.googleapis.com/v1/projects/${PROJECT_ID}/topics/${TOPIC_NAME}:publish`;

    const payload = {
      messages: [{
        data: Utilities.base64Encode(JSON.stringify({
          command: command,
          query: query,
          replySpace: data.space,
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

    // If it's a natural language query, return a simple text acknowledgement
    if (command === 'ask_colleague') {
        return { text: `🧠 Thinking... Transmitting query to secure local core.` };
    }

    // Return a success card updating the UI for button clicks
    const successHeader = CardService.newCardHeader()
      .setTitle('Command Acknowledged')
      .setSubtitle(`Target: ${command}`)
      .setImageUrl('https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/check_circle/default/48px.svg');

    const successSection = CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText(`Transmitting \`${command}\` to local Chromebox via secure Pub/Sub. You will receive the output in your Webhook space shortly.`));

    const card = CardService.newCardBuilder().setHeader(successHeader).addSection(successSection).build();

    return {
      actionResponse: { type: 'NEW_MESSAGE' },
      cards: [card]
    };

  } catch (e) {
    console.error('Exception in triggerPubSub:', e.toString());
    return { text: `❌ Internal Error: ${e.toString()}` };
  }
}