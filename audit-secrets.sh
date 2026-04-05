#!/usr/bin/env bash
# Professional Secret Hygiene & Architectural Audit (v1.2)
# Optimized for 2026 'Digital Chief of Staff' standards.

echo "--------------------------------------------------------"
echo "🔍 GeminiClaw Security Audit & Integrity Scan"
echo "--------------------------------------------------------"
FAILURES=0

# 1. Scan for hardcoded secrets
echo "[1/3] Scanning for hardcoded secrets..."
PATTERNS=("ghp_" "sk-ant-" "sk-or-" "ctx7sk-" "AIza")
for pattern in "${PATTERNS[@]}"; do
  MATCHES=$(grep -rE "$pattern" /app \
    --exclude-dir={node_modules,.git,.gemini_docker,.gemini_bak,.jules} \
    --exclude=".env" \
    --exclude="audit-secrets.sh" \
    --exclude="*-mcp-wrapper.sh")
  
  if [ -n "$MATCHES" ]; then
    echo "❌ FOUND hardcoded secret matching: $pattern"
    echo "$MATCHES"
    FAILURES=$((FAILURES + 1))
  fi
done
echo "Secret scan complete."

# 2. Verify .env Manifest
echo -e "\n[2/3] Verifying .env Manifest (1Password Standard)..."
if [ -f /app/.env ]; then
  while IFS= read -r line; do
    if [[ $line =~ "=" ]] && [[ ! $line =~ ^# ]] && [[ ! $line =~ ^OP_SERVICE_ACCOUNT_TOKEN ]]; then
      VAL=$(echo "$line" | cut -d'=' -f2- | tr -d '"')
      if [[ ! $VAL =~ ^op:// ]]; then
        echo "⚠️  WARNING: .env entry '$line' does not use 1Password reference."
      fi
    fi
  done < /app/.env
  echo "✅ .env file verified."
else
  echo "❌ .env file missing!"
  FAILURES=$((FAILURES + 1))
fi

# 3. Architecture Integrity Check
echo -e "\n[3/3] Checking Architectural Integrity..."
if [ -d "/app/wizard-bridge-mcp" ]; then
    echo "✅ Wizard Bridge MCP directory found."
    if [ -f "/app/wizard-bridge-mcp/src/index.ts" ]; then
        echo "✅ MCP Entry point found."
    fi
else
    echo "❌ Wizard Bridge MCP directory MISSING."
    FAILURES=$((FAILURES + 1))
fi

if [ -f "/app/.gemini/data/memory.db" ]; then
    echo "✅ SQLite Memory database found."
else
    echo "⚠️ SQLite Memory database NOT found (expected in .gemini/data/)."
fi

# 4. Verify 1Password Connectivity
echo -e "\n[4/4] Verifying 1Password Access..."
source /app/op-env.sh
if ! op vault list &>/dev/null; then
  echo "❌ 1Password CLI failed to authenticate. Check OP_SERVICE_ACCOUNT_TOKEN."
  FAILURES=$((FAILURES + 1))
fi

echo -e "\n--------------------------------------------------------"
if [ $FAILURES -eq 0 ]; then
  echo "✅ AUDIT PASSED: System is secure and integrated."
  exit 0
else
  echo "❌ AUDIT FAILED: $FAILURES issues found."
  exit 1
fi
echo "--------------------------------------------------------"
