#!/bin/bash
set -e
cd /srv/docker/mcp-server
op run --env-file .env -- docker compose up -d
echo "Waiting for stack to spin up..."
sleep 10
echo "Updating mcp-db database password..."
op run --env-file .env -- bash -c 'echo "ALTER USER mcp_admin WITH PASSWORD '\''$MCP_DB_PASSWORD'\'';" | docker exec -i mcp-db psql -U mcp_admin -d mcp_state'
echo "Done."
