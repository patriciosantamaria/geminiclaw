/**
 * GeminiClaw Google Chat App (Cloud Interface)
 * Deployed via Google Apps Script
 * Receives messages and button clicks from Google Chat and publishes them to GCP Pub/Sub.
 */

const PROJECT_ID = 'flow-forward-with-ai';
const TOPIC_NAME = 'geminiclaw-commands';
const AUTHORIZED_USERS = ['patricio.santamaria@vopak.com', 'yassin.bahasuan@vopak.com'];

/**
 * Helper to create a standardized text card response.
 * Note: Does NOT include actionResponse at the top level for MESSAGE events.
 */
function createTextCard(title, message) {
  return {
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
  console.log('onMessage event received');

  const userMessage = (event.message && event.message.text) ? event.message.text.trim() : '';
  // IMPORTANT: Use event.user.email for the person interacting with the app.
  const senderEmail = (event.user && event.user.email || '').toLowerCase();

  if (!AUTHORIZED_USERS.includes(senderEmail)) {
    console.warn('Unauthorized access attempt:', senderEmail);
    return createTextCard("⛔ Unauthorized", `You do not have clearance. Detected: ${senderEmail}`);
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
  console.log('onAddedToSpace event received');
  return buildMenuCard();
}

/**
 * Action Handler: Triggered by 'Run News' Button
 */
function runNews(event) {
  console.log('runNews action triggered');
  return triggerPubSub('run_news', event, '');
}

/**
 * Action Handler: Triggered by 'Run Synthesis' Button
 */
function runSynthesis(event) {
  console.log('runSynthesis action triggered');
  return triggerPubSub('run_synthesis', event, '');
}

/**
 * Builds the Interactive Vopak AI Command Center Card.
 */
function buildMenuCard() {
  return {
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
                        "onClick": {
                          "action": {
                            "function": "runNews"
                          }
                        }
                      },
                      {
                        "text": "📊 Run Synthesis Reports",
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
  const senderEmail = (event.user && event.user.email || '').toLowerCase();
  
  if (!AUTHORIZED_USERS.includes(senderEmail)) {
    return createTextCard("⛔ Unauthorized", `You do not have Super Admin clearance. Detected: ${senderEmail}`);
  }

  try {
    const token = ScriptApp.getOAuthToken();
    const url = `https://pubsub.googleapis.com/v1/projects/${PROJECT_ID}/topics/${TOPIC_NAME}:publish`;
    
    // Space name is in event.space.name for both message and card click events.
    const spaceName = (event.space && event.space.name) ? event.space.name : '';

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
      return createTextCard("Error", `Pub/Sub Publish Failed (${responseCode}): ${response.getContentText()}`);
    }

    const responseMessage = {
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

    // If this was triggered by a button click (CARD_CLICKED), we return an ActionResponse
    if (event.common && event.common.invokedFunction) {
       responseMessage.actionResponse = { "type": "NEW_MESSAGE" };
    }

    return responseMessage;

  } catch (e) {
    console.error('Exception in triggerPubSub:', e.toString());
    return createTextCard("Error", `Exception triggering Pub/Sub: ${e.toString()}`);
  }
}
