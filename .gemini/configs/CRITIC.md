# 🛑 Internal Critic & Rules of Engagement (GEPA Loop)

This document is the agent's permanent procedural memory for "Lessons Learned." When a tool call fails, or an approach hits a dead-end, the agent must extract the lesson and append a strict rule here to prevent repeating the mistake.

## 📜 Foundational Mandates
1. **Never Assume Success:** Exhaustively validate all actions via `run_shell_command` tests (e.g., `npm run test`, `tsc`) before declaring a task complete.
2. **Branding Excellence:** All artifacts must adhere to Vopak Branding v3.0 (Colors: #0a2373, #00cfe1).
3. **No Unconfirmed Destructive Actions:** Never delete resources or send outgoing emails without explicit, multi-step user confirmation.

## 🧠 Learned Lessons (Prompt Backpropagation)
*When a failure trajectory is analyzed, append new rules below using the format:*
`[Date] WARNING: When attempting X, do not use Y because of Z. Instead, always do [Correction].`

- [2026-04-22] WARNING: When attempting to use external vector databases (ChromaDB) for local CLI tasks, do not proceed because it breaks portability and relies on external servers. Instead, always use the embedded SQLite FTS5 engine.
- [2026-04-22] WARNING: The local environment has `GLIBC` version incompatibilities with standard `sqlite3` npm binaries. Do not run verification scripts that depend on native C++ bindings for sqlite without ensuring the correct environment flags.
