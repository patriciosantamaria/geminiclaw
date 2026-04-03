/**
 * GeminiClaw Google Chat App (Cloud Interface)
 * Deployed via Google Apps Script
 * Receives messages and button clicks from Google Chat and publishes them to GCP Pub/Sub.
 */

const PROJECT_ID = 'flow-forward-with-ai';
const TOPIC_NAME = 'geminiclaw-commands';
const AUTHORIZED_USERS = ['patricio.santamaria@vopak.com', 'yassin.bahasuan@vopak.com'];

function createTextCard(title, message) {
  return {
    "actionResponse": { "type": "NEW_MESSAGE" },
    "cardsV2": [
      {
        "cardId": "text_card",
        "card": {
          "header": {
            "title": title
          },
          "sections": [
            {
              "widgets": [
                {
                  "textParagraph": {
                    "text": message
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  };
}

/**
 * Triggered when a user sends a message to the bot.
 */
function onMessage(event) {
  const userMessage = (event.message && event.message.text) ? event.message.text.trim() : '';
  const senderEmail = ((event.message && event.message.sender && event.message.sender.email) || (event.user && event.user.email) || '').toLowerCase();

  if (!AUTHORIZED_USERS.includes(senderEmail)) {
    const debugInfo = JSON.stringify(event.user || event.message?.sender || {});
    return createTextCard("⛔ Unauthorized", `You do not have clearance. Detected: ${senderEmail}. User Object: ${debugInfo}`);
  }

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
function onAddedToSpace(event) {
  return buildMenuCard();
}

/**
 * Action Handler: Triggered by 'Run News' Button
 */
function runNews(event) {
  return triggerPubSub('run_news', event, '');
}

/**
 * Action Handler: Triggered by 'Run Synthesis' Button
 */
function runSynthesis(event) {
  return triggerPubSub('run_synthesis', event, '');
}

/**
 * Builds the Interactive Vopak AI Command Center Card using Chat API v2 JSON
 */
function buildMenuCard() {
  return {
    "actionResponse": { "type": "NEW_MESSAGE" },
    "cardsV2": [
      {
        "cardId": "menu_card",
        "card": {
          "header": {
            "title": "Vopak AI Command Center",
            "subtitle": "GeminiClaw V4.0 | Flow Forward",
            "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Google_Chat_icon_%282020%29.svg/1024px-Google_Chat_icon_%282020%29.svg.png",
            "imageType": "CIRCLE"
          },
          "sections": [
            {
              "header": "Available Strategic Workflows",
              "widgets": [
                {
                  "textParagraph": {
                    "text": "Select a command or type a question to execute securely on the local Vopak infrastructure in Rotterdam."
                  }
                },
                {
                  "buttonList": {
                    "buttons": [
                      {
                        "text": "📰 Run News Intelligence",
                        "color": { "red": 0, "green": 0.811, "blue": 0.882, "alpha": 1 },
                        "onClick": {
                          "action": {
                            "function": "runNews"
                          }
                        }
                      },
                      {
                        "text": "📊 Run Synthesis Reports",
                        "color": { "red": 0.039, "green": 0.137, "blue": 0.451, "alpha": 1 },
                        "onClick": {
                          "action": {
                            "function": "runSynthesis"
                          }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  };
}

/**
 * Publishes the command or question to Google Cloud Pub/Sub via REST API.
 */
function triggerPubSub(command, event, query = '') {
  const senderEmail = ((event.message && event.message.sender && event.message.sender.email) || (event.user && event.user.email) || '').toLowerCase();
  
  if (!AUTHORIZED_USERS.includes(senderEmail)) {
    const debugInfo = JSON.stringify(event.user || event.message?.sender || {});
    return createTextCard("⛔ Unauthorized", `You do not have Super Admin clearance to command GeminiClaw. Detected: ${senderEmail}. User Object: ${debugInfo}`);
  }

  try {
    const token = ScriptApp.getOAuthToken();
    const url = `https://pubsub.googleapis.com/v1/projects/${PROJECT_ID}/topics/${TOPIC_NAME}:publish`;
    
    // We get the space name differently depending on if it's a card click or text message
    const spaceName = event.space ? event.space.name : (event.message ? event.message.space.name : '');

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

    // If it's a natural language query, return a simple text acknowledgement
    if (command === 'ask_colleague') {
        return createTextCard("🧠 Thinking...", "Transmitting query to secure local core.");
    }

    // Return a success card updating the UI for button clicks
    return {
      "actionResponse": { "type": "NEW_MESSAGE" },
      "cardsV2": [
        {
          "cardId": "success_card",
          "card": {
            "header": {
              "title": "Command Acknowledged",
              "subtitle": `Target: ${command}`,
              "imageUrl": "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/check_circle/default/48px.svg"
            },
            "sections": [
              {
                "widgets": [
                  {
                    "textParagraph": {
                      "text": `Transmitting \`${command}\` to local Chromebox via secure Pub/Sub. You will receive the output in your Webhook space shortly.`
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    };

  } catch (e) {
    return createTextCard("Error", `Error triggering Pub/Sub: ${e.toString()}`);
  }
}
