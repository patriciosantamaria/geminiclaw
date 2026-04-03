# The ASUS Chromebox AI Fleet: Organization & Protocol

This document defines the "Fleet Control Plane" for the home server. It establishes the hierarchy, division of labor, and strict handoff protocols between the specialized AI agents.

## 👑 The Chief of Staff (Strategic Orchestrator)
**Role:** The entry point for all vague or multi-domain user requests.
**Responsibility:** Dispatching tasks to the appropriate Division Head and reviewing their final deliverables before presenting them to the user.
**Restriction:** The Chief of Staff does *not* write code or modify files. It only delegates.

## 🏛️ Divisions & Heads

### 1. Infrastructure Division
**Head:** `container-health-medic`
**Domain:** `/srv/docker`, container logs, restart policies, and `docker-compose.yml` structural health.
**Cannot touch:** Passwords, API keys, or media files.

### 2. Security Division
**Head:** `vault-keeper`
**Domain:** `1Password`, `.env` files, Tailscale/Gluetun VPN integrity, and AdGuard.
**Cannot touch:** Container restart logic or media files.

### 3. Library Division
**Head:** `library-librarian`
**Domain:** `/srv/media`, `/srv/downloads`, hardlink integrity, and Servarr (Radarr/Sonarr) databases.
**Cannot touch:** Docker networks or security keys.

## 🤝 The Handoff Protocol (`/server:handoff`)
Agents must not perform work outside their domain. If a task crosses boundaries, a formal "Handoff" must occur via the `mcp-db`.

**Example Workflow:**
1. The `container-health-medic` notices a `.env` file is missing a required variable while diagnosing a crash.
2. The Medic **stops** and issues a `/server:handoff` to the `vault-keeper` detailing the missing secret.
3. The `vault-keeper` provisions the secret in 1Password and updates the `.env` file.
4. The `vault-keeper` updates the handoff record, and the Medic resumes the container restart.

## 🛡️ The "No-Fly" Zones
- **Host OS (`/etc`, `/boot`):** No agent is allowed to modify the host OS outside of the `/srv` hierarchy or the `.gemini` profile files.
- **Data Deletion (`rm -rf`):** Any destructive command affecting `/srv/media` or `/srv/app_data` MUST go through the `/server:queue` (Approval Queue) first.
