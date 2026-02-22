### AI-Accessible Local Development Loop for MCP Bundle Extensions (Claude Desktop)

This outlines a fully programmatic **code → deploy → test → debug** flow that a software development AI agent (e.g., Claude Code) can execute for building `.mcpb` extensions targeting Claude Desktop on macOS.

---

### Phase 1: Code

#### Project Structure Awareness
The agent must understand the minimal required files for an `.mcpb` extension:

```
src/
├── index.js        # MCP server implementation
├── manifest.json   # Extension metadata + tool declarations
├── package.json    # Dependencies (bundled into .mcpb)
```

#### Key Files to Modify
Version must be updated in **three files** simultaneously:
- `src/package.json` (version field)
- `src/manifest.json` (version field)
- `src/index.js` (MCP server version constant)

#### macOS-Specific Context Awareness
The agent must know these database paths and access patterns:

```javascript
// Messages database (read-only)
const messagesDb = "~/Library/Messages/chat.db";

// Contacts database (read-only)
const contactsDb = "~/Library/Application Support/AddressBook/AddressBook-v22.abcddb";

// Installed extensions location
const extensionsDir = "~/Library/Application Support/Claude/Claude Extensions/";
```

#### Database Schema Inspection (Programmatic)
The agent can introspect connected databases before writing queries:

```bash
# Inspect Messages schema
sqlite3 ~/Library/Messages/chat.db ".schema" 2>/dev/null

# Inspect Contacts schema
sqlite3 ~/Library/Application\ Support/AddressBook/AddressBook-v22.abcddb ".schema" 2>/dev/null
```

#### Coding Constraints
- Always use `sqlite3.OPEN_READONLY` — never write to user databases
- Use parameterized SQL queries (no string interpolation)
- No network dependencies — extension must work fully offline
- Apple timestamps use **nanoseconds since 2001-01-01 UTC** (offset: `978307200` seconds from Unix epoch)

---

### Phase 2: Deploy (Build + Install)

#### Step 2a: Install Dependencies
```bash
cd src/ && npm install
```

#### Step 2b: Pack the Extension
```bash
cd src/ && npx @anthropic-ai/mcpb pack
```

This produces a `.mcpb` file containing `index.js`, `package.json`, `manifest.json`, and bundled `node_modules/`.

