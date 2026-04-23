# Local Memory Interface: Hybrid Database

This project implements a dedicated memory system using local infrastructure.

## 🏗️ Stack
- **Vector Database:** Embedded SQLite FTS5 & Cosine Similarity
- **Embedding Model:** nomic-embed-text (Ollama, port 11434)
- **Structured Database:** SQLite (.gemini/memory.db)
- **Orchestration:** TypeScript

## 📂 Database Schema (Structured)

### Projects
- **id** (TEXT, PK): Unique identifier for the project.
- **name** (TEXT): Project name.
- **status** (TEXT): Current status (e.g., Active, Archived).
- **narrative_arc** (TEXT): Long-term context and strategic direction.

### Stakeholders
- **email** (TEXT, PK): Stakeholder's email.
- **name** (TEXT): Full name.
- **role** (TEXT): Corporate role or title.
- **context_notes** (TEXT): Personal preferences and specific interaction context.

### Knowledge_Index
- **id** (INTEGER, PK AUTOINCREMENT): Unique record ID.
- **key** (TEXT): Searchable key or topic.
- **value** (TEXT): Fact or information block.
- **source_id** (TEXT): Reference to original document or email.
- **project_id** (TEXT, FK): Link to a project.
- **last_updated** (DATETIME): Timestamp of last modification.
- **time_saved_minutes** (INTEGER): ROI metric for tasks associated with this record.

### Interactions
- **stakeholder_email** (TEXT, FK): Reference to stakeholder.
- **date** (DATETIME): Interaction timestamp.
- **context** (TEXT): Summary of the interaction.
- **frequency_score** (INTEGER): Tracking for relationship prioritization.

### Branding_Assets
- **element** (TEXT, PK): Branding element name (e.g., primary_color).
- **value** (TEXT): The hex code, font name, or asset path.
- **description** (TEXT): Context on how to use the asset.

### Agent_Performance
- **date** (DATETIME): Timestamp of the event.
- **task** (TEXT): Description of the task performed.
- **status** (TEXT): Result (Success/Failure/Hallucination).
- **correction** (TEXT): Feedback or correction applied for future learning.
