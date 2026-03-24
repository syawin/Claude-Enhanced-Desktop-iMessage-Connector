# Development Guide

## Prerequisites

- Node.js >= 24
- macOS with **Full Disk Access** enabled (for Messages database)
- python3 (pre-installed on macOS, used by test script)

## Quick Start

```bash
cd src/
npm install
```

## Development Loop

### 1. Interactive Development (MCP Inspector)

The primary development tool. Opens a browser UI where you can call any tool, see JSON-RPC request/response pairs, and view server logs.

```bash
cd src/
npm run inspect
# Opens browser at http://localhost:6274
```

Or use the **MCP Inspector** run configuration in IntelliJ IDEA.

### 2. Watch Mode (Terminal)

Restarts the server automatically on file changes. Useful when paired with the test script or Inspector in another terminal.

```bash
cd src/
npm run dev
```

### 3. Run Tests

Integration tests that validate all 5 tools against the live Messages database.

```bash
cd src/
npm test              # All 6 checks (1 protocol + 5 tools)
npm run test:list     # Protocol smoke test only
```

Or use the **Run Tests** run configuration in IntelliJ IDEA.

### 4. Debugging with Breakpoints

**Option A — Terminal + IntelliJ:**

```bash
# Terminal 1: Start server with V8 inspector
cd src/
npm run debug
# Shows: Debugger listening on ws://127.0.0.1:9229/...

# Terminal 2: Send requests via Inspector or tests
npm run inspect   # or: npm test
```

Then use **Attach Debugger** run configuration in IntelliJ to connect to port 9229 and hit breakpoints.

**Option B — Terminal + Chrome DevTools:**

1. Run `npm run debug` in terminal
2. Open `chrome://inspect` in Chrome
3. Click "inspect" on the Node.js target
4. Set breakpoints in the Sources panel

**Option C — Inspector with debugger:**

```bash
cd src/
npm run inspect:debug
# Starts MCP Inspector AND enables V8 debugger on port 9229
```

### 5. Build for Distribution

```bash
cd src/
npm run build
# Generates .mcpb file for Claude Desktop installation

open ./*.mcpb     # Install in Claude Desktop
```

## npm Scripts Reference

| Script | Description |
|--------|-------------|
| `npm start` | Run the MCP server |
| `npm run dev` | Run with auto-restart on file changes |
| `npm run debug` | Run with V8 debugger + auto-restart |
| `npm run inspect` | Launch MCP Inspector browser UI |
| `npm run inspect:debug` | MCP Inspector + V8 debugger |
| `npm test` | Run all integration tests |
| `npm run test:list` | Protocol smoke test only |
| `npm run build` | Build `.mcpb` extension package |

## IntelliJ IDEA Run Configurations

| Configuration | Description |
|---------------|-------------|
| **MCP Inspector** | Launches MCP Inspector browser UI |
| **Run Tests** | Runs all integration tests |
| **Debug MCP Server** | Starts server paused at first line with `--inspect-brk` |
| **Attach Debugger** | Attaches to a running debug server on port 9229 |

## Typical Workflows

**Making a quick change:**
1. `npm run inspect` → make changes in editor → test in browser UI

**Debugging an issue:**
1. `npm run debug` in terminal
2. Attach IntelliJ debugger (or Chrome DevTools)
3. Set breakpoints
4. `npm test` or `npm run inspect` in another terminal to trigger the code path

**Pre-release verification:**
1. `npm test` — all 6 checks pass
2. `npm run build` — produces `.mcpb`
3. `open ./*.mcpb` — install and test in Claude Desktop
