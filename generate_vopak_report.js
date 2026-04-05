import fs from 'node:fs';

// 1. Read the new dark template
const template = fs.readFileSync('/home/geminiuser/.gemini/configs/NEWSLETTER_TEMPLATE.html', 'utf8');

// 2. Define the report data (simulated based on today's context/latest news)
const date = "Saturday, April 4, 2026";
const executiveSummary = `
    Today's focus is on the successful deployment of the **Vopak Reports Dark Mode** interface. 
    Strategic updates include a mandatory audit of **Vertex AI BYOSA compliance** and the implementation of 
    **Workspace Prompt Injection defenses**. We are also monitoring the retirement of the **GPT-4o API** 
    to prevent service disruptions in legacy internal tools.
`;

const content = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Card 1 -->
        <div class="bg-[#081b58] border-l-4 border-[#00b0f0] p-8 flex flex-col h-full rounded-lg">
            <div class="flex items-center mb-6 text-white">
                <span class="material-symbols-outlined text-[#00b0f0] mr-2">shield</span>
                <h3 class="font-bold tracking-tight">Security Update</h3>
            </div>
            <p class="text-sm text-slate-300 mb-4">
                Google strictly mandates a **BYOSA architecture** for Vertex AI. Immediate audit of all Vopak implementations is required.
            </p>
            <a href="#" class="text-[#00b0f0] text-xs font-bold uppercase tracking-wider hover:underline">Read Audit Guide →</a>
        </div>

        <!-- Card 2 -->
        <div class="bg-[#081b58] border-l-4 border-[#00b0f0] p-8 flex flex-col h-full rounded-lg">
            <div class="flex items-center mb-6 text-white">
                <span class="material-symbols-outlined text-[#00b0f0] mr-2">settings_suggest</span>
                <h3 class="font-bold tracking-tight">Prompt Defense</h3>
            </div>
            <p class="text-sm text-slate-300 mb-4">
                New **Prompt Injection Mitigation** released for Workspace. Super Admins must configure deterministic URL sanitization.
            </p>
            <a href="#" class="text-[#00b0f0] text-xs font-bold uppercase tracking-wider hover:underline">Configure Now →</a>
        </div>

        <!-- Card 3 -->
        <div class="bg-[#081b58] border-l-4 border-[#00b0f0] p-8 flex flex-col h-full rounded-lg">
            <div class="flex items-center mb-6 text-white">
                <span class="material-symbols-outlined text-[#00b0f0] mr-2">warning</span>
                <h3 class="font-bold tracking-tight">API Retirement</h3>
            </div>
            <p class="text-sm text-slate-300 mb-4">
                OpenAI retired the **GPT-4o API**. Any shadow-IT apps relying on this legacy endpoint will break immediately.
            </p>
            <a href="#" class="text-[#00b0f0] text-xs font-bold uppercase tracking-wider hover:underline">Check Inventory →</a>
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

console.log('Report generated at: ' + filePath);
