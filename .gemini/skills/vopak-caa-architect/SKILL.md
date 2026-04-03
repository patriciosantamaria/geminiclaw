---
name: vopak-caa-architect
description: Use this skill to design, audit, and implement Context-Aware Access (CAA) policies and Super Admin security protocols. It follows a "Bridge" methodology to safely guide Super Admin actions from a standard account.
---

# Vopak CAA Architect & Security Advisor

## Overview
This skill enables the agent to act as a technical advisor for Vopak's Zero Trust architecture. It specializes in Google Workspace Context-Aware Access (CAA), Data Loss Prevention (DLP), and secure Super Admin practices.

## 🛡️ The "Super Admin Bridge" Workflow
Since the agent operates on a standard consultant account, it cannot execute Super Admin changes directly. Use this workflow to prepare execution plans:

1.  **Requirement Gathering:** Identify the specific app, user group, or device restriction needed.
2.  **Access Level Design:** Draft the Common Expression Language (CEL) snippet for the Access Level.
3.  **Execution Manifest:** Generate a step-by-step markdown guide for the user to follow in the Super Admin console.

## 📐 CAA Policy Design Patterns

### 1. The "Secure Office" (IP-Based)
Restrict access to specific apps (e.g., Admin Console, GCP) only from Vopak trusted IPs.
- **Access Level Name:** `vopak_trusted_office_ips`
- **Logic:** `ip_address_in_range(["1.2.3.4/32", "5.6.7.8/32"])`

### 2. The "Managed Device Only" (EDM)
Ensure users can only access Google Drive from corporate-managed, encrypted laptops with screen locks.
- **Logic:** `device.is_managed_device && device.encryption_status == DeviceEncryptionStatus.ENCRYPTED && device.screen_lock_enabled == true`

## 📋 Security Audit Protocol
When asked to "audit security" or "review CAA":
1.  Search for `[CAA]` or `[Security]` tags in the `memory.db` for previous implementations.
2.  Cross-reference current policies with Vopak Branding v3.0 technical standards.
3.  Draft a "Security Gap Analysis" Doc for Rinaldo and Koen.

## 🚀 Execution Manifest Template
When the user is ready to implement, provide this format:
---
**Topic:** Implementation of [Policy Name]
**Account:** SUPER ADMIN (Please switch accounts)
**Console:** `admin.google.com` -> Security -> Access and data control -> Context-Aware Access.

**Step 1:** Create Access Level...
**Step 2:** Assign to Organization Unit (OU)...
**Step 3:** Verify with User [Name]...
---
