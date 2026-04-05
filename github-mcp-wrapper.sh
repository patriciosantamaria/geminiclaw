#!/usr/bin/env bash
# GitHub MCP Wrapper (v1.2) - Context Aware
source /app/op-env.sh

# Default to Vopak Std identity for the GitHub MCP server
export GITHUB_PERSONAL_ACCESS_TOKEN="${GITHUB_TOKEN_VOPAK}"

op run -- /home/node/.npm-global/bin/mcp-server-github "$@"
