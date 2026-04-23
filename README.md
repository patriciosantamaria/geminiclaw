# 🦅 GeminiClaw: The Ultimate Agentic AI Assistant

**GeminiClaw** is a sophisticated, autonomous agentic system designed to serve as the primary interface for **Patricio Santamaria (Vopak Senior Google Consultant)**. It transforms a standard development environment into a proactive, context-aware executive command center, managing Google Workspace, GitHub repositories, Google Cloud (GCP), and local technical projects with "Wizard-level" automation.

---

## 🎯 Core Mission
To autonomously manage, optimize, and scale the user's digital life and professional output at **Vopak**, adhering to **Branding v3.0** and the **Flow Forward** narrative.

---

## 📚 Documentation Directory

For a deep dive into the architecture, capabilities, and technical implementation of GeminiClaw, please refer to the detailed documentation in the `docs/` folder:

*   **[Architectural Design Document (ADD)](docs/ADD.md):** High-level overview of the V4.0 "Consciousness" architecture, the Wizard's Council mindset, and core integrations.
*   **[Technical Design Document (TDD)](docs/TDD.md):** In-depth technical specifications of the file structure, Hybrid Memory Stack (SQLite + FTS5 + Ollama), and the Proactive Indexer (Harvester).
*   **[Agent Capabilities & Rules](docs/AGENT_CAPABILITIES.md):** The comprehensive list of all active Sub-Agents, Specialized Skills, and the strict operational Guardrails (Constitution).
*   **[System Map & Auto-Repair](docs/SYSTEM_MAP.md):** The source of truth for the physical architecture, MCP server configurations, and auto-repair protocols.
*   **[Audit Report](docs/AUDIT_REPORT.md):** The latest security and compliance audit regarding secrets, tools, and execution layer boundaries.

---

## 🚀 High-Level Overview

### 1. Proactive Agentic Workflows (Sub-Agents)
GeminiClaw uses asynchronous **Sub-Agents** to perform heavy lifting without cluttering the main conversation:
- **`vopak-morning-brief` & `vopak-inbox-triage`**: Automatically scans the calendar and inbox, scores cognitive load, creates "Deep Work" blocks, and delivers a branded morning brief via Google Chat webhooks.
- **`vopak-news-intelligence` & `vopak-deep-research`**: Autonomously scrapes RSS feeds and GitHub repositories to synthesize highly technical, branded executive newsletters.
- **`vopak-cloud-engineer`**: Fully autonomous GCP (`gcloud`) and Apps Script (`clasp`) provisioning, equipped with strict destructive-action guardrails.
- **`vopak-synthesis`**: Generates exact, math-verified weekly and monthly business reports directly into Google Docs.

### 2. Specialized Personas & Guardrails (Skills)
GeminiClaw dynamically switches between specialized mindsets using **Skills**:
- **The Chief Architect & Transformation Lead:** For high-level AWS/Vertex integration design and enterprise change management.
- **The Ghostwriter:** For drafting emails and reports that perfectly match Patricio's strategic, concise tone.
- **The CAA Architect:** For designing secure Context-Aware Access policies via "Execution Manifests" for Super Admins.
- **Branding Validator:** Enforces Vopak Branding v3.0 (Deep Blue `#0a2373`, Cyan `#00cfe1`) across all outputs.

### 3. The Hybrid Memory Stack
Before acting, GeminiClaw queries its **Embedded Memory System**:
- **Relational (`memory.db`):** Tracks ROI metrics, stakeholder preferences, and `proactive_triggers` (signals passed between sub-agents).
- **Vector/Semantic (FTS5 + Ollama):** Uses local `nomic-embed-text` embeddings for hybrid text and cosine-similarity searches to recall past project context and meeting notes.
- **Self-Reflection (`vopak-self-reflection`):** A native engine that parses CLI chat logs post-session to extract lessons, update rules, and codify new skills autonomously.

### 4. 3-Tier Wizard Bridge (Secure Workspace Execution)
GeminiClaw interacts with Google Workspace via a custom, secure Model Context Protocol (MCP) server isolated in a V8 VM:
1. **Tier 1 (Safe):** Read-only fetching (Calendar, Gmail).
2. **Tier 2 (Mutating):** Creating Docs, Sheets, and Drafts.
3. **Tier 3 (Dangerous):** Destructive actions, strictly gated by user confirmation.

---

## 🛡️ Security First
- **No Hardcoded Secrets:** All credentials rely on `op://` 1Password references or local environment manifests.
- **Human-in-the-Loop:** All mutating or destructive actions require explicit user confirmation via a preview.
- **DLP Mindset:** Adheres to enterprise Data Loss Prevention rules, ensuring sensitive Vopak data is handled securely.

---

**Built with Trust, Collaboration, and Courage at Vopak.** 🚢
