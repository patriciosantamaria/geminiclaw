"use strict";
/**
 * GeminiClaw Google Chat App (Cloud Interface)
 * Deployed via Google Apps Script
 * Receives messages and button clicks from Google Chat and publishes them to GCP Pub/Sub.
 */
const PROJECT_ID = 'flow-forward-with-ai';
const TOPIC_NAME = 'geminiclaw-commands';
const AUTHORIZED_USERS = ['patricio.santamaria@vopak.com', 'yassin.bahasuan@vopak.com'];
/**
 * Helper to create a standardized text response.
 */
function createTextResponse(text) {
    return { text };
}
/**
 * Triggered when a user sends a message to the bot.
 */
function onMessage(event) {
    try {
        console.log('onMessage event received:', JSON.stringify(event));
        const userMessage = (event.message && event.message.text) ? event.message.text.trim() : '';
        const senderEmail = (event.user && event.user.email || '').toLowerCase();
        if (!senderEmail) {
            console.error('No sender email found in event');
            return createTextResponse("❌ Error: Missing user email. Please ensure the app has permission to access your identity.");
        }
        if (!AUTHORIZED_USERS.includes(senderEmail)) {
            console.warn('Unauthorized access attempt:', senderEmail);
            return createTextResponse(`⛔ Unauthorized: You do not have clearance. Detected: ${senderEmail}`);
        }
        const cleanMsg = userMessage.replace(/@geminiclaw/gi, '').trim().toLowerCase();
        if (cleanMsg === '' || cleanMsg === 'menu' || cleanMsg === 'help') {
            return buildHelpResponse();
        }
        if (cleanMsg === 'news') {
            return triggerPubSub('run_news', event, '');
        }
        if (cleanMsg === 'synthesis') {
            return triggerPubSub('run_synthesis', event, '');
        }
        // Otherwise, treat it as a natural language question/command and send it to Pub/Sub
        return triggerPubSub('ask_colleague', event, userMessage);
    }
    catch (e) {
        console.error('Exception in onMessage:', e.toString());
        return createTextResponse(`❌ Internal Error: ${e.toString()}`);
    }
}
/**
 * Triggered when the bot is added to a space or DM.
 */
function onAddedToSpace(event) {
    try {
        console.log('onAddedToSpace event received');
        return buildHelpResponse();
    }
    catch (e) {
        console.error('Exception in onAddedToSpace:', e.toString());
        return createTextResponse(`❌ Internal Error: ${e.toString()}`);
    }
}
/**
 * Action Handler: Triggered by 'Run News' Button
 */
function runNews(event) {
    try {
        console.log('runNews action triggered');
        return triggerPubSub('run_news', event, '');
    }
    catch (e) {
        console.error('Exception in runNews:', e.toString());
        return createActionResponse(`❌ Internal Error: ${e.toString()}`);
    }
}
/**
 * Action Handler: Triggered by 'Run Synthesis' Button
 */
function runSynthesis(event) {
    try {
        console.log('runSynthesis action triggered');
        return triggerPubSub('run_synthesis', event, '');
    }
    catch (e) {
        console.error('Exception in runSynthesis:', e.toString());
        return createActionResponse(`❌ Internal Error: ${e.toString()}`);
    }
}
/**
 * Builds a simple help response for the CLI-like interface.
 */
function buildHelpResponse() {
    const helpText = `🦅 *GeminiClaw V4.0 | Flow Forward AI*

Available commands:
• \`news\`: Run News Intelligence
• \`synthesis\`: Run Synthesis Reports
• \`help\`: Show this help menu
• Or just type any question or command.

Example: "What is the current status of the Rotterdam terminal?"`;
    return createTextResponse(helpText);
}
/**
 * Helper to create an action response for button clicks.
 */
function createActionResponse(text) {
    return {
        "text": text,
        "actionResponse": { "type": "NEW_MESSAGE" }
    };
}
/**
 * Publishes the command or question to Google Cloud Pub/Sub via REST API.
 */
function triggerPubSub(command, event, query = '') {
    const senderEmail = (event.user && event.user.email || '').toLowerCase();
    const isInteractive = !!(event.common && event.common.invokedFunction);
    if (!AUTHORIZED_USERS.includes(senderEmail)) {
        const errorText = `⛔ Unauthorized: You do not have Super Admin clearance. Detected: ${senderEmail}`;
        return isInteractive ? createActionResponse(errorText) : createTextResponse(errorText);
    }
    try {
        const token = ScriptApp.getOAuthToken();
        const url = `https://pubsub.googleapis.com/v1/projects/${PROJECT_ID}/topics/${TOPIC_NAME}:publish`;
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
            const errorText = `❌ Error: Pub/Sub Publish Failed (${responseCode}): ${response.getContentText()}`;
            return isInteractive ? createActionResponse(errorText) : createTextResponse(errorText);
        }
        const successText = `✅ Command \`${command}\` acknowledged. Transmitting via secure Pub/Sub. Output will follow shortly.`;
        return isInteractive ? createActionResponse(successText) : createTextResponse(successText);
    }
    catch (e) {
        console.error('Exception in triggerPubSub:', e.toString());
        const errorText = `❌ Error: Exception triggering Pub/Sub: ${e.toString()}`;
        return isInteractive ? createActionResponse(errorText) : createTextResponse(errorText);
    }
}
