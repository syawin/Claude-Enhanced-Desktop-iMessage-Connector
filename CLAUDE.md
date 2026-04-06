# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enhanced iMessage Connector for Claude Desktop — a Model Context Protocol (MCP) server that provides reliable iMessage integration by directly accessing the macOS Messages SQLite database and resolving contact names via AppleScript.

**Key Problem Solved**: Built-in iMessage tools find 0 contacts and fail with AppleScript errors. This connector uses direct SQLite database access for messages and AppleScript-based contact resolution for reliability across macOS versions including macOS 26 (Tahoe).

## Development Commands

### Install Dependencies
```bash
cd src/
npm install
```

### Test MCP Server Directly
```bash
# Test that the MCP server responds correctly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node src/index.js
```

Expected output: JSON listing 5 tools (search_and_read, search_contacts, read_conversation, get_conversation_stats, analyze_message_sentiment)

### Build Extension Package
```bash
cd src/
npx @anthropic-ai/mcpb pack
```

Generates `enhanced-imessage-connector-<version>.mcpb` for Claude Desktop installation.

### Run Integration Tests
```bash
cd src/
npm run test:integration
```

Runs 71 tests across 6 files (1 smoke + 5 tool-specific) against a mock SQLite database. Works on any platform — no macOS or Full Disk Access required. Use `/test-integration` skill for details.

### Install Extension Locally
```bash
# From src/ directory after building
open ./*.mcpb
```

## Architecture

**MCP Server** (`src/index.js`):
- Node.js MCP server using `@modelcontextprotocol/sdk`
- Single-file implementation (~1500 lines)
- Implements 5 tools for iMessage integration
- Connects to `~/Library/Messages/chat.db` (SQLite, read-only) for message data
- Resolves contact names via AppleScript — bulk-loads all contacts on first use, then caches in memory Maps for O(1) lookups

## Rules Reference

- @.claude/rules/architecture.md — Technical internals including Apple timestamps, multi-handle resolution, contact name resolution, and database schema. Import when working on core server logic or debugging message queries.
- @.claude/rules/development.md — Guidelines for adding new tools, modifying SQL queries, and debugging. Import when making changes to `src/index.js` or extending functionality.
- @.claude/rules/testing.md — Manual testing workflow and test scenarios for all 5 MCP tools. Import when validating changes or running through QA.
- @.claude/rules/security.md — Database access rules, network restrictions, and input sanitization policies. Import when reviewing or modifying data access patterns.
- @.claude/rules/deployment.md — Release process, distribution steps, and known limitations. Import when preparing a new release or building the extension package.

## Additional Resources (read on-demand, not auto-loaded)

- `README.md` — User-facing docs, tool parameters, usage examples
- `TECHNICAL.md` — Deep architecture and DB schema details
- `BUILD.md` / `INSTALL.md` — Build-from-source guides
- `QUICKSTART.md` — 5-minute user setup guide
- `DEVELOPMENT.md` — Dev environment setup, npm scripts reference
- `DEVFLOW.md` — AI development loop (code → deploy → test → debug)
- `CHANGELOG.md` — Version history and release notes
- **Messages DB Schema**: `sqlite3 ~/Library/Messages/chat.db ".schema"`

## Skills & Hooks

- `/test-integration` — Run mock-DB integration tests (`cd src && npm run test:integration`)
- `/add-tool` — Complete checklist for adding a new MCP tool with tests, CI, and bash script updates
- **PostToolUse hook** (`.claude/settings.json`) — Reminds to update integration tests when `src/index.js` is modified
