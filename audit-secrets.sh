#!/bin/bash
# GeminiClaw Security Audit Script
# Reconstructed for repository integrity scan

echo "--------------------------------------------------------"
echo "🔍 GeminiClaw Security Audit & Integrity Scan"
echo "--------------------------------------------------------"

# 1. Scan for hardcoded secrets
echo "[1/3] Scanning for hardcoded secrets..."
# Common patterns for API keys and secrets
# - Google API Keys: AIza...
# - GitHub Tokens: ghp_...
# - OpenAI Keys: sk-...
# - Private Keys: -----BEGIN ... PRIVATE KEY-----
# - Generic secrets: secret_..., password: ..., etc.

grep -rnE "AIza[0-9A-Za-z_-]{35}|ghp_[0-9A-Za-z]{36}|sk-[0-9A-Za-z]{48}|-----BEGIN [A-Z ]+ PRIVATE KEY-----" . \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude=audit-secrets.sh \
  --exclude=package-lock.json

echo "Secret scan complete."

# 2. Verify .env files are 1Password manifests
echo -e "\n[2/3] Verifying .env files as 1Password manifests..."
ENV_FILES=$(find . -name ".env" -not -path "*/node_modules/*")

if [ -z "$ENV_FILES" ]; then
    echo "No .env files found in the repository (this is good if secrets are managed externally)."
else
    for f in $ENV_FILES; do
        echo "Checking $f..."
        # Check if any line looks like a secret but doesn't use op://
        # We look for lines that have an equals sign but don't contain op:// and aren't comments
        INSECURE_LINES=$(grep -v "^#" "$f" | grep "=" | grep -v "op://" | grep -v "^[[:space:]]*$")
        if [ -n "$INSECURE_LINES" ]; then
            echo "❌ Insecure lines found in $f (missing op:// reference):"
            echo "$INSECURE_LINES"
        else
            echo "✅ $f is a valid 1Password manifest."
        fi
    done
fi

# 3. Architecture Integrity Check
echo -e "\n[3/3] Checking Architectural Integrity..."
if [ -d "wizard-bridge-mcp" ]; then
    echo "✅ Wizard Bridge MCP directory found."
    if [ -f "wizard-bridge-mcp/src/index.ts" ]; then
        echo "✅ MCP Entry point found."
    fi
else
    echo "❌ Wizard Bridge MCP directory MISSING."
fi

if [ -f ".gemini/data/memory.db" ]; then
    echo "✅ SQLite Memory database found."
else
    echo "⚠️ SQLite Memory database NOT found (expected in .gemini/data/)."
fi

echo -e "\n--------------------------------------------------------"
echo "✅ Audit completed."
echo "--------------------------------------------------------"
