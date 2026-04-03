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
For each category, synthesize the findings into a professional, HTML-formatted email structure. Filter out low-signal noise. Each distinct news item MUST include:
*   **Summary:** A concise 2-sentence description of the release or news.
*   **Why it's useful:** Direct application for Vopak employees or Super Admin policy improvements.
*   **Strategic Value:** How it aligns with enterprise security, scaling, or the "Flow Forward" narrative.
*   **Link:** An HTML hyperlink (`<a href="...">`) to the original source.

### 3. Drafting (Strict Guardrail)
You MUST NOT send these emails autonomously. Use `mcp_google-workspace_gmail.createDraft` to create 3 separate email drafts for the users to review.
*   **To:** `patricio.santamaria@vopak.com, yassin.bahasuan@vopak.com`
*   **isHtml:** `true`
*   **Subjects:**
    1. `Vopak AI Intelligence: Google Workspace Updates (Daily Briefing)`
    2. `Vopak AI Intelligence: GCP & Vertex AI Ecosystem (Daily Briefing)`
    3. `Vopak AI Intelligence: Agentic Ecosystem & General AI (Daily Briefing)`

Ensure the drafts are cleanly formatted with `<h2>` and `<h3>` tags for high readability.