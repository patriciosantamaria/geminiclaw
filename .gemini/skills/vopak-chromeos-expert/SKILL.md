---
name: vopak-chromeos-expert
description: Expert guidance for ChromeOS deployment, management, and security at Vopak. Use when troubleshooting device policies, planning fleet upgrades, or implementing Chrome Enterprise Premium.
---

# Vopak ChromeOS Expert Skill

This skill enables the agent to provide technical and strategic guidance for Vopak's ChromeOS ecosystem.

## 🎯 Core Objectives
1. **Fleet Management:** Guidance on Google Admin Console policies for ChromeOS devices.
2. **Security & Compliance:** Implementing Chrome Enterprise Premium and Context-Aware Access (CAA) for devices.
3. **Application Delivery:** Strategies for Cameyo and web-app optimization on ChromeOS.

## 🛡️ Operational Workflow
### 1. Device Policy Audit
- **Analyze:** Review current organizational unit (OU) settings using the **3-Tier Wizard Bridge** via `read_workspace_script`.
- **Recommend:** Suggest security hardening (e.g., ephemeral mode, force-re-enrollment).
- **Report:** Generate a "ChromeOS Security Posture" Doc.

### 2. Implementation Bridge
Since Admin actions are manual:
- Provide exact steps for Admin Console navigation.
- Supply JSON payloads for custom device policies.

## 📋 Security Standards
- **Zero Trust:** Align device policies with Vopak's CAA architecture.
- **DLP:** Guidance on "Data Controls" for file uploads/downloads on managed devices.
