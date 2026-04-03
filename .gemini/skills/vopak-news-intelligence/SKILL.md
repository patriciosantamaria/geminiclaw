# Skill: Vopak News Intelligence

## Description
Autonomously searches for the latest strategic news (past 24 hours) across Google Workspace, Google Cloud/Vertex AI, and the broader Agentic AI ecosystem. Synthesizes the findings into 3 highly strategic email drafts tailored for Vopak Super Admins (Patricio Santamaria & Yassin Bahasuan).

## Core Instructions
When activated, you MUST perform the following steps sequentially. Use your high-level executive persona to format these emails.

### 1. Intelligence Gathering
Execute `google_web_search` (in parallel if possible) to find the most significant news from the past 24-48 hours for the following three categories:
1.  **Google Workspace Updates:** Search `site:workspaceupdates.googleblog.com OR "Google Workspace" updates news`
2.  **GCP & Vertex AI Ecosystem:** Search `"Google Cloud" OR "Vertex AI" OR "Google AI Studio" news`
3.  **General AI & Agents:** Search `"Anthropic" OR "ChatGPT" OR "AWS AI" OR "AI Agents" OR "Gemini CLI" OR "OpenClaw" OR "google antigravity" news`

### 2. Synthesis & Formatting
Synthesize the findings from all three categories into a single, beautifully styled HTML file (a "Daily Newsletter"). Filter out low-signal noise. For each category, create a section containing the news items. Each distinct news item MUST include:
*   **Summary:** A concise 2-sentence description of the release or news.
*   **Why it matters:** Direct application for Vopak employees or Super Admin policy improvements.
*   **Strategic Value:** How it aligns with enterprise security, scaling, or the "Flow Forward" narrative.
*   **Link:** An HTML hyperlink to the original source.

### 3. Distribution (Google Chat)
Save the generated HTML file locally to `.gemini/data/newsletters/YYYY-MM-DD.html`.
Then, you MUST use the `mcp_google-workspace_chat.sendDm` tool to send a direct message to `patricio.santamaria@vopak.com` and `yassin.bahasuan@vopak.com` notifying them that the daily intelligence briefing is ready. Provide the absolute file path (e.g., `file:///home/patosoto/geminiclaw/.gemini/data/newsletters/YYYY-MM-DD.html`) in the chat message so they can easily open it in their browser.