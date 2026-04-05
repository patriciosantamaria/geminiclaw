# 🏗️ Architectural Design Document (ADD): GeminiClaw V4.0 "Consciousness"

## 📌 1. Overview
**GeminiClaw V4.0** is an agentic AI system designed to integrate deeply with **Google Workspace**, **GitHub**, and **local development environments**. This version adds "Strategic Consciousness"—the ability to synthesize past/present/future data and proactively manage the user's workload.

---

## 🏗️ 2. System Architecture

### 🛡️ 2.1. The "Wizard's Council" (Mindset Selector)
The system's core intelligence is segmented into specialized mindsets, each with its own focus and ruleset:
- **Strategist:** Executive-level decision making and ROI analysis.
- **Solution Architect:** Deep technical design and automation.
- **Transformation Expert:** Change management and stakeholder alignment.
- **Lead Trainer:** Simplification, education, and Training Program generation.
- **Super Admin Bridge:** Secure design and execution plans for Admin tasks (CAA).

### 🧠 2.2. Hybrid Memory System
The system maintains a dual-layer persistent memory for high-fidelity context retention:
1.  **SQLite (Relational - `.gemini/data/memory.db`):** Stores structured metadata, project milestones, ROI metrics, and task statuses.
2.  **ChromaDB (Vector/Semantic):** Stores unstructured context, previous meeting summaries, technical research, and **Google Chat Context**.

### ⚡ 2.3. Agentic Loops (Plan -> Act -> Verify)
- **Planning:** The agent decomposes complex user directives into discrete sub-tasks.
- **Action:** Sub-tasks are executed across multiple toolsets (Workspace, Git, Shell).
- **Verification:** Every action is verified against the system's **Constitution** and the user's **Branding Guidelines (Vopak v3.0)**.

---

## 🚀 3. Strategic Enhancements (V4.0 Upgrade)

### 🧠 3.1. Predictive "Cognitive Load" Triage
The `vopak-inbox-triage` skill now assigns a complexity score (1-5) to incoming communications. For scores >3, the agent autonomously proposes "Deep Work" sessions in the user's calendar.

### 🛡️ 3.2. The "Super Admin Bridge"
To maintain security, the agent generates **Admin Execution Manifests** for tasks requiring Super Admin privileges, providing clear, auditable steps without requiring direct agent access to the console.

### 📐 3.3. Automated "Blueprint-to-Slide" Pipeline
A unified workflow that transforms a single technical description into a comprehensive **Google Doc (ADD)** and a corresponding **Google Slide Deck (Executive Briefing)**, all adhering to Branding v3.0.

### ⏳ 3.4. Temporal "Narrative Arc" Memory
The agent now synthesizes project history into a chronological context (Yesterday/Today/Tomorrow), ensuring every interaction is grounded in the project's long-term momentum.

---

## 🔍 4. The Indexer and Harvester
The "Strategic Harvester" is the system's proactive indexing engine. It gathers context to keep the memory fresh.

### 🧺 4.1. Proactive Data Gathering
- **The "Deep Fetch" Scan:** Every 24 hours (triggered at 08:00 AM), the harvester performs a 7-day rolling scan of the user's calendar.
- **ServiceNow Triage:** Scans incoming emails for "INC" or "RITM" numbers, automatically cross-referencing them with the local knowledge index.
- **Cognitive Load Analysis:** Each unread human email is scored (1-5) for technical complexity.
- **Cross-Workspace Context:** Scans high-level Google Chat spaces to find new ideas or recurring friction points.

### 🪞 4.2. Self-Reflection & Post-Session Indexing
After every significant interaction, the `vopak-self-reflection` skill triggers a "reflection loop" where the agent:
1.  Summarizes the key takeaways of the session.
2.  Extracts new stakeholder preferences (e.g., "Rinaldo prefers concise summaries").
3.  Calculates ROI metrics (Time Saved) and indexes them into the SQLite database.
4.  Updates the project's **"Temporal Narrative Arc"** (Past/Present/Future) in the vector store.

---

## 🔌 5. Core Integrations

### 💼 5.1. Google Workspace & The 3-Tier Wizard Bridge
The system treats Google Docs, Slides, and Sheets as API-controllable primitives for generating professional-grade corporate artifacts (Vopak Branding v3.0). It bypasses standard, limited API tools in favor of the **Wizard Bridge MCP**, which allows dynamic JavaScript execution directly against the `googleapis` SDK. To ensure maximum security, the MCP server utilizes **`isolated-vm`** for all script executions, providing a hardened, V8-level sandbox. To ensure safety, it is split into three strictly isolated tiers:
1.  **`read_workspace_script` (Safe):** Used for discovering context, scanning the Inbox for "real humans" via the `vopak-inbox-triage` skill, and fetching Contacts/Tasks.
2.  **`write_workspace_script` (Mutating):** Used for drafting emails, creating branded reports, and organizing Drive folders.
3.  **`destructive_workspace_script` (Dangerous):** Isolated for trashing files or deleting data, always triggering explicit confirmation.

### 🌉 5.2. Super Admin Bridge
Since the agent operates on a standard account, it provides "Execution Manifests" for tasks requiring Super Admin privileges, ensuring security and compliance with Vopak's CAA policies.

### 🐙 5.3. GitHub & Jules
The system uses the **Jules** extension for high-level repository tasks, enabling autonomous refactoring, dependency management, and code analysis.

---

## 🛡️ 6. Security & Safety

### 🚦 6.1. Human-in-the-Loop
No data-mutating action (e.g., sending an email, deleting a file, or committing code) occurs without a user-visible preview and explicit confirmation.

### 🧩 6.2. Context-Aware Access (CAA)
The agent is designed to operate within the constraints of Vopak's security policies, prioritizing non-human identity (NHI) for persistent flows and adhering to DLP standards.

### 🔑 6.3. Secret Management & 1Password
GeminiClaw strictly prohibits hardcoded secrets. All environment variables and credentials must be managed via **1Password**, with local `.env` files acting solely as manifests using `op://` references to ensure no plain-text secrets reside on disk.

---

## 🚀 7. Future Roadmap
- **Global Scaling:** Expanding the "Flow Forward" narrative to global Business Units (BU).
- **ROI Dashboard:** A visual interface for the recorded productivity gains.
- **Autonomous Training:** Auto-generating "Wizard Tips" based on common user patterns and technical friction points.