Reference: [Building Desktop Extensions with MCPB](https://support.claude.com/en/articles/12922929-building-desktop-extensions-with-mcpb)

#### Step 2c: Install into Claude Desktop
```bash
cd src/ && open ./*.mcpb
```

This triggers Claude Desktop to prompt for extension installation. The extension is deployed to:
```
~/Library/Application Support/Claude/Claude Extensions/local.mcpb.<id>/
```

> **Agent limitation**: The `open` command triggers a GUI prompt. For a fully non-interactive flow, the agent can copy files directly to the extensions directory if the extension is already registered, then restart Claude Desktop.

---

### Phase 3: Test

#### Step 3a: Protocol-Level Smoke Test (No Claude Desktop Required)
Validate the MCP server responds to the protocol without launching Claude Desktop. Smoke tests should follow the full MCP handshake — send a proper `initialize` request before `tools/list`:

```bash
INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
LIST='{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

printf '%s\n%s\n' "$INIT" "$LIST" | node src/index.js 2>/dev/null
```

**Expected**: JSON responses — first with `protocolVersion`, then listing all declared tools. This confirms the server boots, initializes correctly, and the tool schema is valid.

#### Step 3b: Tool-Level Validation
Test individual tool invocations programmatically via JSON-RPC (each call must be preceded by `initialize`):

```bash
INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# Test search_contacts
printf '%s\n%s\n' "$INIT" '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_contacts","arguments":{"query":"Mom"}}}' | node src/index.js 2>/dev/null

# Test read_conversation
printf '%s\n%s\n' "$INIT" '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"read_conversation","arguments":{"identifier":"Mom","days_back":7}}}' | node src/index.js 2>/dev/null

# Test get_conversation_stats
printf '%s\n%s\n' "$INIT" '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_conversation_stats","arguments":{"identifier":"+15551234567","days_back":30}}}' | node src/index.js 2>/dev/null
```

#### Step 3c: MCP Inspector (Interactive Testing)

The [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) is an interactive debugging UI that connects directly to your MCP server via stdio. It supplements the raw JSON-RPC smoke tests above.

##### Install & Launch MCP Inspector

```bash
cd src/ && npx @modelcontextprotocol/inspector node index.js
```

This launches a web UI (typically at `http://localhost:5173`) that lets you:
- Browse all registered tools and their schemas
- Execute tool calls with a form-based UI
- Inspect JSON-RPC request/response pairs
- View server logs and stderr output in real-time

##### Programmatic Use by an AI Agent

An agent can launch the inspector in the background and interact with the underlying proxy:

```bash
# Start inspector in background (exposes proxy on port 3000 by default)
npx @modelcontextprotocol/inspector node index.js &
INSPECTOR_PID=$!

# The inspector proxies stdio — agent can also continue using direct JSON-RPC tests
# Kill when done
kill $INSPECTOR_PID
```

> **Note**: The Inspector is primarily a visual tool. For fully headless AI agent flows, the direct JSON-RPC pipe tests remain the primary programmatic method. The Inspector is most useful when a human developer is reviewing the agent's work.

##### Environment Variables for Inspector

```bash
# Custom ports if defaults conflict
CLIENT_PORT=8080 SERVER_PORT=9000 npx @modelcontextprotocol/inspector node index.js
```

#### Step 3d: Integration Test via Claude Desktop
After installing the `.mcpb`, restart Claude Desktop and invoke tools through the chat interface. The agent can verify results by checking extension logs (see Debug phase).

#### Test Matrix Checklist
The agent should validate:
1. **Name-based search** — contact name like "Mom" or "John"
2. **Phone number formats** — with/without `+1`, with/without formatting
3. **Email identifiers** — iMessage via email
4. **Group chats** — `"group:ID"` format
5. **Date ranges** — various `days_back` values (7, 30, 365)
6. **Limit parameters** — boundary testing for result set sizes

---

### Phase 4: Debug

#### Step 4a: Server Logging via stderr

MCP servers communicate over stdio, so **all debug output must go to stderr** (never stdout). This project already uses `console.error()` correctly. The key patterns:

```javascript
// ✅ Correct — goes to stderr, visible in Inspector and Claude Desktop logs
console.error('[DEBUG] Resolving handle:', identifier);

// ❌ Wrong — would corrupt the JSON-RPC protocol stream on stdout
console.log('[DEBUG] ...');
```

Uncomment `console.error()` calls in `index.js` for verbose output:
- Date threshold calculations
- Handle ID resolution
- Query parameters and result counts

#### Step 4b: MCP Inspector as Debugger

When launched, the Inspector shows:
1. **Tools tab** — lists all tools from `manifest.json`, validates schemas
2. **Request/Response** — shows exact JSON-RPC messages exchanged
3. **Server Logs** — captures all stderr output from the MCP server

Use this to verify:
- Tool input schemas match what `index.js` expects
- Error responses have proper MCP error codes
- Database queries return expected shapes

Reference: [MCP Debugging Guide](https://modelcontextprotocol.io/legacy/tools/debugging)

#### Step 4c: Claude Desktop Developer Tools

Claude Desktop has built-in developer tools for debugging installed extensions:

```bash
# Check Claude Desktop extension logs (macOS)
# Via GUI: Settings → Extensions → Enhanced iMessage Connector → View Logs

# Tail the Claude Desktop main log for MCP-related errors
tail -f ~/Library/Logs/Claude/mcp*.log 2>/dev/null
```

#### Step 4d: Database Access Debugging
```bash
# Verify Full Disk Access is granted (required for chat.db)
sqlite3 ~/Library/Messages/chat.db "SELECT COUNT(*) FROM message LIMIT 1;" 2>&1

# Verify Contacts database access
sqlite3 ~/Library/Application\ Support/AddressBook/AddressBook-v22.abcddb "SELECT COUNT(*) FROM ZABCDRECORD LIMIT 1;" 2>&1
```

If these fail with permission errors, macOS **Full Disk Access** must be granted to the terminal/IDE running the agent.

#### Step 4e: Common Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| `tools/list` returns empty | Malformed `manifest.json` | Validate JSON schema |
| "Database not found" | Missing Full Disk Access | Grant in System Settings → Privacy |
| Contact names show as phone numbers | Contacts DB path changed | Check `AddressBook-v22.abcddb` exists |
| `attributedBody` returns garbage | BLOB decoding issue | Check `extractTextFromAttributedBody()` |
| `npx @anthropic-ai/mcpb pack` fails | Missing dependencies | Run `npm install` first |

#### Step 4f: Debugging Checklist for AI Agent

| Check | Command | Expected |
|---|---|---|
| Server boots | `echo '{"jsonrpc":"2.0","id":1,"method":"initialize",...}' \| node index.js` | JSON response with `protocolVersion` |
| Tools registered | Inspector Tools tab or `tools/list` | 5 tools listed |
| stderr not on stdout | `node index.js < /dev/null 2>/dev/null` | No output on stdout |
| DB access works | `sqlite3 ~/Library/Messages/chat.db "SELECT 1;"` | Returns `1` |
| Inspector connects | `npx @modelcontextprotocol/inspector node index.js` | Web UI loads at localhost |

---

### Complete Automated Loop Script

An AI agent can execute this entire cycle programmatically:

```bash
#!/bin/bash
set -e

PROJECT_DIR="/Users/Simon/workspace/Claude-Enhanced-Desktop-iMessage-Connector"
cd "$PROJECT_DIR/src"

# ── 1. CODE (agent makes changes) ──

# ── 2. DEPLOY ──
npm install --silent
npx @anthropic-ai/mcpb pack

# ── 3. TEST (protocol-level smoke test) ──
INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
LIST='{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

RESULT=$(printf '%s\n%s\n' "$INIT" "$LIST" | node index.js 2>/dev/null | tail -1)
TOOL_COUNT=$(echo "$RESULT" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['result']['tools']))" 2>/dev/null || echo "0")

if [ "$TOOL_COUNT" -lt 1 ]; then
  echo "FAIL: No tools registered" >&2
  # ── 4a. DEBUG: Launch Inspector for visual debugging ──
  echo "Launching MCP Inspector for debugging..."
  npx @modelcontextprotocol/inspector node index.js &
  echo "Inspector running at http://localhost:5173"
  exit 1
fi
echo "PASS: $TOOL_COUNT tools registered"

# ── 3b. TEST (functional) ──
CALL='{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_contacts","arguments":{"query":"test"}}}'
SEARCH_RESULT=$(printf '%s\n%s\n' "$INIT" "$CALL" | node index.js 2>/dev/null | tail -1)
echo "Search result: $SEARCH_RESULT"

# ── 3c. TEST (optional: launch Inspector for interactive review) ──
# npx @modelcontextprotocol/inspector node index.js

# ── 5. DEPLOY to Claude Desktop ──
open ./*.mcpb
echo "Extension installed — restart Claude Desktop to activate"
```

---

### Key References

| Tool | Purpose | When to Use |
|---|---|---|
| **MCPB CLI** (`npx @anthropic-ai/mcpb pack`) | Official Anthropic tool for packaging extensions ([docs](https://support.claude.com/en/articles/12922929-building-desktop-extensions-with-mcpb)) | Build phase |
| **MCP SDK** (`@modelcontextprotocol/sdk`) | The protocol framework for tool servers | Code phase |
| **MCP Inspector** (`npx @modelcontextprotocol/inspector`) | Visual UI for browsing tools, testing calls, viewing logs ([docs](https://modelcontextprotocol.io/docs/tools/inspector)) | During development & when debugging failures |
| **stderr logging** | All `console.error()` output visible in Inspector + Claude Desktop | Always — never use `console.log()` in MCP servers |
| **Protocol-level init** | Send proper `initialize` before `tools/list` | Smoke tests should follow full MCP handshake |
| **Claude Desktop logs** | Check installed extension runtime errors | After deploying `.mcpb` to Claude Desktop |
| **CLAUDE.md** | Place at project root to give Claude Code full context about the development workflow, architecture, and constraints | Always present in project |
| **Claude Code** | Can execute all bash commands in this flow directly | Ideal agent runtime for this loop |
