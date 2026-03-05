# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enhanced iMessage Connector for Claude Desktop - a Model Context Protocol (MCP) server that provides reliable iMessage integration by directly accessing macOS SQLite databases, replacing Claude Desktop's broken built-in AppleScript-based tools.

**Key Problem Solved**: Built-in iMessage tools find 0 contacts and fail with AppleScript errors. This connector uses direct SQLite database access for 100% reliability.

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

### Core Components

**MCP Server** (`src/index.js`):
- Node.js MCP server using `@modelcontextprotocol/sdk`
- Single-file implementation (~1500 lines)
- Implements 5 tools for iMessage integration
- Connects to two SQLite databases:
  - `~/Library/Messages/chat.db` - Message content and metadata
  - `~/Library/Application Support/AddressBook/AddressBook-v22.abcddb` - Contact name resolution

### Critical Technical Details

**Apple Timestamp Format**:
- Messages database uses nanoseconds since 2001-01-01 00:00:00 UTC
- Conversion logic in `calculateAppleTimestamp()` method (lines 25-39)
- Unix epoch is 1970-01-01, so offset is 978307200 seconds

**Multi-Handle Resolution**:
- Same contact can have multiple "handles" (phone numbers, emails, iMessage IDs)
- `findHandleIds()` searches multiple patterns: original, cleaned digits, with +prefix
- Groups messages from all handles for unified conversation view
- Critical for reliability since built-in tools fail on format variations

**Contact Name Resolution**:
- `resolveContactName()` queries Contacts database (lines 657-701)
- Maintains cache (`contactNameCache`) to avoid repeated queries
- Falls back to formatted phone number if contact not found
- Reverse lookup via `findContactsByName()` for name-based searches

**AttributedBody Decoding**:
- Some messages store content in BLOB format instead of plain text
- Basic text extraction in `extractTextFromAttributedBody()` (lines 616-634)
- Extracts readable ASCII from typedstream-encoded data
- Used as fallback when `text` field is empty

### Database Schema (Messages)

Key tables used:
- `message` - Contains text, date, sender info, service type
- `handle` - Contact identifiers (phone numbers, emails)
- `chat` - Group conversation metadata
- `chat_message_join` - Links messages to group chats

Important fields:
- `message.date` - Apple timestamp (nanoseconds since 2001)
- `message.text` - Plain text content
- `message.attributedBody` - BLOB encoded rich content
- `message.is_from_me` - 1 if sent by user, 0 if received
- `handle.id` - Phone number or email address

### Tool Methods

All 5 MCP tools share common patterns:

1. **Open database** with read-only mode (`sqlite3.OPEN_READONLY`)
2. **Resolve identifiers** (contact names to handles, group IDs)
3. **Query with date filtering** using Apple timestamp calculation
4. **Process results** (decode attributedBody, resolve contact names)
5. **Close database** in finally block
6. **Return formatted JSON** to Claude Desktop

**Enhanced Tools** (added in v1.1):
- `searchAndRead()` - Combined search + read for efficiency
- `readConversation()` - Supports both individuals and groups via "group:ID" format
- `getConversationStatsEnhanced()` - Participant-level stats for groups
- `analyzeMessageSentimentEnhanced()` - Sentiment analysis with sender identification

## Common Development Tasks

### Adding a New Tool

1. Add tool definition to `ListToolsRequestSchema` handler (line 62)
2. Add case to `CallToolRequestSchema` handler switch statement (line 202)
3. Implement method following existing pattern (open DB, query, process, close, return JSON)
4. Update `manifest.json` with tool metadata
5. Test with `echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node index.js`

### Modifying SQL Queries

**Always use parameterized queries** to prevent SQL injection:
```javascript
// CORRECT
await db.all(
  `SELECT * FROM message WHERE handle_id IN (${handleIds.map(() => '?').join(',')})`,
  [...handleIds]
)

// WRONG - vulnerable to injection
await db.all(`SELECT * FROM message WHERE handle_id IN (${handleIds.join(',')})`)
```

