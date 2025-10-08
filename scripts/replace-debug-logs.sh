#!/bin/bash

# This script replaces debug console.log statements with debugLog()
# Run from project root: bash scripts/replace-debug-logs.sh

# Server files - replace console.log with debugLog for debug statements
# (keeping console.error as errorLog for actual errors)
find apps/server/src -type f -name "*.ts" -exec sed -i '' \
  -e 's/console\.log(\(`🎮/debugLog(\1/g' \
  -e 's/console\.log(\(`📡/debugLog(\1/g' \
  -e 's/console\.log(\(`📊/debugLog(\1/g' \
  -e 's/console\.log(\(`📤/debugLog(\1/g' \
  -e 's/console\.log(\(`🔗/debugLog(\1/g' \
  -e 's/console\.log(\(`✅/debugLog(\1/g' \
  -e 's/console\.log(\(`❌/debugLog(\1/g' \
  -e 's/console\.log(\(`🔍/debugLog(\1/g' \
  -e 's/console\.log(\(`👤/debugLog(\1/g' \
  -e 's/console\.log(\(`👋/debugLog(\1/g' \
  -e 's/console\.log(\(`🔌/debugLog(\1/g' \
  -e 's/console\.log(\(`⚠️/debugLog(\1/g' \
  -e 's/console\.log('"'"'Game ID validation failed/debugLog('"'"'Game ID validation failed/g' \
  -e 's/console\.log('"'"'Player name validation failed/debugLog('"'"'Player name validation failed/g' \
  -e 's/console\.error('"'"'❌/debugError('"'"'❌/g' \
  {} \;

echo "Server debug logs replaced!"
echo ""
echo "To enable debug logs, run:"
echo "  DEBUG=true npm run dev (in apps/server)"

