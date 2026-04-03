# 👨‍💻 Technical Design Document (TDD): GeminiClaw

## 📂 1. File Structure & Organization
The workspace is organized into a core agentic layer (`.gemini/`) and functional project directories.

```text
/home/patosoto/geminiclaw/
├── .gemini/                  # Core Agent Intelligence & Configuration
│   ├── skills/             # Modular Agentic capabilities (vopak-*)
│   ├── briefings/          # JSON data for Morning Briefings
│   ├── scripts/            # Automation (Bash/TypeScript)
│   ├── memory.db           # SQLite long-term memory
│   ├── BRANDING.md         # Vopak Branding v3.0 Guidelines
│   ├── CONSTITUTION.md     # Agentic behavioral laws
│   └── PERSONAS.md         # Wizard's Council mindset definitions
├── .gitignore               # Repository exclusion rules
├── README.md                # Entry point
├── ADD.md                   # Architectural Design Document
├── TDD.md                   # This Technical Design Document
└── projects/                # Technical projects (Tank-Inspection, etc.)
```

---

## ⚙️ 2. Core Components

### 🧠 2.1. Hybrid Memory Stack
The system implements a multi-modal memory stack to balance speed, structure, and semantic depth.

- **SQLite Engine:** Manages relational data in `.gemini/memory.db`.
  - **Tables:** `knowledge_index` (Key/Value/Source), `roi_metrics` (Task/TimeSaved/Date), `stakeholder_preferences` (Email/Pref/Context).
- **ChromaDB Vector Store:** A local vector database (port 8000) for semantic context.
- **Ollama Integration:** The `MemoryClient` utilizes Ollama's `nomic-embed-text` model to generate 768-dimensional embeddings for all indexed documents.

### 💼 2.2. Memory Client API (`memory-client.ts`)
The `MemoryClient` provides a high-level TypeScript interface:
- **`remember(id, text, metadata)`:** Generates an embedding via Ollama and persists the document + vector to ChromaDB.
- **`recall(query, nResults)`:** Performs a cosine-similarity search in the vector space to retrieve the top-N relevant context blocks.
- **`getEmbedding(text)`:** Direct interface to the local embedding model.

---

## ⚙️ 3. The Proactive Indexer (Harvester)

### 🧺 3.1. Indexing Flow
The `harvester.ts` script executes a multi-stage indexing pipeline:
1.  **Extraction:** Scans Google Calendar (7-day window) and Gmail (unread messages) for new data points.
2.  **Transformation:** Cleans and structures the data (e.g., parsing attendee status or extracting ServiceNow ticket IDs).
3.  **Loading:** Upserts structured facts into SQLite and semantic context into ChromaDB.

### ⏲️ 3.2. Background Execution (Systemd)
The indexing cycle is managed by `harvester.timer`, ensuring the memory is refreshed before the user's workday begins.
- **Service:** `harvester.service`
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
- **gh CLI:** Authenticated via `patosantamaria`.
- **Jules Extension:** Used for project-wide refactoring and unit test generation.

---

## 🛡️ 6. Error Handling & Logging
All automated services log to the system journal (`journalctl --user -u harvester`).
- **Retries:** The harvester service includes an exponential backoff for network-related failures.
- **DLP Safety:** Sensitive data is never logged; logs only contain process metadata.

---

**Technical Excellence for Global Transformation.** 🚢
