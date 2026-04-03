#!/bin/bash
# 🚀 Automated Clasp Deployment for GeminiClaw Chat App

echo "====================================================="
echo "🦅 GEMINICLAW: APPS SCRIPT DEPLOYMENT AUTOMATION"
echo "====================================================="

# Step 1: Ensure clasp is installed
if ! command -v clasp &> /dev/null; then
    echo "❌ clasp is not installed. Installing it globally..."
    npm install -g @google/clasp
fi

# Step 2: Authenticate (if needed)
echo "🔒 Checking authentication..."
if ! clasp login --status &> /dev/null; then
    echo "⚠️ You are not logged into clasp. Please follow the URL below to authenticate:"
    clasp login --no-localhost
fi

# Step 3: Create the Project (if it doesn't exist locally)
if [ ! -f ".clasp.json" ]; then
    echo "🏗️ Creating new Apps Script project..."
    clasp create --type standalone --title "GeminiClaw Cloud Bridge"
    echo "✅ Project created successfully."
else
    echo "✅ Apps Script project already initialized."
fi

# Step 4: Push the code
echo "☁️ Pushing GeminiClaw code to Google Cloud..."
clasp push -f
echo "✅ Code successfully pushed."

# Step 5: Deploy
echo "🚀 Creating a new deployment..."
clasp deploy --description "GeminiClaw Webhook Deployment"

echo "====================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "Please copy the Deployment ID printed above."
echo "Paste it into the Google Chat API Configuration page in GCP."
echo "====================================================="
