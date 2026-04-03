# Skill: Vopak News Intelligence

## Description
Autonomously searches for the latest strategic news (past 24 hours) across Google Workspace, Google Cloud/Vertex AI, Google AI (DeepMind, Astra, etc.), and the broader Agentic AI ecosystem. Synthesizes the findings into a highly detailed, Vopak-branded HTML newsletter and delivers the notification via Google Chat Webhook.

## Core Instructions
When activated, you MUST perform the following steps sequentially. Use your high-level executive persona to synthesize the intelligence.

### 1. Intelligence Gathering
Execute `google_web_search` (in parallel if possible) to find the most significant news from the past 24-48 hours for the following four categories. You must gather deep, detailed technical and strategic information.

**CRITICAL: You MUST extract the specific, exact URL for each news article. DO NOT use generic homepages like `https://workspaceupdates.googleblog.com/`.**
*Anti-Hallucination Guardrail:* If the `google_web_search` tool returns a grounding redirect URL (e.g., `https://vertexaisearch.cloud.google.com/grounding-api-redirect/...`), you MUST use `run_shell_command` to resolve the final destination URL before including it in the HTML report. Do NOT guess or hallucinate the final URL. 
Example command to resolve the true URL:
`curl -sLI -o /dev/null -w '%{url_effective}' "REDIRECT_URL_HERE"`

1.  **Google Workspace, Security & Developer Updates:** Search `site:workspaceupdates.googleblog.com OR site:security.googleblog.com OR site:developers.googleblog.com`. Find ALL recent updates. You must highlight the ones that require Admin actions or are highly useful for the Vopak ecosystem. Also, search for or synthesize 1-2 Google Workspace "Efficiency Tips" (e.g., keyboard shortcuts, Gmail/Drive organization).
2.  **Google AI, DeepMind & Next-Gen:** Search `site:blog.google/innovation-and-ai/technology/ai/ OR site:blog.google/innovation-and-ai/models-and-research/google-labs/ OR site:blog.google/innovation-and-ai/products/gemini-app/ OR site:blog.google/feed/ OR "DeepMind" OR "Project Mariner" OR "Project Astra" OR "Gemini Live"`.
3.  **GCP & Vertex AI Ecosystem:** Search `"Google Cloud" OR "Vertex AI" OR "Google AI Studio" news`.
4.  **General AI & Competitors:** Search `"Anthropic" OR "OpenAI" OR "ChatGPT" OR "Copilot" OR "AWS AI" OR "AI Agents" OR "Gemini CLI" OR "OpenClaw" OR "google antigravity" news`.

### 2. Synthesis & Formatting (Vopak Branded HTML)
You MUST synthesize the findings into a highly detailed HTML newsletter using the official Vopak Branding Template.
1. Read the template from `.gemini/configs/NEWSLETTER_TEMPLATE.html`.
2. Replace `{{DATE}}` with the current date (e.g., April 3, 2026).
3. Generate a top-level **Executive Summary** HTML block.
4. Replace `<!-- INJECT_CONTENT_HERE -->` with the generated HTML.

**CRITICAL: You MUST order the newsletter exactly in this sequence to optimize the executive reading experience:**

1. **🎯 Executive Summary & Action Items**: 
   - 2-3 most critical Admin actions and Strategic shifts. Each bullet point MUST include an HTML hyperlink to the respective news article.
2. **🛡️ Google Workspace & Security Operations**: 
   - List all updates found, heavily emphasizing those requiring Admin action or representing a significant ecosystem upgrade.
3. **☁️ GCP & Enterprise AI Infrastructure**: 
   - Updates from Google Cloud, Vertex AI, and Google AI Studio.
4. **🧠 The Future of Google AI**: 
   - News regarding DeepMind, Project Astra, Gemini Live, and core Google AI research.
5. **🌐 The Broader AI Ecosystem**: 
   - Competitive landscape (Anthropic, OpenAI, Microsoft, AWS, Agentic tools).
6. **💡 Executive Efficiency & Workflow Tips**: 
   - Present 1-2 practical tips to organize or move faster in Google Workspace (e.g., keyboard shortcuts, Gmail/Drive organization).

For the Executive Summary, use this exact HTML structure:
```html
<div class="category">
    <div class="category-title">🎯 Executive Summary & Action Items</div>
    <div class="insight-box">
        <strong>🚨 Urgent Super Admin Actions:</strong>
        <ul>
            <li><a href="EXACT_URL" target="_blank">Action Name</a>: Describe the action...</li>
        </ul>
        <strong>♟️ Major Strategic Shifts:</strong>
        <ul>
            <li><a href="EXACT_URL" target="_blank">Shift Name</a>: Describe the shift...</li>
        </ul>
    </div>
</div>
```

For ALL other categories (2 through 6), use this exact HTML structure:
```html
<div class="category">
    <div class="category-title">CATEGORY ICON & NAME (e.g., 🛡️ Google Workspace & Security Operations)</div>
    
    <!-- Repeat for each news/tip item -->
    <div class="news-card">
        <h3 class="card-title">Detailed News Headline</h3>
        <p class="card-content">A comprehensive, detailed summary (3-4 sentences). Do not use bullet points here, use a flowing executive narrative.</p>
        <div class="insight-box">
            <strong>Why it matters:</strong>
            <p>Direct, detailed application for Vopak employees or Super Admin policy improvements. Mention if ADMIN ACTION is required.</p>
            <strong>Strategic Value:</strong>
            <p>How it aligns with enterprise security, scaling, or the "Flow Forward" narrative.</p>
        </div>
        <!-- MUST USE EXACT ARTICLE URL -->
        <a href="EXACT_SPECIFIC_URL_HERE" class="read-more" target="_blank">Read Full Report</a>
    </div>
</div>
```

### 3. Distribution (GitHub Pages & Chat)
Save the generated HTML file locally to `.gemini/data/newsletters/YYYY-MM-DD.html`.
Then, you MUST use `run_shell_command` to commit and push the new HTML file to the `master` branch. Wait for the command to succeed.

Finally, use `run_shell_command` with a `curl` POST request to the following webhook URL to notify the "Get news headlines summarized daily" space. **Append a timestamp parameter (e.g., `?t=1234567`) to the GitHub raw URL to explicitly bust the `htmlpreview.github.io` cache every time.**

Webhook URL:
`https://chat.googleapis.com/v1/spaces/AAQAqVVMfbw/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=7vUO6B8NRfCWVuS9k4CTeygmrZB_4mkbNyL4sNOHBr4`

Example curl command:
```bash
# Generate a timestamp to bust the cache
TIMESTAMP=$(date +%s)
URL="https://htmlpreview.github.io/?https://github.com/patriciosantamaria/geminiclaw/blob/master/.gemini/data/newsletters/YYYY-MM-DD.html?t=${TIMESTAMP}"

curl -X POST -H 'Content-Type: application/json' \
-d "{\"text\": \"📰 *Vopak Strategic Intelligence*: Your daily briefing is ready.\n\nRead the full executive newsletter here:\n${URL}\"}" \
"https://chat.googleapis.com/v1/spaces/AAQAqVVMfbw/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=7vUO6B8NRfCWVuS9k4CTeygmrZB_4mkbNyL4sNOHBr4"
```