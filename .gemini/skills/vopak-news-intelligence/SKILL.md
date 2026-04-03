# Skill: Vopak News Intelligence

## Description
Autonomously searches for the latest strategic news (past 24 hours) across Google Workspace, Google Cloud/Vertex AI, and the broader Agentic AI ecosystem (including major competitors like OpenAI, Anthropic, and AWS AI). Synthesizes the findings into a highly detailed, Vopak-branded HTML newsletter and delivers the notification via Google Chat Webhook.

## Core Instructions
When activated, you MUST perform the following steps sequentially. Use your high-level executive persona to synthesize the intelligence.

### 1. Intelligence Gathering
Execute `google_web_search` (in parallel if possible) to find the most significant news from the past 24-48 hours for the following three categories. You must gather deep, detailed technical and strategic information:
1.  **Google Workspace Updates:** Search `site:workspaceupdates.googleblog.com OR "Google Workspace" updates news`
2.  **GCP & Vertex AI Ecosystem:** Search `"Google Cloud" OR "Vertex AI" OR "Google AI Studio" news`
3.  **General AI & Competitors:** Search `"Anthropic" OR "OpenAI" OR "ChatGPT" OR "Copilot" OR "AWS AI" OR "AI Agents" OR "Gemini CLI" OR "OpenClaw" OR "google antigravity" news`

### 2. Synthesis & Formatting (Vopak Branded HTML)
You MUST synthesize the findings into a highly detailed HTML newsletter using the official Vopak Branding Template.
1. Read the template from `.gemini/configs/NEWSLETTER_TEMPLATE.html`.
2. Replace `{{DATE}}` with the current date (e.g., April 3, 2026).
3. Replace `<!-- INJECT_CONTENT_HERE -->` with the generated HTML for each category.

For each category, use this HTML structure:
```html
<div class="category">
    <div class="category-title">CATEGORY ICON & NAME</div>
    
    <!-- Repeat for each news item (minimum 3 items per category) -->
    <div class="news-card">
        <h3 class="card-title">Detailed News Headline</h3>
        <p class="card-content">A comprehensive, detailed summary of the news (3-4 sentences). Do not use bullet points here, use a flowing executive narrative.</p>
        <div class="insight-box">
            <strong>Why it matters:</strong>
            <p>Direct, detailed application for Vopak employees or Super Admin policy improvements.</p>
            <strong>Strategic Value:</strong>
            <p>How it aligns with enterprise security, scaling, or the "Flow Forward" narrative.</p>
        </div>
        <a href="URL_HERE" class="read-more" target="_blank">Read Full Report</a>
    </div>
</div>
```

### 3. Distribution (GitHub Pages & Chat)
Save the generated HTML file locally to `.gemini/data/newsletters/YYYY-MM-DD.html`.
Then, you MUST use `run_shell_command` to commit and push the new HTML file to the `master` branch.

Finally, use `run_shell_command` with a `curl` POST request to the following webhook URL to notify the "Get news headlines summarized daily" space. Provide the `htmlpreview.github.io` URL so they can read the branded newsletter seamlessly on mobile or desktop.

Webhook URL:
`https://chat.googleapis.com/v1/spaces/AAQAqVVMfbw/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=7vUO6B8NRfCWVuS9k4CTeygmrZB_4mkbNyL4sNOHBr4`

Example curl command:
```bash
curl -X POST -H 'Content-Type: application/json' \
-d '{"text": "📰 *Vopak Strategic Intelligence*: Your daily briefing is ready.\n\nRead the full executive newsletter here:\nhttps://htmlpreview.github.io/?https://github.com/patriciosantamaria/geminiclaw/blob/master/.gemini/data/newsletters/YYYY-MM-DD.html"}' \
"https://chat.googleapis.com/v1/spaces/AAQAqVVMfbw/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=7vUO6B8NRfCWVuS9k4CTeygmrZB_4mkbNyL4sNOHBr4"
```