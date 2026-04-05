#!/usr/bin/env bash
source /app/op-env.sh
echo "DEBUG: Executing wrapper with args: $@" >> /tmp/jules_wrapper.log
op run -- node /home/node/.gemini/extensions/gemini-cli-jules/mcp-server/dist/jules.js "$@"
