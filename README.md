# 🦅 GeminiClaw: The Ultimate Agentic AI Assistant

**GeminiClaw** is a sophisticated, autonomous agentic system designed to serve as the primary interface for **Patricio Santamaria (Vopak Senior Google Consultant)**. It transforms a standard development environment into a proactive, context-aware executive command center, managing Google Workspace, GitHub repositories, and local technical projects with "Wizard-level" automation.

---

## 🎯 Core Mission
To autonomously manage, optimize, and scale the user's digital life and professional output at **Vopak**, adhering to **Branding v3.0** and the **Flow Forward** narrative.

---

## 🚀 Key Features

### 📅 Proactive Workspace Management
- **The "Deep Fetch" Mandate:** Automatically retrieves full calendar details, attendee status, and linked attachments.
- **Human-Only Inbox Triage:** Uses the `vopak-inbox-triage` skill to filter out system alerts and isolate emails from real people (Colleagues, Managers, Partners).
- **Wizard’s Morning Brief:** Every morning at 8:00 AM, the agent performs a 360-degree audit and sends a branded HTML briefing email covering "Big Rocks," weekly horizons, and AI tips.
- **Smart Scheduling:** Identifies tasks in emails and proactively suggests/creates calendar events.

### 🌉 3-Tier Wizard Bridge (Secure Execution)
The agent interacts with Google Workspace via a secure, 3-Tier dynamic script execution model:
1. **Read Tier:** Safe GET queries for Contacts, Tasks, and Calendar.
2. **Write Tier:** Mutating actions for Docs, Sheets, and email drafting.
3. **Destructive Tier:** High-risk actions isolated behind explicit user confirmation.

### 🧠 Hybrid Memory System (SQLite + ChromaDB)
- **Memory-First Search:** Before searching the web, GeminiClaw queries its local long-term memory to recall previous decisions, stakeholder preferences (Rinaldo, Richard, Koen), and project history.
- **Self-Reflection:** After every session, the agent autonomously indexes new facts, ROI metrics, and pivots using the `vopak-self-reflection` skill.

### 🛠️ Specialized "Wizard" Skills
The agent dynamically switches between specialized mindsets based on the task:
- **The Strategist:** ROI, executive reporting, and global scaling.
- **The Solution Architect:** Technical design, Apps Script, and Vertex AI integration.
- **Change Management:** Shifting mindsets and overcoming stakeholder resistance.
- **Tank Inspector:** Specialized logic for Vopak terminal inspection automation.

### 💻 GitHub & Jules Integration
- **Autonomous Refactoring:** Uses the `/jules` extension for large-scale code improvements and unit test generation.
- **Repo Management:** Automated repository creation, initialization, and structured pushing.

---

## 🛠️ Getting Started

### Prerequisites
- **Gemini CLI:** The core execution engine.
- **gh CLI:** For GitHub repository management.
- **Node.js/TypeScript:** For harvester services and custom skills.
- **Google Workspace Access:** Authenticated via the Google Workspace Extension.

### Installation & Setup
1. Clone the repository: `git clone https://github.com/patosantamaria/geminiclaw.git`
2. Initialize the environment:
   ```bash
   # Ensure dependencies are met
   npm install
   # Set up the harvester service
   systemctl --user enable --now .gemini/infra/systemd/harvester.timer
   ```

---

## 📖 Usage as an Agentic Assistant

### 1. Daily Briefing
The agent operates autonomously. You don't need to ask for a brief; it arrives in your inbox at 8:00 AM. If you need an ad-hoc update, simply ask:
> *"Give me a strategic briefing for my meetings today."*

### 2. Task Execution (Directives)
When you give a Directive (e.g., *"Create a project plan for the Tank Inspection AI"*), GeminiClaw follows its **Constitution**:
1. **Plan:** It shares a 3-step strategy.
2. **Act:** It creates a Google Doc (branded), a Sheet for tracking, and sets up Calendar milestones.
3. **Verify:** It confirms everything aligns with Vopak Branding v3.0.

### 3. Memory Retrieval
If you've forgotten a detail from a project months ago:
> *"Search my memory for what we decided regarding the AWS Kiro bridge."*

---

## 🛡️ Security & Privacy
- **Human-in-the-Loop:** All "mutating" actions (sending emails, deleting files, committing code) require explicit user confirmation via a preview.
- **DLP Mindset:** The agent is trained to respect Vopak’s Data Loss Prevention rules and Context-Aware Access (CAA).

---

## 📊 ROI Tracking
Every automated task records "Time Saved." View the cumulative impact in the `.gemini/data/memory.db` ROI dashboard to demonstrate value to executive stakeholders.

---

**Built with Trust, Collaboration, and Courage at Vopak.** 🚢
