#!/bin/bash
# PostToolUse hook: reminds to update integration tests when src/index.js changes.
# Reads JSON from stdin (tool_name, tool_input fields).

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)

case "$FILE_PATH" in
  */src/index.js)
    echo "⚠ src/index.js was modified. If you changed tool behavior or SQL queries, update the matching integration test in src/test/tools/ and run: cd src && npm run test:integration"
    ;;
esac
