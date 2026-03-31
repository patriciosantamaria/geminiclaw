---
name: vopak-tank-inspector
description: Automates the end-to-end inspection reporting for Vopak tanks. It monitors Drive folders for new inspection data, Correlates drone imagery with technical dossiers using Vertex AI, and generates branded reports.
---

# Vopak Tank Inspector Skill

This skill is the core automation engine for the Tank Inspection Platform AI project.

## 🏗️ Technical Architecture
- **Vision Model:** Vertex AI (Gemini 1.5 Flash/Pro) for frame-by-frame corrosion analysis.
- **Data Ingestion:** Automated indexing of raw PDFs and technical data into Vertex AI Search/Vector Search.
- **Reporting Engine:** Dynamic Google Doc generation following Vopak Branding v3.0.

## 📋 Operational Workflow
1. **Identify Source:** Locate new inspection data in the "M2O - Tank Inspection Platform" Drive folder.
2. **Technical Extraction:** Extract key parameters (tank number, inspection date, identified defects).
3. **Report Generation:** Autonomously create a draft in Google Docs using formatted headings and branded colors.
4. **Stakeholder Notification:** Prepare a Gmail draft for relevant technical leads (e.g., Koen, Svetlana).

## 🛡️ Mandates
- **GCP Native:** All heavy-duty AI processing must stay within Vopak's Google Cloud environment.
- **Autonomous Feedback:** If the agent encounters ambiguous data, it must flag it in the "Wizard's Master Tracker" for human review.
