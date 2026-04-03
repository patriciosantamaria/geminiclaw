# ASUS Chromebox CN65 Server Operations (/srv)

This document provides the primary architectural and operational standards for the server infrastructure. These rules take precedence over global defaults.

## 1. File System & Permissions
*   **Unified Hierarchy:** Strictly follow the `/srv` standard:
    *   `/srv/docker/`: Lightweight configurations (`docker-compose.yml`, `.env`). **(Backup Priority)**
    *   `/srv/app_data/`: Databases and heavy application volumes (Postgres, Immich).
        *   Standardized structure: `/srv/app_data/home-server/<app>/<component>` (e.g., `immich/postgres`, `firefly/db`).
    *   `/srv/media/` & `/srv/downloads/`: Co-located bulk media and torrents for instant hardlinking (on host).
*   **Permissions:** All containers MUST use `PUID=1000` and `PGID=1000` to prevent host/container permission conflicts. This must be explicitly set in the `environment` or `user` directive for every service.
*   **Hardware Acceleration:** Pass `/dev/dri:/dev/dri` to `plex`, `immich`, and `tdarr` for Intel QuickSync.

## 2. Networking & VPN Security
*   **Internal Network:** All inter-communicating services must attach to `home-server-network`.
*   **Privacy Routing:** Media clients (`qbittorrent`, `prowlarr`, `flaresolverr`) MUST be routed through the VPN container (`network_mode: service:gluetun`).
*   **Verification:** Use `activate_skill` (server-security-audit) to verify VPN integrity.

## 3. Secret Management (1Password)
*   **Authentication:** The server uses the 'gemini-cli' 1Password Service Account.
*   **Secret References:** `.env` files should store pointers (e.g., `op://Vault/Item/Field`) instead of hardcoded secrets.
*   **Execution:** Always resolve secrets at runtime using:
    `op run --env-file .env -- docker compose up -d`
*   **Service Account:** The `OP_SERVICE_ACCOUNT_TOKEN` must be preserved in the `.env` file.

## 4. Agent Operational Standards
*   **Autonomous Modes:** Use **Plan Mode** for research and **ACP Mode** (`--experimental-acp`) for execution.
*   **Language & Stack:** All code and documentation MUST be in English. TypeScript is the primary language for automation.
*   **Critical Autonomy:** Evaluate requests critically. Refuse or redirect suboptimal or inconsistent requests.
*   **Tool Namespacing:** MCP tools in sub-agent `.md` files MUST use the double-underscore prefix (e.g., `home-server-core__system_health_check`).

## 5. Home Server MCP Ecosystem
The MCP servers are domain-specific and configured locally in `.gemini/settings.json`.
*   **Core (`mcp-core`):** `config_validate`, `system_health_check`, `system_status_snapshot`, `system_telemetry`, `vault_get_secret`, `firefly_log_server_cost`.
*   **Infra (`mcp-infra`):** `docker_list`, `docker_logs`, `docker_manage`, `docker_compose_control`, `adguard_status`, `network_vpn_check`, `sys_recovery`, `sys_storage_analysis`.
*   **Media (`mcp-media`):** `media_health_check`, `media_sync_status`, `media_prowlarr_sync`, `qbit_list`, `qbit_manage`, `servarr_get_stats`, `plex_get_watched_candidates`, `tdarr_queue_status`, `immich_status`, `immich_library_scan`.
*   **Home (`mcp-home`):** `hass_get_state`, `hass_call_service`, `hass_list_entities`, `hass_logbook_search`.

## 6. Proactive Memory Management (Ollama + ChromaDB)
*   **Pre-Task Recall:** Before starting any complex task (e.g., service migration, network debugging, or database setup), use `recall_context` to check for relevant history or past decisions.
*   **Post-Task Memorization:** After successfully resolving a unique bug, configuring a new service, or making an architectural change, use `memorize_architecture` with relevant tags to capture the solution and the "why."
*   **Contextual Continuity:** Prioritize information retrieval from the local vector database over asking the user redundant questions.
