---
paths:
  - "src/**/*.js"
  - "src/manifest.json"
  - "src/package.json"
---

# Development Guidelines

## Adding a New Tool

Use the `add-tool` skill (`/add-tool`) for the complete checklist. Summary:

1. Add tool definition to `ListToolsRequestSchema` handler
2. Add case to `CallToolRequestSchema` handler switch statement
3. Implement method following existing pattern (open DB, query, process, close, return JSON)
4. Update `manifest.json` with tool metadata
5. Add seed data to `src/test/fixtures/db.js` if needed
6. Create `src/test/tools/<tool_name>.test.js` with smoke, functional, and robustness tiers
7. Add smoke entry to `src/test/smoke.test.js`
8. Add test file to `test:integration` script in `src/package.json`
9. Add `test_<tool_name>()` to **both** `scripts/test-tools.sh` and `.claude/skills/test-mcp/scripts/test-tools.sh` (keep identical)
10. Run `cd src && npm run test:integration` to verify

## Integration Tests

Tests use Node.js built-in `node:test` runner against a mock SQLite database (no macOS or Full Disk Access required). Use the `test-integration` skill (`/test-integration`) for details.

```bash
cd src && npm run test:integration    # All mock-DB tests
cd src && node --test test/tools/search_contacts.test.js  # Single tool
```

A PostToolUse hook in `.claude/settings.json` reminds you to update tests when `src/index.js` is modified.

## Modifying SQL Queries

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

## Debugging Database Issues

Enable debug logging by uncommenting `console.error()` calls in `src/index.js`.

View logs in Claude Desktop: Settings > Extensions > Enhanced iMessage Connector > View Logs

## Version Updates

Update version in THREE files:
1. `src/package.json`
2. `src/manifest.json`
3. `src/index.js` (MCP server version string)
