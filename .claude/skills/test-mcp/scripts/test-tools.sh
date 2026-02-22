#!/usr/bin/env bash
# test-tools.sh — JSON-RPC test runner for the iMessage MCP server.
# Requires: node, python3 (pre-installed on macOS)
# Usage:
#   test-tools.sh all              — Run all tool tests (1 protocol + 5 tools = 6 checks)
#   test-tools.sh list             — Protocol smoke test (tools/list only)
#   test-tools.sh <tool> [query]   — Test a single tool with optional query override
set -euo pipefail

PROJECT_DIR="$(git rev-parse --show-toplevel)"
SERVER_CMD=(node "$PROJECT_DIR/src/index.js")

INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-mcp-skill","version":"1.0"}}}'

# Preflight checks
command -v node >/dev/null 2>&1 || { echo "ERROR: node is required but not found on PATH" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 is required but not found on PATH" >&2; exit 1; }
[ -f "$PROJECT_DIR/src/index.js" ] || { echo "ERROR: $PROJECT_DIR/src/index.js not found" >&2; exit 1; }

# Holds stderr from the last server invocation (for diagnostics on failure)
LAST_STDERR=""

# Send init + one message to the server, return the last response line.
# Captures stderr to a temp file so failures produce useful diagnostics.
call_tool() {
  local tool_json="$1"
  local stderr_file
  stderr_file=$(mktemp)
  local result
  result=$(printf '%s\n%s\n' "$INIT" "$tool_json" | "${SERVER_CMD[@]}" 2>"$stderr_file" | tail -1) || true
  if [ -s "$stderr_file" ]; then
    LAST_STDERR=$(cat "$stderr_file")
  else
    LAST_STDERR=""
  fi
  rm -f "$stderr_file"
  echo "$result"
}

# Check if response is a valid non-error JSON-RPC result
check_result() {
  local tool_name="$1"
  local response="$2"

  if [ -z "$response" ]; then
    echo "FAIL: $tool_name — empty response"
    if [ -n "$LAST_STDERR" ]; then
      echo "  Server stderr: $(echo "$LAST_STDERR" | head -3)"
    fi
    return 1
  fi

  local has_error
  has_error=$(echo "$response" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if 'error' in d:
        err = d['error']
        msg = err.get('message', 'unknown error') if isinstance(err, dict) else str(err)
        print(msg)
    else:
        print('')
except json.JSONDecodeError:
    print('invalid JSON')
except (TypeError, AttributeError) as e:
    print(f'unexpected response structure: {e}')
")

  if [ -n "$has_error" ]; then
    echo "FAIL: $tool_name — $has_error"
    echo "  Raw: $response"
    return 1
  fi

  echo "PASS: $tool_name"
  return 0
}

# JSON-encode a string value safely (handles quotes, backslashes, etc.)
json_encode() {
  python3 -c "import json, sys; print(json.dumps(sys.argv[1]))" "$1"
}

# Build a tools/call JSON-RPC message
make_call() {
  local tool_name="$1"
  local args_json="$2"
  echo "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"$tool_name\",\"arguments\":$args_json}}"
}

# ── tools/list ──
test_list() {
  local list_msg='{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  local resp
  resp=$(call_tool "$list_msg")

  local count
  count=$(echo "$resp" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(len(d.get('result', {}).get('tools', [])))
except json.JSONDecodeError:
    print('0')
except (TypeError, AttributeError):
    print('0')
")

  if [ "$count" -eq 5 ]; then
    echo "PASS: tools/list — $count tools registered"
  else
    echo "FAIL: tools/list — expected 5 tools, got $count"
    if [ -n "$LAST_STDERR" ]; then
      echo "  Server stderr: $(echo "$LAST_STDERR" | head -3)"
    fi
    echo "  Raw: $resp"
    return 1
  fi
}

# ── Individual tool tests ──
test_search_and_read() {
  local q="${1:-test}"
  local safe_q
  safe_q=$(json_encode "$q")
  local msg
  msg=$(make_call "search_and_read" "{\"query\":$safe_q,\"limit\":5,\"days_back\":7}")
  check_result "search_and_read" "$(call_tool "$msg")"
}

test_search_contacts() {
  local q="${1:-test}"
  local safe_q
  safe_q=$(json_encode "$q")
  local msg
  msg=$(make_call "search_contacts" "{\"query\":$safe_q}")
  check_result "search_contacts" "$(call_tool "$msg")"
}

test_read_conversation() {
  local q="${1:-test}"
  local safe_q
  safe_q=$(json_encode "$q")
  local msg
  msg=$(make_call "read_conversation" "{\"identifier\":$safe_q,\"limit\":5,\"days_back\":7}")
  check_result "read_conversation" "$(call_tool "$msg")"
}

test_get_conversation_stats() {
  local q="${1:-test}"
  local safe_q
  safe_q=$(json_encode "$q")
  local msg
  msg=$(make_call "get_conversation_stats" "{\"identifier\":$safe_q,\"days_back\":7}")
  check_result "get_conversation_stats" "$(call_tool "$msg")"
}

test_analyze_message_sentiment() {
  local q="${1:-test}"
  local safe_q
  safe_q=$(json_encode "$q")
  local msg
  msg=$(make_call "analyze_message_sentiment" "{\"identifier\":$safe_q,\"days_back\":7}")
  check_result "analyze_message_sentiment" "$(call_tool "$msg")"
}

# ── Main dispatcher ──
COMMAND="${1:-all}"
QUERY="${2:-}"
FAILURES=0

case "$COMMAND" in
  list)
    test_list || FAILURES=$((FAILURES+1))
    ;;
  search_and_read)
    test_list || FAILURES=$((FAILURES+1))
    test_search_and_read "$QUERY" || FAILURES=$((FAILURES+1))
    ;;
  search_contacts)
    test_list || FAILURES=$((FAILURES+1))
    test_search_contacts "$QUERY" || FAILURES=$((FAILURES+1))
    ;;
  read_conversation)
    test_list || FAILURES=$((FAILURES+1))
    test_read_conversation "$QUERY" || FAILURES=$((FAILURES+1))
    ;;
  get_conversation_stats)
    test_list || FAILURES=$((FAILURES+1))
    test_get_conversation_stats "$QUERY" || FAILURES=$((FAILURES+1))
    ;;
  analyze_message_sentiment)
    test_list || FAILURES=$((FAILURES+1))
    test_analyze_message_sentiment "$QUERY" || FAILURES=$((FAILURES+1))
    ;;
  all)
    echo "=== MCP Tool Validation Suite ==="
    echo ""
    test_list || FAILURES=$((FAILURES+1))
    echo ""
    test_search_and_read "$QUERY" || FAILURES=$((FAILURES+1))
    test_search_contacts "$QUERY" || FAILURES=$((FAILURES+1))
    test_read_conversation "$QUERY" || FAILURES=$((FAILURES+1))
    test_get_conversation_stats "$QUERY" || FAILURES=$((FAILURES+1))
    test_analyze_message_sentiment "$QUERY" || FAILURES=$((FAILURES+1))
    echo ""
    echo "=== Results: $((6-FAILURES))/6 passed, $FAILURES failed ==="
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    echo "Usage: test-tools.sh {all|list|search_and_read|search_contacts|read_conversation|get_conversation_stats|analyze_message_sentiment} [query]" >&2
    exit 1
    ;;
esac

if [ "$FAILURES" -gt 0 ]; then
  exit 1
fi
exit 0