**Query Optimization**:
- Use `LIMIT` to prevent massive result sets
- Filter by date with `message.date > ?` using calculated threshold
- Leverage existing indexes on `message.date` and `message.handle_id`

### Debugging Database Issues

Enable debug logging by uncommenting `console.error()` calls:
- Line 37: Date threshold calculation
- Line 344: Handle IDs and query params
- Line 367: Message count results

View logs in Claude Desktop: Settings → Extensions → Enhanced iMessage Connector → View Logs

### Version Updates

Update version in THREE files:
1. `src/package.json` - line 3
2. `src/manifest.json` - line 4
3. `src/index.js` - line 45 (MCP server version)

## Security Constraints

**Database Access**:
- ALWAYS use `sqlite3.OPEN_READONLY` mode (line 255)
- NEVER write to Messages database
- Access only two databases: Messages and Contacts

**No Network Access**:
- Extension must work entirely offline
- No dependencies with network capabilities
- Allowed dependencies: `@modelcontextprotocol/sdk`, `sqlite3`, `sqlite`

**Input Sanitization**:
- Use parameterized SQL queries
- Clean phone numbers with `replace(/[^0-9]/g, '')` before searching
- Validate limit parameters to prevent resource exhaustion

## Testing

### Manual Testing Workflow

After making changes:

1. Rebuild extension: `cd src/ && npx @anthropic-ai/mcpb pack`
2. Install in Claude Desktop: `open ./*.mcpb`
3. Restart Claude Desktop
4. Test each modified tool with real data
5. Check logs for errors

### Tool-Specific Tests

**search_and_read**:
```
Enhanced iMessage Connector:search_and_read with query "Mom" limit 10
```

**read_conversation**:
```
Enhanced iMessage Connector:read_conversation with identifier "Mom" days_back 30
Enhanced iMessage Connector:read_conversation with identifier "group:123" limit 20
```

**get_conversation_stats**:
```
Enhanced iMessage Connector:get_conversation_stats with identifier "+15551234567" days_back 60
```

### Common Test Scenarios

1. **Name-based search**: Use contact name like "Mom" or "John"
2. **Phone number formats**: Test with +1, without +1, with/without formatting
3. **Email addresses**: Test iMessage via email
4. **Group chats**: Use "group:ID" format (get ID from search_and_read results)
5. **Date ranges**: Test with various days_back values (7, 30, 365)
6. **Large result sets**: Test limit parameter behavior

## Deployment

### Release Process

1. Test all 5 tools thoroughly with real message data
2. Update version in 3 files (package.json, manifest.json, index.js)
3. Update CHANGELOG.md with changes
4. Build: `cd src/ && npx @anthropic-ai/mcpb pack`
5. Copy `.mcpb` file to `releases/` directory with version in filename
6. Create GitHub release with `.mcpb` file attached
7. Update README.md if user-facing changes

### Distribution

Built `.mcpb` files are single-file packages containing:
- index.js
- package.json (with dependencies)
- manifest.json
- node_modules/ (bundled dependencies)

Users install by double-clicking `.mcpb` file - no build process required.

## Known Limitations

1. **AttributedBody parsing** is basic - only extracts ASCII text, not formatting/attachments
2. **Contact database path** is hardcoded to v22, may need updates for future macOS versions
3. **Group chat participant names** require separate Contacts database queries (slower for large groups)
4. **No attachment support** - only text content is extracted
5. **Requires Full Disk Access** - macOS security permission needed for database access

## File Structure

```
/
├── src/                           # Source code
│   ├── index.js                  # Main MCP server implementation
│   ├── manifest.json             # Extension metadata
│   ├── package.json              # Node.js dependencies
│   └── enhanced-imessage-connector-v*.mcpb  # Built extension
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
