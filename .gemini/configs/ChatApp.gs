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
 * Triggered when a user sends a message to the bot.
 */
function onMessage(event) {
  const userMessage = event.message.text ? event.message.text.trim() : '';
  const senderEmail = event.user.email;

  if (!AUTHORIZED_USERS.includes(senderEmail)) {
    return { text: "⛔ Unauthorized: You do not have clearance to communicate with GeminiClaw." };
  }

  // If the message is just mentioning the bot or is empty, show the Command Center
  // Also show Command Center if the message is exactly "menu" or "help"
  const cleanMsg = userMessage.replace(/@geminiclaw/gi, '').trim().toLowerCase();
  
  if (cleanMsg === '' || cleanMsg === 'menu' || cleanMsg === 'help') {
    return buildMenuCard();
  }

  // Otherwise, treat it as a natural language question/command and send it to Pub/Sub
  return triggerPubSub('ask_colleague', event, userMessage);
}

/**
 * Triggered when the bot is added to a space or DM.
 */
function onAddToSpace(event) {
  return buildMenuCard();
}

/**
 * Action Handler: News Button Clicked
 */
function runNews(event) {
  return triggerPubSub('run_news', event);
}

/**
 * Action Handler: Synthesis Button Clicked
 */
function runSynthesis(event) {
  return triggerPubSub('run_synthesis', event);
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
function triggerPubSub(command, event, query = '') {
  const senderEmail = event.user.email;
  
  if (!AUTHORIZED_USERS.includes(senderEmail)) {
    return { text: "⛔ Unauthorized: You do not have Super Admin clearance to command GeminiClaw." };
  }

  try {
    const token = ScriptApp.getOAuthToken();
    const url = `https://pubsub.googleapis.com/v1/projects/${PROJECT_ID}/topics/${TOPIC_NAME}:publish`;
    
    const payload = {
      messages: [{
        data: Utilities.base64Encode(JSON.stringify({
          command: command,
          query: query,
          replySpace: event.space.name,
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

    UrlFetchApp.fetch(url, options);

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
    return { text: `Error triggering Pub/Sub: ${e.toString()}` };
  }
}
