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

See `.claude/rules/architecture.md` for detailed technical internals (Apple timestamps, multi-handle resolution, contact name resolution, database schema).

## File Structure

```
/
├── src/                           # Source code
│   ├── index.js                  # Main MCP server implementation
│   ├── manifest.json             # Extension metadata
│   ├── package.json              # Node.js dependencies
│   └── enhanced-imessage-connector-v*.mcpb  # Built extension
├── .claude/
│   ├── rules/                    # Topic-specific instructions
│   │   ├── architecture.md      # Technical details, DB schema, tool methods
│   │   ├── development.md       # Adding tools, modifying queries, debugging
│   │   ├── security.md          # Database access, network, sanitization rules
│   │   ├── testing.md           # Manual testing workflow and test scenarios
│   │   └── deployment.md        # Release process, distribution, limitations
│   └── skills/                   # Repeatable task workflows
│       ├── test-mcp/            # MCP tool validation suite
│       └── release/             # Automated release checklist
├── releases/                      # Released .mcpb files
├── README.md                      # User-facing documentation
├── BUILD.md                       # Build from source guide
├── TECHNICAL.md                   # Deep technical documentation
├── QUICKSTART.md                  # 5-minute setup guide
└── CHANGELOG.md                   # Version history
```

## Additional Resources

- **TECHNICAL.md**: Detailed architecture, database schema, query optimization
- **BUILD.md**: Security verification, build process, troubleshooting
- **Messages DB Schema**: Direct inspection via `sqlite3 ~/Library/Messages/chat.db ".schema"`
- **MCP SDK Docs**: https://github.com/anthropics/anthropic-sdk-typescript/tree/main/packages/mcp
