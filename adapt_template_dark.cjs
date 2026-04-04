const fs = require('fs');

let html = fs.readFileSync('/app/stitch_report_dark.html', 'utf8');

// Replace date and branding info
html = html.replace('Internal Briefing // Q4-2024', 'Internal Briefing // {{DATE}}');
html = html.replace('Strategic Intelligence | Q4 Executive Report', '{{DATE}}');
html = html.replace('Q4 Strategic Outlook', 'Daily/Weekly Strategic Outlook');

// Replace executive summary
// Search for the specific paragraph in the executive summary
html = html.replace(/<p class="text-lg leading-relaxed text-slate-100">[\s\S]*?<\/p>/, '<div class="text-lg leading-relaxed text-slate-100">\n<!-- INJECT_EXECUTIVE_SUMMARY_HERE -->\n</div>');

// Replace update cards grid
// Identify the grid and replace its content
html = html.replace(/<div class="grid grid-cols-1 md:grid-cols-3 gap-8">[\s\S]*?<!-- Visual Data Anchor -->/, '<!-- INJECT_CONTENT_HERE -->\n\n<!-- Visual Data Anchor -->');

// Save it to the correct location
fs.writeFileSync('/home/geminiuser/.gemini/configs/NEWSLETTER_TEMPLATE.html', html);
fs.writeFileSync('/app/.gemini_docker/configs/NEWSLETTER_TEMPLATE.html', html);

console.log('Dark Mode Template adapted successfully!');