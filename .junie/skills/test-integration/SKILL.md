---
name: test-integration
description: >
  Use when the user asks to "run integration tests", "test with mock db",
  "run node:test suite", "check mock tests", or "run unit tests".
  Runs the node:test suite against a mock SQLite database.
  Does NOT require Full Disk Access or a real Messages database.
disable-model-invocation: true
---

# Integration Test Suite

Runs all mock-database integration tests using Node.js built-in test runner.
No live database or AppleScript required. Works on any platform including CI.

## Run All Integration Tests

```bash
cd src && npm run test:integration
```

Expected: 71 tests across 6 test files (1 smoke + 5 tool-specific). All pass.

## Run a Single Tool's Tests

```bash
cd src && node --test test/tools/search_contacts.test.js
```

Replace `search_contacts` with any tool name.

## Run Both Suites (Integration + Live DB)

macOS only. Requires Full Disk Access for the live portion.

```bash
cd src && npm run test:all
```

## Understanding Test Tiers

Each tool test file has three `describe` blocks:

- **smoke** — Confirms the tool responds at all. One test per tool.
- **functional** — Covers all branches, formats, and modes. This is the specification.
- **robustness** — Bad input, missing contacts, empty results. Confirms graceful failure.

## When Tests Fail

1. Run smoke tests first to isolate: `cd src && node --test test/smoke.test.js`
2. Check that `src/index.js` exports `iMessageMCPServer` and has the `process.argv[1]` guard
3. Check that fixture data in `src/test/fixtures/db.js` matches the assertion
4. Apple timestamps in fixtures use `appleTimestamp(daysAgo)` — ensure `daysAgo < days_back`
