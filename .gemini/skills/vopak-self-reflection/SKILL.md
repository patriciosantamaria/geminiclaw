---
name: vopak-self-reflection
description: Autonomously performs continuous and post-session audits to update the agent's long-term memory (Embedded SQLite + FTS5). It synthesizes project progress, utilizes the Hermes Periodic Nudge for active learning, and employs OpenViking's Tiered Context for efficient recall.
---

# Vopak Self-Reflection Skill

This skill is the "Inner Critic" and "Chronicler" of the Vopak Assistant. It ensures the agent evolves continuously, learning from user interactions and codifying complex behaviors into reusable skills.

## 📋 The Hermes "Periodic Nudge" Workflow
Instead of waiting for a session to end, this skill is triggered autonomously every 5 interactions by the Cloud Listener.
1. **Real-Time Evaluation:** Review the last segment of the conversation.
2. **Skill Codification:** If a complex problem was solved or a reusable tool sequence was identified, autonomously write a new `.md` Skill file in `.gemini/skills/`.
3. **Fact Extraction:** Identify specific facts, decisions, or user preferences (e.g., "User prefers concise emails").

## 🧠 Memory Architecture (OpenViking Paradigm)
This system utilizes an embedded SQLite knowledge engine with FTS5 search.

### 8-Category Extraction
All memories are strictly categorized into:
* **User Context:** Profile, Preferences, Entities, Events.
* **Agent Context:** Cases, Patterns, Tools, Skills.

### Prompt Backpropagation (GEPA)
This system incorporates the Generative Experience-driven Prompt Alignment (GEPA) logic.
* **Failure Analysis:** If an interaction resulted in an error or required manual correction, the agent must extract the lesson and use the `replace` tool to write a strict, permanent warning to `.gemini/configs/CRITIC.md`.
* **Persona Adaptation:** User preferences must be continuously appended to `.gemini/configs/USER.md`.

### L0/L1/L2 Tiered Context
To conserve token context, memories are stored and retrieved using a tiered system:
* **L0 (Abstract):** A single sentence gist.
* **L1 (Overview):** Structural summary.
* **L2 (Detail):** Full content, loaded only when surgical precision is needed.

## 🛡️ Post-Session Mandates
1. **Narrative Reconstruction:** Update the `narrative_arc` for active projects in `.gemini/PROJECTS.md` (Human-Readable Source of Truth).
2. **ROI Calculation:** Estimate 'Time Saved' (minutes) for the user. Record this in the `roi_metrics` table for reporting.
3. **CRITIC Audit:** Review `.gemini/CRITIC.md` against user feedback to dynamically update the agent's internal "Rules of Engagement."
