# 🦅 GeminiClaw: The 2026 Ultimate Agentic Transformation

Perform a comprehensive architectural upgrade to evolve GeminiClaw into a proactive, self-improving 'Digital Chief of Staff' (DCoS) following 2026 industry standards.

## 🏛️ Architectural Pillar 1: Commitment Tracking
**Objective:** Autonomous capture of 'soft commitments' from workspace context.
- **Implement:** `core/commitment-engine.ts`.
- **Logic:** Parse `latest_brief.json`, email summaries, and meeting notes for commitment language (e.g., "I will look into...", "Plan to...").
- **Persistence:** Index into SQLite `knowledge_index` with `type='COMMITMENT'` and `tag='URGENCY'`.
- **Integration:** Update `vopak-morning-brief` to proactively surface these in the 'Today's Snapshot' section.

## 🏛️ Architectural Pillar 2: The Autonomy Dial
**Objective:** Granular user control over agentic agency via trust levels.
- **Update:** `.gemini/settings.json` and core orchestrator to support a `trust_level` attribute.
- **Levels:** 
  - `OBSERVE`: Flag opportunities only.
  - `PLAN`: Draft plan/PR and wait for confirmation.
  - `EXECUTE`: Autonomously apply non-destructive changes.
- **Standard:** Every skill execution must now check the `trust_level` of its parent project.

## 🏛️ Architectural Pillar 3: Security Rings
**Objective:** Formalize defense-in-depth isolation using `isolated-vm`.
- **Standardize:** Update `wizard-bridge-mcp` to enforce security rings.
- **Ring Model:** 
  - **Ring 0 (Core):** Native system logic.
  - **Ring 3 (Skills):** Sandboxed Workspace scripts (128MB RAM, 30s timeout, NO filesystem access).
- **Verification:** Integrate `test-breakout.ts` as a non-negotiable CI gate.

## 🏛️ Architectural Pillar 4: Reflective Sleep Cycle
**Objective:** Automated self-improvement via daily log distillation.
- **Automate:** Configure a system service to trigger `vopak-self-reflection` as a nightly 'Sleep Cycle'.
- **Logic:** Identify successes/failures in the last 24h of `logs.json`.
- **Distillation:** Extract 'Lessons Learned' and store them in a dedicated ChromaDB collection.
- **Injection:** Ensure these lessons are injected into the system prompt of every new session to prevent repeating errors.

## 🏛️ Architectural Pillar 5: Event-Driven Proactivity
**Objective:** Ambient awareness via Cloud Pub/Sub.
- **Implement:** `core/pubsub-listener.ts`.
- **Logic:** Handle subscription events from Google Cloud Pub/Sub for Gmail and Calendar.
- **Triggers:** New events should autonomously invoke relevant worker skills (e.g., `vopak-inbox-triage`) to prepare briefings or drafts.

---

## 🛡️ Operational Standards
1. **Branding:** Adhere strictly to Vopak Branding v3.0 (Primary: #0a2373, Accent: #00cfe1, Font: Inter).
2. **Secrets:** ZERO hardcoded secrets. Use `op-env.sh` / `op run` only.
3. **Documentation:** Synchronize `ADD.md` and `GEMINI.md` with this 2026 architecture.
4. **Verifiability:** Provide an integration test demonstrating a commitment being captured and surfaced in a mock briefing.

This mission is a 'Flow Forward' strategic priority. Ensure the PR summary reflects the high ROI of transitioning to a Digital Chief of Staff model.
