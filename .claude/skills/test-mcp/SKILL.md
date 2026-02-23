---
name: test-mcp
description: >
  This skill should be used when the user asks to "test mcp", "test tools",
  "run mcp tests", "validate tools", "smoke test", "check if tools work",
  or "run the test suite". Runs JSON-RPC validation tests against all 5
  MCP tools with pre-built payloads and PASS/FAIL reporting.
disable-model-invocation: true
---

# MCP Tool Validation

Test the MCP server's 5 tools via JSON-RPC over stdio. All tests run against the
live Messages and Contacts databases and require Full Disk Access.

## Quick: Test All Tools

Run the full test suite from the project root:

```bash
bash .claude/skills/test-mcp/scripts/test-tools.sh all
```

Runs 6 checks: 1 protocol-level `tools/list` verification + 5 individual tool calls.
Each test prints PASS/FAIL with a summary. Exit code is 0 if all passed, 1 if any failed.
On failure, server stderr is shown for diagnostics.

## Test Individual Tools

Run a single tool test with an optional query override:

```bash
bash .claude/skills/test-mcp/scripts/test-tools.sh <tool_name> [query]
```

| Tool | Default Query | Example Override |
|------|--------------|------------------|
| `search_and_read` | `"test"` | `bash .claude/skills/test-mcp/scripts/test-tools.sh search_and_read "Mom"` |
| `search_contacts` | `"test"` | `bash .claude/skills/test-mcp/scripts/test-tools.sh search_contacts "John"` |
| `read_conversation` | `"test"` | `bash .claude/skills/test-mcp/scripts/test-tools.sh read_conversation "+15551234567"` |
| `get_conversation_stats` | `"test"` | `bash .claude/skills/test-mcp/scripts/test-tools.sh get_conversation_stats "Mom"` |
| `analyze_message_sentiment` | `"test"` | `bash .claude/skills/test-mcp/scripts/test-tools.sh analyze_message_sentiment "group:123"` |

## Protocol-Only Smoke Test

Verify the server boots and lists tools without calling any tool:

```bash
bash .claude/skills/test-mcp/scripts/test-tools.sh list
```

Expect: `PASS: tools/list — 5 tools registered`

## Interpreting Results

- **PASS** — Tool returned a valid JSON-RPC response with no error field. Zero results
  is still a PASS (valid response for a non-matching query).
- **FAIL** — Tool returned an error, empty response, or malformed JSON. Raw output
  and server stderr (if any) are printed for debugging.

## Interactive Testing

For visual, form-based testing with the MCP Inspector:

```bash
cd src/ && npx @modelcontextprotocol/inspector node index.js
```

Opens a web UI at `http://localhost:5173` for browsing tool schemas and executing
calls interactively.
