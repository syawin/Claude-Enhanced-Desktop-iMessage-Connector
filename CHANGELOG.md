# Changelog

## [1.5.0] - 2026-03-23

### Changed
- **Minimum Node.js version** raised from 18 to 24
- Updated `engines.node` in `package.json` and `runtimes.node` in `manifest.json` to `>=24.0.0`
- Upgraded `sqlite3` dependency to ^5.1.7 for Node.js 24 compatibility
- Added `.nvmrc` file for consistent development environment
- Updated all documentation to reflect Node.js 24+ requirement

## [1.4.0] - 2026-03-05

### Fixed
- **macOS 26 (Tahoe) compatibility** - Contact name resolution now works on macOS 26 where Apple removed the local AddressBook SQLite database
- **Contacts resolution backend** - Replaced direct SQLite database access with AppleScript-based contact resolution via the Contacts framework
- All 5 tools now correctly display contact names instead of raw phone numbers on macOS 26
- Fixed SQL typo `'2001-01-1'` → `'2001-01-01'` in group stats `last_message` calculation (pre-existing bug)
- Fixed unreachable guard in `findContactsByName` — contacts with no phone/email are now properly skipped

### Changed
- Contact data is now loaded via a single AppleScript batch call on first use, then cached in memory for fast lookups
- Removed dependency on `AddressBook-v22.abcddb` SQLite database path
- Removed `fs` import (no longer needed)

## [1.3.0] - 2026-02-09

### Changed
- **Migrated from DXT to MCPB format** — manifest now uses `manifest_version: "0.3"` (was `dxt_version: "0.1"`)
- **Machine-readable name** — `name` field is now `enhanced-imessage-connector`; display name moved to `display_name`
- **Added compatibility metadata** — platform restricted to `darwin`, runtime requires `node >=18.0.0`
- **Added repository and homepage** fields to manifest
- **Build command** changed from `dxt pack` to `npx @anthropic-ai/mcpb pack`
- **Output format** changed from `.dxt` to `.mcpb`

## [1.0.3] - 2025-08-06

### 🔧 Fixed
- **Apple timestamp conversion** - Fixed critical bug preventing message reading
- **Date threshold calculation** - Properly handles nanoseconds since 2001-01-01 epoch
- **Multi-handle resolution** - Improved contact matching across SMS/iMessage/RCS
- **Error handling** - Added comprehensive debug logging for troubleshooting

### 🧪 Tested & Verified
- **Contact discovery**: Finds thousands of contacts vs 0 for built-in tools
- **Message reading**: Successfully reads complete message history with timestamps
- **Multi-service support**: Correctly handles SMS, iMessage, and RCS messages
- **Date processing**: Accurate message retrieval across multiple years
- **Performance**: Zero failure rate vs 100% for built-in connector

### ⚡ Performance Improvements
- **Direct SQLite access** eliminates AppleScript dependency failures
- **Optimized queries** with proper database indexing
- **Robust phone number matching** handles all common formats
- **Enhanced error messages** provide clear troubleshooting information

## [1.0.0] - 2025-08-01

### 🎉 Initial Release
- **Enhanced contact search** - Find contacts by name, phone, or email
- **Smart message reading** - Read actual message content with date filtering
- **Conversation statistics** - Message counts and daily breakdowns
- **Sentiment analysis** - Detect hostile keywords in conversations
- **Multi-handle support** - Same contact across different services
- **Direct database access** - No AppleScript dependencies
- **Desktop Extension packaging** - One-click installation via .dxt format

### 🛠️ Architecture
- **MCP Server implementation** using official Anthropic SDK
- **SQLite integration** for reliable Messages database access
- **Comprehensive error handling** with graceful failure modes
- **Privacy-focused design** - all data stays local, read-only access

### 🎯 Problem Solved
Claude Desktop's built-in iMessage tools have critical issues:
- Find 0 contacts for most searches
- Fail with AppleScript errors
- Can't handle multiple phone number formats
- No analytics or advanced features
- Unreliable d
