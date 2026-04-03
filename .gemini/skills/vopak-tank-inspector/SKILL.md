---
name: vopak-tank-inspector
description: Automates reporting and data ingestion for the Vopak global tank inspection platform. Use for analyzing drone frames via Vertex AI, generating branded reports, and auditing terminal inspections.
---

# Vopak Tank Inspector Skill

This skill automates the 'Manual Data Trap' in tank inspections by using agentic AI to process visual and sensor data into actionable insights.

## 🎯 Core Objectives
1. **Automated Data Ingestion:** Process drone frames and NDT (Non-Destructive Testing) reports.
2. **Vertex AI Vision Bridge:** Detect corrosion and structural anomalies in visual data.
3. **Branded Report Generation:** Generate terminal-ready inspection reports following Branding v3.0.

## 📋 Operational Workflow
- **Ingestion:** Scan GCP storage for new inspection data.
- **Analysis:** Trigger Vertex AI Vision pipelines for automated feature detection.
- **Audit:** Cross-reference findings with historical terminal data in `memory.db`.
- **Reporting:** Format results into a Vopak Deep Blue (#0a2373) PDF/Doc.

## 🛡️ Safety & Compliance
- **Verification:** All structural findings MUST be verified by a human Lead Inspector.
- **DLP:** Terminal coordinates and sensitive infrastructure data must be handled according to Vopak CAA rules.
