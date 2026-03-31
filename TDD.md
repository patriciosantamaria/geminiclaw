# 👨‍💻 Technical Design Document (TDD): GeminiClaw

## 📂 1. File Structure & Organization
The workspace is organized into a core agentic layer (`.agent/`) and functional project directories.

```text
/home/patosoto/geminiclaw/
├── .agent/                  # Core Agent Intelligence & Configuration
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

### 🧠 2.1. Hybrid Memory Client (`memory-client.ts`)
A TypeScript-based client for interacting with the SQLite/ChromaDB memory layers.
- **SQLite Schema:** `knowledge_index`, `roi_metrics`, `stakeholder_preferences`.
- **Vector Search:** Integrated with **Ollama** for local embedding generation and semantic similarity.

### 💼 2.2. Workspace Automation Layer
Utilizes the **Google Workspace Extension** tools to perform programmatic actions:
- **`docs.create` / `slides.create`:** Uses branding templates to ensure consistency.
- **`calendar.listEvents`:** Scans a 7-day rolling horizon for the "Morning Audit."
- **`gmail.send`:** Drafts and dispatches branded HTML emails.

---

## ⏲️ 3. Background Services (Systemd)

### 🧺 3.1. Harvester Service (`harvester.service`)
A systemd unit that executes the `harvester.ts` script.
- **Responsibility:** Auditing the calendar, identifying new tasks in emails, and gathering technical intelligence for upcoming meetings.

### ⏰ 3.2. Harvester Timer (`harvester.timer`)
Triggers the harvester service daily at **08:00 AM**.

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
