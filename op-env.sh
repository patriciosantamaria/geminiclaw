#!/usr/bin/env bash
# Professional Environment Loader (v1.1)
# Loads all variables from .env, supporting 1Password references.

if [ -f /app/.env ]; then
  # Source the file, handling potential quotes and spaces
  set -a
  source /app/.env
  set +a
fi
