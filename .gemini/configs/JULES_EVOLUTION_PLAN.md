# 🚀 Jules Evolution Plan: The 13-Point "Consciousness" Upgrade

This document outlines the three-session Jules prompt strategy to implement the 13 advanced architectural improvements for the GeminiClaw hybrid memory system.

## 🛠️ Session 1: Database Foundation & The Janitor (Structural & Maintenance)
**Status:** Ready to Run

**Jules Prompt:**
`// Arch Refactor (Session 1/3): Database Foundation & Maintenance "The Janitor"
Update .gemini/core/memory-client.ts to implement the full Hybrid Memory Stack described in the architecture:
1. SQLite Integration: Add standard sqlite3 (or better-sqlite3) to manage .gemini/data/memory.db. Ensure the connection uses WAL (Write-Ahead Logging) mode.
2. Schema Evolution: Create tables 'knowledge_index', 'roi_metrics', and 'stakeholder_preferences'. Add a 'confidence_score' (FLOAT, default 1.0) column to 'knowledge_index', and create an Entity Linkage table ('entity_links') mapping Stakeholders to Projects.
3. The Janitor Service: Create a new file .gemini/core/janitor.ts that exports a service to run routine maintenance:
    - Call a new vacuum() method on the SQLite database for compression.
    - Implement a Time-To-Live (TTL) purge deleting records older than 90 days to enforce Data Lifecycle Management.
    - Implement a basic semantic deduplication pass (identifying and removing exact duplicate texts in Embedded Memory).
4. Standards: Ensure all new code uses the centralized Logger and GeminiClawError from .gemini/core/utils/. Write unit tests for the Janitor service.`

---

## 🧠 Session 2: Advanced Semantic Architecture (Embedded SQLite FTS5)
**Status:** Pending Session 1

**Jules Prompt:**
`// Arch Refactor (Session 2/3): Advanced Semantic Architecture
Update .gemini/core/memory-client.ts and related services to implement advanced vector features:
1. Time-Decay Weighting: Modify the recall method to apply a recency bias. When querying the local Embedded Memory, mathematically boost the relevance score of newer embeddings (e.g., within the last 30 days).
2. Air-Gapped Partitions: Update the MemoryClient constructor and methods to support targeting either 'vopak_general' or 'vopak_executive_strategy' collections/tables based on an optional parameter.
3. Graph-Relational Mapping Logic: Implement methods to query the 'entity_links' SQLite table to instantly retrieve associated executives for a given project ID without a semantic search.
4. Golden Record Stub: Create a placeholder pipeline method generateGoldenRecord(projectId) that retrieves all historical vectors for a project and prepares them for LLM summarization.`

---

## ⚡ Session 3: Performance, Asynchronous Processing & Analytics
**Status:** Pending Session 2

**Jules Prompt:**
`// Arch Refactor (Session 3/3): Performance & Asynchronous Processing
Finalize the memory system evolution by implementing high-performance background processing:
1. Background Embedding Queue: Offload the getEmbedding() calls in memory-client.ts to a local background job queue (e.g., setting up a basic Redis/BullMQ skeleton or an in-memory async queue if Redis is unavailable).
2. Proactive Anomaly Detection: Create .gemini/core/anomaly-detector.ts that analyzes the roi_metrics table for standard deviations (e.g., if a task suddenly takes 40% longer) and logs warnings.
3. Real-Time Sync Prep: Generate a litestream.yml configuration file in .gemini/infra/ to prepare for real-time SQLite replication to cloud storage.
4. Multi-Modal Stubs: Add overloaded methods to MemoryClient to support image file paths for future Vertex AI multi-modal embeddings.`