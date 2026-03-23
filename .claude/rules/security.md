---
paths:
  - "src/**/*.js"
---

# Security Constraints

## Database Access

- ALWAYS use `sqlite3.OPEN_READONLY` mode for Messages database
- NEVER write to Messages database
- Only one SQLite database is accessed: `~/Library/Messages/chat.db`
- Contact resolution uses AppleScript (read-only access to Contacts framework)

## No Network Access

- Extension must work entirely offline
- No dependencies with network capabilities
- Allowed dependencies: `@modelcontextprotocol/sdk`, `sqlite3`, `sqlite`
- Uses Node.js built-in `execSync` for AppleScript execution (hardcoded script, no user input interpolated)

## Input Sanitization

- Use parameterized SQL queries
- Clean phone numbers with `replace(/[^0-9]/g, '')` before searching
- Validate limit parameters to prevent resource exhaustion
