#!/bin/bash
# Vopak Wizard's Headless Morning Briefing
# This script triggers the strategic briefing autonomously via cron job.

# Ensure the Gemini CLI is in the path
export PATH=$PATH:/usr/bin:/usr/local/bin

# Execute the morning-brief skill in headless mode
# Using --prompt to run non-interactively and the skill name in the prompt
gemini --prompt "Using the vopak-morning-brief skill, execute the full 360-degree morning briefing according to Vopak Strategist standards" \
  --output-format json \
  --approval-mode yolo > /home/patosoto/geminiclaw/.gemini/briefings/latest_brief.json

# Extract and display the summary for the logs
cat /home/patosoto/geminiclaw/.gemini/briefings/latest_brief.json | jq -r '.summary'
