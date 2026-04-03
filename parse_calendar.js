const fs = require('fs');

const path = '/home/patosoto/.gemini/tmp/geminiclaw/tool-outputs/session-9d79b001-2220-4310-8cb0-6783fbffc476/mcp_google-workspace_calendar_listevents_9d79b001-2220-4310-8cb0-6783fbffc476-generalist-75xjr0_0-1.txt';
const data = JSON.parse(fs.readFileSync(path, 'utf-8'));

let totalEvents = data.length;
let totalDurationMs = 0;
let attendeesSet = new Set();

data.forEach(event => {
    if (event.start && event.start.dateTime && event.end && event.end.dateTime) {
        const start = new Date(event.start.dateTime).getTime();
        const end = new Date(event.end.dateTime).getTime();
        totalDurationMs += (end - start);
    }
    
    if (event.attendees && Array.isArray(event.attendees)) {
        event.attendees.forEach(att => {
            if (att.email) {
                attendeesSet.add(att.email.toLowerCase());
            }
        });
    }
});

const totalDurationHours = totalDurationMs / (1000 * 60 * 60);

console.log(JSON.stringify({
    totalEvents: totalEvents,
    totalDurationHours: totalDurationHours,
    uniqueAttendees: attendeesSet.size
}));
