# Project Guidelines

## Project Overview

Enhanced iMessage Connector for Claude Desktop — an MCP (Model Context Protocol) server extension that provides reliable iMessage access by connecting directly to macOS SQLite databases instead of using AppleScript.

### Project Structure

- `src/index.js` — Main server implementation (MCP tools: search_and_read, search_contacts, read_conversation, get_conversation_stats, analyze_message_sentiment)
- `src/manifest.json` — Extension manifest for Claude Desktop
- `src/package.json` — Node.js dependencies (`sqlite3`, `sqlite`, `@modelcontextprotocol/sdk`)
- `src/src.mcpb` — Packaged extension bundle
- `README.md` — User-facing documentation
- `BUILD.md` — Build-from-source instructions
- `INSTALL.md` — Installation guide
- `TECHNICAL.md` — Technical documentation
- `CHANGELOG.md` — Version history

### Key Technical Details

- Runtime: Node.js
- Database access: `sqlite3` (with `sqlite` promise wrapper) for direct SQLite queries against `~/Library/Messages/chat.db` and `~/Library/Application Support/AddressBook/`
- Read-only — never modifies user data
- Requires macOS Full Disk Access permission
- All processing is local; no network connections

### Building

See `BUILD.md` for full instructions. The extension is packaged as a `.mcpb` file for Claude Desktop.

### Testing

There is no automated test suite. Manual testing is done by installing the `.mcpb` extension in Claude Desktop and verifying tool functionality (contact search, message reading, group chats, sentiment analysis).

### Code Style

- Single main file (`src/index.js`) containing all server logic
- Follow existing patterns when making changes
- Use JSDoc-style comments for function documentation where present
