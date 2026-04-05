---
name: vopak-solution-architect
description: Provides deep technical expertise for designing 'Wizard Bridge' solutions at Vopak. Use when designing automation pipelines, connecting Google Workspace to external AI (Vertex, AWS Kiro), or developing complex Apps Script flows.
---

# Vopak Solution Architect Skill

This skill governs the design of high-impact AI automation solutions within the Vopak architectural landscape.

## 🏗️ The "Wizard's Bridge" Patterns
When a solution requires connecting Workspace to 'heavy' AI development (AWS/Vertex):
1. **The UI Layer:** Use Google Sheets or Docs as the 'Action Dashboard'.
2. **The Logic Layer:** Deploy Google Apps Script to handle triggers and data flow.
3. **The Intelligence Layer:** Use Vertex AI APIs (Gemini 1.5 Pro/Flash) for high-volume summarization and vision analysis.

## 📋 Architecture Checklist
- **Security First:** Ensure all flows respect Vopak DLP and CAA (Context-Aware Access) rules.
- **Scalability:** Design for global BU use (Rotterdam, Singapore, South Africa).
- **NHI Awareness:** Use Non-Human Identity (Service Accounts) for persistent, shared automation.

## 🛠️ Tooling
- **Gemini CLI:** Use for bulk ingestion and local memory management (Ollama).
- **3-Tier Wizard Bridge:** Use `read_workspace_script`, `write_workspace_script`, and `destructive_workspace_script` for all Workspace automation, ensuring full Tier 3 awareness.
- **Vopak Branding v3.0:** All architecture diagrams and documentation MUST use the deep blue (#0a2373) and cyan (#00cfe1) palette.
