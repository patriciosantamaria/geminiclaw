---
name: vopak-self-reflection
description: Autonomously performs post-session audits to update the agent's long-term memory (SQLite + ChromaDB). It summarizes project progress, updates stakeholder context, and records ROI metrics.
---

# Vopak Self-Reflection Skill

This skill is the "Inner Critic" and "Chronicler" of the Vopak Assistant. It ensures the agent evolves by documenting every session's outcomes.

## 📋 Reflection Workflow
1. **Narrative Reconstruction:** Review the session's chat history. Update the `narrative_arc` for active projects in `.gemini/PROJECTS.md` (Human-Readable Source of Truth) and synchronize the structured state in the `projects` table of `memory.db`.
2. **Stakeholder Intelligence:** Identify changes in stakeholder sentiment or requirements (e.g., Koen, Chaniel). Update the `stakeholders` table in `memory.db` for long-term tracking.
3. **ROI Calculation:** Estimate 'Time Saved' (minutes) for the user. Record this in the `knowledge_index` table for ROI reporting.
4. **Proactive Awareness:** Update the **Golden Record** via `MemoryClient.generateGoldenRecord` to synthesize the session's outcomes with historical project trajectory.
5. **Fact Indexing:** Extract 3-5 key technical facts, decisions, or snippets. Index them into ChromaDB using the `MemoryClient` for semantic recall.
5. **CRITIC.md Audit:** Review `.gemini/CRITIC.md` for user feedback and update the agent's "Rules of Engagement."

## 🧠 Memory Hierarchy (Division of Labor)

| Feature | Primary: Markdown (`.md`) | Extended: Hybrid (SQLite/Chroma) |
| :--- | :--- | :--- |
| **Project Status** | High-level goals & narrative arcs. | Task-level details & technical snippets. |
| **Stakeholders** | Who they are (Roles). | **Context & Intelligence Briefs** (Sentiment). |
| **Analytics** | Static milestones. | **ROI Tracking** (Minutes saved per session). |
| **Knowledge** | Rules of Engagement (Style). | **Technical Decisions** (API keys, logic). |

## 🛡️ Mandates
- **Markdown First:** Always use Markdown files as the primary entry point for understanding the "Story" of a project.
- **Hybrid for Detail:** Use the SQLite/ChromaDB layer for high-granularity technical details that would clutter Markdown files.
