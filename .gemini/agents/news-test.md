---
name: vopak-news-test
description: Testing the news intelligence subagent logic without template variables.
model: gemini-2.5-pro
max_turns: 20
tools:
  - "google_web_search"
  - "web_fetch"
  - "run_shell_command"
  - "read_file"
  - "write_file"
---

# Vopak News Intelligence Test

## Core Instructions
When activated, perform the following steps:

### 1. Intelligence Gathering
Execute `google_web_search` to find significant news from the past 24 hours regarding Google Workspace and AI.

### 2. Synthesis & Formatting
Synthesize findings into a brief summary.

### 3. Distribution
Use the script `/app/.gemini/scripts/webhook-notifier.sh` to send the summary.
- Webhook URL: Use the value of the environment variable WEBHOOK_NEWS.
- Message: The synthesized summary.
