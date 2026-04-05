import fs from 'node:fs';

// 1. Read the new floating template
const template = fs.readFileSync('/home/geminiuser/.gemini/configs/NEWSLETTER_TEMPLATE.html', 'utf8');

// 2. Define the report data (simulated based on today's context/latest news)
const date = "Saturday, April 4, 2026";
const executiveSummary = `
    Today's focus is on the successful deployment of the **Vopak Reports Redesign**. 
    Strategic updates include a mandatory audit of **Vertex AI BYOSA compliance** and the implementation of 
    **Workspace Prompt Injection defenses**. We are also monitoring the retirement of the **GPT-4o API** 
    to prevent service disruptions in legacy internal tools.
`;

const content = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Card 1 -->
        <div class="bg-vopak-steel rounded-2xl p-10 flex flex-col h-full shadow-2xl hover:shadow-vopak-green/10 transition-shadow">
            <div class="flex items-center mb-8">
                <span class="material-symbols-outlined text-vopak-green mr-3 text-3xl">shield</span>
                <h3 class="font-bold text-white tracking-tight uppercase text-sm">Security Update</h3>
            </div>
            <ul class="space-y-6 text-sm text-vopak-grey flex-grow">
                <li class="flex items-start">
                    <span class="text-vopak-green font-bold mr-3">•</span>
                    <span>Google strictly mandates a <strong>BYOSA architecture</strong> for Vertex AI. Immediate audit of all Vopak implementations is required.</span>
                </li>
            </ul>
            <a href="#" class="text-vopak-cyan mt-6 text-xs font-bold uppercase tracking-wider hover:underline">Read Audit Guide →</a>
        </div>

        <!-- Card 2 -->
        <div class="bg-vopak-steel rounded-2xl p-10 flex flex-col h-full shadow-2xl hover:shadow-vopak-orange/10 transition-shadow">
            <div class="flex items-center mb-8">
                <span class="material-symbols-outlined text-vopak-orange mr-3 text-3xl">settings_suggest</span>
                <h3 class="font-bold text-white tracking-tight uppercase text-sm">Prompt Defense</h3>
            </div>
            <ul class="space-y-6 text-sm text-vopak-grey flex-grow">
                <li class="flex items-start">
                    <span class="text-vopak-orange font-bold mr-3">•</span>
                    <span>New <strong>Prompt Injection Mitigation</strong> released for Workspace. Super Admins must configure deterministic URL sanitization.</span>
                </li>
            </ul>
            <a href="#" class="text-vopak-cyan mt-6 text-xs font-bold uppercase tracking-wider hover:underline">Configure Now →</a>
        </div>

        <!-- Card 3 -->
        <div class="bg-vopak-steel rounded-2xl p-10 flex flex-col h-full shadow-2xl hover:shadow-vopak-light-blue/10 transition-shadow">
            <div class="flex items-center mb-8">
                <span class="material-symbols-outlined text-vopak-light-blue mr-3 text-3xl">warning</span>
                <h3 class="font-bold text-white tracking-tight uppercase text-sm">API Retirement</h3>
            </div>
            <ul class="space-y-6 text-sm text-vopak-grey flex-grow">
                <li class="flex items-start">
                    <span class="text-vopak-light-blue font-bold mr-3">•</span>
                    <span>OpenAI retired the <strong>GPT-4o API</strong>. Any shadow-IT apps relying on this legacy endpoint will break immediately.</span>
                </li>
            </ul>
            <a href="#" class="text-vopak-cyan mt-6 text-xs font-bold uppercase tracking-wider hover:underline">Check Inventory →</a>
        </div>
    </div>
`;

// 3. Inject data into template
let finalHtml = template
    .replace(/{{DATE}}/g, date)
    .replace('<!-- INJECT_EXECUTIVE_SUMMARY_HERE -->', executiveSummary)
    .replace('<!-- INJECT_CONTENT_HERE -->', content);

// 4. Save the generated report
const filePath = '/app/vopak_report_2026_04_04.html';
fs.writeFileSync(filePath, finalHtml);

const publicUrl = 'https://htmlpreview.github.io/?https://github.com/patriciosantamaria/geminiclaw/blob/master/vopak_report_2026_04_04.html';
console.log('Report generated at: ' + filePath);
console.log('Bulletproof web preview: ' + publicUrl);
