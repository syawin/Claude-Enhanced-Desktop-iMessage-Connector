---
paths:
  - "src/**/*.js"
  - "src/manifest.json"
  - "src/package.json"
---

# Development Guidelines

## Adding a New Tool

1. Add tool definition to `ListToolsRequestSchema` handler
2. Add case to `CallToolRequestSchema` handler switch statement
3. Implement method following existing pattern (open DB, query, process, close, return JSON)
4. Update `manifest.json` with tool metadata
5. Test with `echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node src/index.js`

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
