---
name: vopak-self-reflection
description: Autonomously performs post-session audits to update the agent's long-term memory (SQLite + ChromaDB). It summarizes project progress, updates stakeholder context, and records ROI metrics.
---

# Vopak Self-Reflection Skill

This skill is the "Inner Critic" and "Chronicler" of the Vopak Assistant. It ensures the agent evolves by documenting every session's outcomes.

## 📋 Reflection Workflow
1. **Narrative Reconstruction:** Review the session's chat history and document changes. Update the `narrative_arc` for active projects in `.agent/PROJECTS.md` and SQLite.
2. **Stakeholder Intelligence:** Identify any changes in stakeholder sentiment or requirements (e.g., Koen, Chaniel, Daria). Update the `Stakeholders` table in `memory.db`.
3. **ROI Calculation:** Estimate the 'Time Saved' (minutes) for the user during this session. Record this in the `Knowledge_Index` table.
4. **Fact Indexing:** Extract 3-5 key technical facts or decisions and index them into ChromaDB using the `MemoryClient`.
5. **CRITIC.md Audit:** Read `.agent/CRITIC.md` for new user feedback and update the agent's "Rules of Engagement" accordingly.

## 🛡️ Mandates
- **Memory Consistency:** Never let the local database get out of sync with the actual project state.
- **Privacy:** All reflection data must be stored locally.
- **Proactiveness:** Suggest one "Wizard Upgrade" based on the patterns identified in the session.
