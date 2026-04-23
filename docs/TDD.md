# 👨‍💻 Technical Design Document (TDD): GeminiClaw

## 📂 1. File Structure & Organization
The workspace is organized into a core agentic layer (`.gemini/`) and functional project directories.

```text
/app/
├── .gemini/                  # Core Agent Intelligence & Configuration
├── .gemini_docker/           # Isolated state and MCP integrations
├── docs/                     # Architectural and Audit documents (ADD, TDD)
├── infra/                    # Dockerfiles and deployment infrastructure
├── projects/                 # Active AI integration projects (e.g., tank-inspection)
├── reports/                  # Generated HTML and PDF business reports
├── scripts/                  # Wrappers, sandboxing, and operational bash scripts
├── stitch-mcp/               # External UI/UX design MCP server
├── tools/                    # Utility scripts (generation, templating, verification)
├── wizard-bridge-mcp/        # Model Context Protocol server for Google Workspace
├── package.json              # Project dependencies
└── README.md                 # Project entry point
```

---

## ⚙️ 2. Core Components

### 🧠 2.1. Hybrid Memory Stack
The system implements a multi-modal memory stack to balance speed, structure, and semantic depth.

- **SQLite Engine:** Manages relational data in `.gemini/data/memory.db`.
  - **Tables:** 
    - `knowledge_index` (Key/Value/Source)
    - `roi_metrics` (Task/TimeSaved/Date)
    - `stakeholder_preferences` (Email/Pref/Context)
    - `proactive_triggers` (SourceID/Type/Summary) - Used heavily by subagents (e.g. `vopak-inbox-triage`) to pass urgent asynchronous signals to other agents (e.g. `vopak-morning-brief`).
- **Embedded Knowledge Engine:** A local SQLite Full-Text Search (FTS5) table for semantic context.
- **Ollama Integration:** The `MemoryClient` utilizes Ollama's `nomic-embed-text` model to generate 768-dimensional embeddings for all indexed documents.

### 💼 2.2. Memory Client API (`.gemini/core/memory-client.ts`)
The `MemoryClient` provides a high-level TypeScript interface:
- **`remember(id, content, category, project_id, metadata)`:** Generates an embedding via Ollama and persists the document + vector to SQLite.
- **`recall(query, nResults, category)`:** Performs a hybrid search combining FTS5 text match and Cosine Similarity (calculated in TypeScript memory) to retrieve the top-N relevant context blocks.
- **`getEmbedding(text)`:** Direct interface to the local embedding model.

---

## ⚙️ 3. The Proactive Indexer (Harvester)

### 🧺 3.1. Indexing Flow
The `.gemini/core/harvester.ts` script executes a multi-stage indexing pipeline:
1.  **Extraction:** Scans Google Calendar (7-day window) and Gmail (unread messages) for new data points.
2.  **Transformation:** Cleans and structures the data (e.g., parsing attendee status or extracting ServiceNow ticket IDs).
3.  **Loading:** Upserts structured facts and semantic context into the embedded SQLite FTS5 engine.

### ⏲️ 3.2. Background Execution (Systemd)
The indexing cycle is managed by `.gemini/infra/systemd/harvester.timer`, ensuring the memory is refreshed before the user's workday begins.
- **Service:** `.gemini/infra/systemd/harvester.service`
- **Schedule:** `OnCalendar=*-*-* 08:00:00`

---

## 🛠️ 4. Development Standards

### 🏷️ 4.1. Coding Style
- **TypeScript:** Preferred for all automation logic.
- **Strict Typing:** All interfaces must be explicitly defined.
- **Documentation:** Every script must include JSDoc or a detailed header.

### ✅ 4.2. Testing Strategy
Before any code change is finalized, it must undergo a 3-step validation:
1.  **Reproduction:** Confirm the current state or failure.
2.  **Implementation:** Apply surgical code changes.
3.  **Verification:** Execute unit tests or project-specific validation commands (e.g., `npm run test`).

---

## 🔌 5. External Tools Configuration
- **Gemini CLI:** Main execution engine.
- **gh CLI:** Authenticated via `patriciosantamaria`.
- **Jules Extension:** Used for project-wide refactoring and unit test generation.
- **Wizard Bridge MCP:** A custom Node.js server (`wizard-bridge-mcp`) providing 3-Tier dynamic script execution for Google Workspace APIs.

---

## 🛡️ 6. Error Handling & Logging
All automated services log to the system journal (`journalctl --user -u harvester`).
- **Retries:** The harvester service includes an exponential backoff for network-related failures.
- **DLP Safety:** Sensitive data is never logged; logs only contain process metadata.

---

**Technical Excellence for Global Transformation.** 🚢
logged; logs only contain process metadata.

---

**Technical Excellence for Global Transformation.** 🚢
