import fs from 'node:fs';

const file1 = '/home/patosoto/.gemini/tmp/geminiclaw/tool-outputs/session-4b4b6206-5177-4805-998c-07ffb04ac822/mcp_google-workspace_calendar_listevents_1775226351369_0.txt';
const file2 = '/home/patosoto/.gemini/tmp/geminiclaw/tool-outputs/session-4b4b6206-5177-4805-998c-07ffb04ac822/mcp_google-workspace_calendar_listevents_1775226382518_0.txt';

try {
  const content1 = fs.readFileSync(file1, 'utf-8');
  const content2 = fs.readFileSync(file2, 'utf-8');
  
  const data = [...JSON.parse(content1), ...JSON.parse(content2)];
  const monthlyData: Record<string, string[]> = {};

  data.forEach((e: any) => {
    if (!e.summary || 
        e.summary.includes('Home') || 
        e.summary.includes('Lunch') || 
        e.summary.includes('Office') || 
        e.summary.includes('Flight') ||
        e.summary.includes('Holiday')) {
      return;
    }
    
    const start = e.start?.dateTime || e.start?.date;
    if (!start) return;
    
    const month = start.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = [];
    
    const attendees = (e.attendees || [])
      .filter((a: any) => a.responseStatus === 'accepted' && !a.resource && !a.self)
      .map((a: any) => a.displayName || a.email.split('@')[0])
      .join(', ');
      
    monthlyData[month].push(`- ${e.summary}${attendees ? ` (with ${attendees})` : ''}`);
  });

  const sortedMonths = Object.keys(monthlyData).sort();

  console.log("==================================================");
  console.log("📅 REAL 12-MONTH STRATEGIC RETROSPECTIVE (APR 2025 - MAR 2026)");
  console.log("==================================================\n");

  let totalEngagements = 0;

  for (const m of sortedMonths) {
    const events = [...new Set(monthlyData[m])];
    totalEngagements += events.length;
    
    console.log(`📌 Month: ${m}`);
    console.log(`   Identified ${events.length} high-signal strategic engagements.`);
    
    const highlights = events.slice(0, 5).join('\n   ');
    console.log(`   Highlights:\n   ${highlights}`);
    if (events.length > 5) {
      console.log(`   ...and ${events.length - 5} more.\n`);
    } else {
      console.log('\n');
    }
  }
  
  console.log("==================================================");
  console.log(`Total High-Signal Engagements Processed: ${totalEngagements}`);
  console.log("==================================================");

} catch (e: any) {
  console.error("Error generating real summary:", e.message);
}
