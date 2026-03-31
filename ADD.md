# 🏗️ Architectural Design Document (ADD): GeminiClaw

## 📌 1. Overview
**GeminiClaw** is an agentic AI system designed to integrate deeply with **Google Workspace**, **GitHub**, and **local development environments**. It is not a standard chatbot but a proactive orchestrator that manages time, tasks, and technical projects autonomously.

---

## 🏗️ 2. System Architecture

### 🛡️ 2.1. The "Wizard's Council" (Mindset Selector)
The system's core intelligence is segmented into specialized mindsets, each with its own focus and ruleset:
- **Strategist:** Executive-level decision making and ROI analysis.
- **Solution Architect:** Deep technical design and automation.
- **Transformation Expert:** Change management and stakeholder alignment.
- **Lead Trainer:** Simplification and education.

### 🧠 2.2. Hybrid Memory System
The system maintains a dual-layer persistent memory:
1.  **SQLite (Relational):** Stores structured metadata, project milestones, ROI metrics, and task statuses.
2.  **ChromaDB (Vector/Semantic):** Stores unstructured context, previous meeting summaries, and technical research for semantic retrieval via Ollama.

### ⚡ 2.3. Agentic Loops (Plan -> Act -> Verify)
- **Planning:** The agent decomposes complex user directives into discrete sub-tasks.
- **Action:** Sub-tasks are executed across multiple toolsets (Workspace, Git, Shell).
- **Verification:** Every action is verified against the system's **Constitution** and the user's **Branding Guidelines**.

---

## 🔌 3. Core Integrations

### 💼 3.1. Google Workspace
The primary data source and output medium. The system treats Google Docs, Slides, and Sheets as API-controllable primitives for generating professional-grade corporate artifacts.

### 🐙 3.2. GitHub & Jules
The system uses the **Jules** extension for high-level repository tasks, enabling autonomous refactoring, dependency management, and code analysis.

---

## 📅 4. Periodic Services (Harvester)
The system includes background services (systemd timers) that trigger periodic tasks:
- **Daily Audit (8:00 AM):** 360-degree check of the calendar and task list.
- **Morning Briefing:** Autonomous generation and delivery of the daily strategy email.
- **Self-Reflection:** Post-session indexing of new information into the Hybrid Memory system.

---

## 🛡️ 5. Security & Safety

### 🚦 5.1. Human-in-the-Loop
No data-mutating action (e.g., sending an email, deleting a file, or committing code) occurs without a user-visible preview and explicit confirmation.

### 🧩 5.2. Context-Aware Access (CAA)
The agent is designed to operate within the constraints of Vopak's security policies, prioritizing non-human identity (NHI) for persistent flows and adhering to DLP standards.

---

## 🚀 6. Future Roadmap
- **Global Scaling:** Expanding the "Flow Forward" narrative to global Business Units (BU).
- **ROI Dashboard:** A visual interface for the recorded productivity gains.
- **Autonomous Training:** Auto-generating "Wizard Tips" based on common user patterns.
