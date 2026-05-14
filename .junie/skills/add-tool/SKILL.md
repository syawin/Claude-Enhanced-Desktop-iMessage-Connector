---
name: add-tool
description: >
  Use when the user asks to "add a tool", "create a new tool", "implement a new
  MCP tool", or "add a feature as a tool". Provides the complete checklist for
  adding a tool including source, manifest, tests, CI, and bash script updates.
disable-model-invocation: false
---

# Add a New MCP Tool — Complete Checklist

Follow these steps in order. Each step has a verification.

## 1. Implement the Tool in `src/index.js`

- Add tool definition to the `ListToolsRequestSchema` handler (tools array)
- Add `case` to the `CallToolRequestSchema` switch statement
- Implement the method following the existing pattern:
  1. `const db = await this.openDatabase()`
  2. `const threshold = this.calculateAppleTimestamp(daysBack)`
  3. Parameterized SQL queries (never interpolate user input)
  4. `await db.close()` in both success and catch paths
  5. Return `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`

## 2. Update `src/manifest.json`

Add the tool entry to the `"tools"` array:
```json
{ "name": "your_tool_name", "description": "Brief description" }
```

## 3. Add Test Seed Data (if needed)

If the tool queries data not in the existing fixture, add rows to
`src/test/fixtures/db.js`. Keep seed data minimal — one happy-path row,
one edge-case row.

## 4. Create Test File

Create `src/test/tools/<tool_name>.test.js` with three tiers:

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../helpers/server.js';

describe('Tool: <tool_name>', () => {
  let server, cleanup;
  before(async () => ({ server, cleanup } = await makeServer()));
  after(() => cleanup());

  describe('smoke', () => {
    it('returns a valid MCP response', async () => {
      const result = await server.<methodName>(<args>);
      assert.ok(result.content[0].text.length > 0);
    });
  });

  describe('functional', () => {
    // Test each parameter, each output format, each code branch
  });

  describe('robustness', () => {
    // Unknown identifier, empty results, boundary values
  });
});
```

## 5. Add Smoke Test Entry

Add one smoke test to `src/test/smoke.test.js` in the existing describe block.

## 6. Update CI Workflow

In `.github/workflows/test.yml`, add the new test file path to the
`test:integration` script in `src/package.json`.

## 7. Update Bash Test Script

In **both** `scripts/test-tools.sh` and `.claude/skills/test-mcp/scripts/test-tools.sh`:
1. Add a `test_<tool_name>()` function
2. Add it to the `all` case dispatcher
3. Update the tool count assertion from N to N+1

Both files must be kept identical.

## 8. Verify

```bash
cd src
npm run test:integration          # Mock DB tests pass
node --test test/smoke.test.js    # Smoke tests pass
bash ../scripts/test-tools.sh list  # tools/list shows N+1 tools
```
