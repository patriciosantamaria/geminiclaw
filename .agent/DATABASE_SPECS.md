# Local Memory Interface: Hybrid Database

This project implements a dedicated memory system using local infrastructure.

## 🏗️ Stack
- **Vector Database:** ChromaDB (port 8000)
- **Embedding Model:** nomic-embed-text (Ollama, port 11434)
- **Structured Database:** SQLite (.agent/memory.db)
- **Orchestration:** TypeScript

## 📂 Database Schema (Structured)
### Projects
- id (UUID)
- name (String)
- status (Active/Archived)
- narrative_arc (Text)

### Stakeholders
- email (PK)
- name
- role
- context_notes (Text)

### Knowledge_Index
- key (String)
- value (Text)
- source_id (Doc/Email ID)
- last_updated (Timestamp)
