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