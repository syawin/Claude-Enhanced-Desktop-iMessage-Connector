---
paths:
  - "src/**/*.js"
---

# Architecture Details

## Critical Technical Details

**Apple Timestamp Format**:
- Messages database uses nanoseconds since 2001-01-01 00:00:00 UTC
- Conversion logic in `calculateAppleTimestamp()` method
- Unix epoch is 1970-01-01, so offset is 978307200 seconds

**Multi-Handle Resolution**:
- Same contact can have multiple "handles" (phone numbers, emails, iMessage IDs)
- `findHandleIds()` searches multiple patterns: original, cleaned digits, with +prefix
- Groups messages from all handles for unified conversation view
- Critical for reliability since built-in tools fail on format variations

**Contact Name Resolution** (AppleScript-based):
- `ensureContactsLoaded()` lazy-loads all contacts via a single AppleScript batch call on first use (~0.5s for 500+ contacts)
- `loadContactsViaAppleScript()` uses bulk property access (`first name of every person`, etc.) for performance — sends 4 Apple Events instead of per-person iteration
- Builds in-memory Maps: `phoneToNameMap` (digit-normalized phone → name) and `emailToNameMap` (lowercase email → name)
- `resolveContactName()` checks cache → Map lookup → `formatPhoneForDisplay()` fallback
- `resolveContactNameViaMap()` handles phone matching: exact digits → last-10-digits → substring scan
- `findContactsByName()` does linear scan through `appleScriptContacts` array for name-based searches
- Maintains `contactNameCache` (Map) for per-handle caching across tool calls
- Gracefully degrades to phone number display if AppleScript fails (soft-fail pattern)

**AttributedBody Decoding**:
- Some messages store content in BLOB format instead of plain text
- Basic text extraction in `extractTextFromAttributedBody()`
- Extracts readable ASCII from typedstream-encoded data
- Used as fallback when `text` field is empty

## Database Schema (Messages)

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

## Tool Methods

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
