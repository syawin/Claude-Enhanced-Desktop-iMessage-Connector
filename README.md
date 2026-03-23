# Enhanced iMessage Connector for Claude Desktop

Claude Desktop's built-in iMessage tools don't work reliably — they find 0 contacts when searching and fail with AppleScript errors. This connector fixes those issues and adds new functionality.

## What's Different

| Feature | Built-in Tools | This Connector |
|---------|---------------|----------------|
| Contact search | Finds 0 contacts | Search by name, phone, or email |
| Message reading | Consistently fails | Reads full message content |
| Multiple handles | Not supported | Unifies SMS/iMessage/email per person |
| Group chats | Not supported | Full group functionality |
| Contact names | Phone numbers only | Use contact names like "Mom" |
| Dependencies | AppleScript (unreliable) | Direct SQLite + AppleScript contacts |

## Quick Start

See the [Quick Start Guide](QUICKSTART.md) to get up and running in 5 minutes.

### Installation

1. Download the latest `enhanced-imessage-connector.mcpb` from the [releases](releases/) directory
2. Double-click to install in Claude Desktop
3. Enable **Full Disk Access** for Claude Desktop in System Settings → Privacy & Security
4. Restart Claude Desktop

> Want to build from source instead? See [BUILD.md](BUILD.md) or [INSTALL.md](INSTALL.md).

## Available Tools

### search_and_read
Search and immediately read messages in one step. Works with contact names, phone numbers, or group names.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | *(required)* | Name, phone, email, or group name |
| `include_groups` | boolean | `true` | Include group conversations |
| `limit` | number | `15` | Max messages to return |
| `days_back` | number | `30` | How far back to search |
| `format` | string | `minimal` | Output detail: `minimal`, `compact`, or `full` |

```
Enhanced iMessage Connector:search_and_read with query "Mom"
Enhanced iMessage Connector:search_and_read with query "Work Team" limit 10 format "full"
Enhanced iMessage Connector:search_and_read with query "+1234567890" days_back 90
```

### search_contacts
Find contacts without reading messages.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | *(required)* | Name, phone, or email to search |

```
Enhanced iMessage Connector:search_contacts with query "john"
```

### read_conversation
Read messages from a specific contact or group.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `identifier` | string | *(required)* | Phone/email/name or `group:ID` |
| `limit` | number | `20` | Max messages to return |
| `days_back` | number | `60` | How far back to read |
| `include_sent` | boolean | `true` | Include your sent messages |
| `format` | string | `minimal` | Output detail: `minimal`, `compact`, or `full` |

```
Enhanced iMessage Connector:read_conversation with identifier "Mom" limit 50
Enhanced iMessage Connector:read_conversation with identifier "group:123" days_back 7
Enhanced iMessage Connector:read_conversation with identifier "+1234567890" include_sent false
```

### get_conversation_stats
Get message counts, participant info, and timing data.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `identifier` | string | *(required)* | Phone/email/name or `group:ID` |
| `days_back` | number | `60` | Days to analyze |

```
Enhanced iMessage Connector:get_conversation_stats with identifier "Mom" days_back 30
Enhanced iMessage Connector:get_conversation_stats with identifier "group:123"
```

### analyze_message_sentiment
Search for specific keywords or detect potentially hostile messages.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `identifier` | string | *(required)* | Phone/email/name or `group:ID` |
| `keywords` | array | hostile terms | Custom keywords to search for |
| `days_back` | number | `60` | Days to analyze |
| `group_by_date` | boolean | `true` | Group results by date |

```
Enhanced iMessage Connector:analyze_message_sentiment with identifier "group:123" group_by_date true
Enhanced iMessage Connector:analyze_message_sentiment with identifier "Mom" keywords ["angry","frustrated"]
```

## Key Features

**Contact name resolution**: Search "Mom" instead of memorizing phone numbers. Uses AppleScript to query your macOS Contacts via the Contacts framework, compatible with macOS 26 (Tahoe) and earlier.

**Multi-handle support**: Finds the same person across SMS, iMessage, and email addresses automatically.

**Group chat support**: Read group messages with participant names identified.

**No message truncation**: Preserves full message content instead of cutting off at arbitrary limits.

**Multiple output formats**: Choose between `minimal`, `compact`, or `full` detail levels for message output.

## Technical Details

- Connects directly to `~/Library/Messages/chat.db` (SQLite, read-only)
- Resolves contact names via AppleScript (Contacts framework) — works on macOS 26+ where the AddressBook SQLite database was removed
- Contacts are bulk-loaded once on first use, then cached in memory Maps for O(1) lookups
- Requires Full Disk Access permission
- Works entirely offline — no data leaves your Mac
- Read-only access — never modifies your messages
- Requires Node.js >= 18.0.0 (bundled with Claude Desktop)
- MCP Bundle format (`.mcpb`) for one-click installation

## Troubleshooting

**Extension won't install**
- Update Claude Desktop to latest version
- Re-download the .mcpb file
- Restart Claude Desktop

**Tools not appearing**
- Check Settings → Extensions shows connector as "Running"
- Use full tool names: `Enhanced iMessage Connector:search_and_read`
- Restart Claude Desktop after installation

**Empty search results**
- Verify Full Disk Access is enabled for Claude Desktop
- Try different search terms (name, phone, email)
- Check that Messages app has conversation history

**No messages found**
- Increase `days_back` parameter (try 365)
- Verify the contact has message history in Messages app
- Try different phone number formats

## Why Built-in Tools Fail

The built-in iMessage connector relies entirely on AppleScript, which:
- Can't handle the same contact across multiple services
- Fails silently with no useful error messages
- Misses phone number format variations

This connector uses direct SQLite database access for messages and AppleScript (via the Contacts framework) for contact name resolution, eliminating those failure points while maintaining compatibility across macOS versions.

## Privacy

- All data stays on your Mac
- Read-only database access
- No network connections
- Requires explicit system permission (Full Disk Access)

## Documentation

| Document | Description |
|----------|-------------|
| [QUICKSTART.md](QUICKSTART.md) | 5-minute setup guide |
| [BUILD.md](BUILD.md) | Build from source with security verification |
| [INSTALL.md](INSTALL.md) | Detailed build-from-source instructions |
| [TECHNICAL.md](TECHNICAL.md) | Architecture, database schema, and query details |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Development environment setup and workflow |
| [DEVFLOW.md](DEVFLOW.md) | AI-accessible development loop for MCP extensions |
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |

## License

MIT — See [LICENSE](LICENSE) for details.
