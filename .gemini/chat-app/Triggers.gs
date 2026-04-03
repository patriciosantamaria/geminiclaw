/**
 * Automated Triggers (Time-Driven)
 * Functions designed to be triggered by Google Apps Script Time-Driven Triggers
 * instead of local Linux cron jobs.
 */

function scheduledMorningBrief() {
  console.log('Triggering Scheduled Morning Briefing');
  triggerSystemTask('run_morning_brief');
}

function scheduledNews() {
  console.log('Triggering Scheduled News Intelligence');
  triggerSystemTask('run_news');
}

function scheduledSynthesis() {
  console.log('Triggering Scheduled Synthesis Report');
  triggerSystemTask('run_synthesis');
}

function triggerSystemTask(command) {
  try {
    const token = ScriptApp.getOAuthToken();
    const url = `https://pubsub.googleapis.com/v1/projects/${PROJECT_ID}/topics/${TOPIC_NAME}:publish`;

    const payload = {
      messages: [{
        data: Utilities.base64Encode(JSON.stringify({
          command: command,
          query: '',
          replySpace: '', // System alerts don't need a reply space since the skill handles its own webhook targeting
          requestedBy: 'system-trigger@vopak.com',
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
    
    if (response.getResponseCode() !== 200) {
      console.error('System Pub/Sub Publish Failed', response.getContentText());
    } else {
      console.log(`System task [${command}] pushed successfully to Pub/Sub queue.`);
    }

  } catch (e) {
    console.error('Exception in triggerSystemTask:', e.toString());
  }
}