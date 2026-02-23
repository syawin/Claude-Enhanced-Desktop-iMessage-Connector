---
name: release
description: >
  This skill should be used when the user asks to "release", "bump version",
  "cut a release", "new release", "version bump", "prepare a release",
  or "publish a new version". Automates the full release checklist: version
  bump across 4 files, CHANGELOG update, build, copy to releases/, and
  GitHub release creation.
disable-model-invocation: true
---

# Release Checklist

Execute each step in order. Stop and report if any step fails.

## 1. Determine Version

Ask the user for the bump type if not specified: `major`, `minor`, or `patch`.

Read the current version from `src/package.json` (the `"version"` field).

Compute the new version by incrementing the appropriate semver segment:
- `patch`: 1.3.0 → 1.3.1
- `minor`: 1.3.0 → 1.4.0
- `major`: 1.3.0 → 2.0.0

Confirm the new version with the user before proceeding.

## 2. Bump Version in Source Files

Run the bump script from the project root:

```bash
bash .claude/skills/release/scripts/bump-version.sh <NEW_VERSION>
```

The script updates 4 files:
- `src/package.json` — `"version": "X.Y.Z"`
- `src/manifest.json` — `"version": "X.Y.Z"`
- `src/index.js` — `version: 'X.Y.Z'`
- `README.md` — download link filename

Verify output shows `OK: All 4 files updated to <NEW_VERSION>`.

## 3. Update CHANGELOG.md

Gather changes since the last tag or last CHANGELOG entry:

```bash
git log --oneline $(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~10)..HEAD
```

Insert a new entry at the top of CHANGELOG.md (after the `# Changelog` header):

```
## [NEW_VERSION] - YYYY-MM-DD

### Changed
- Description of changes

### Fixed
- Description of fixes
```

Use categories: Changed, Added, Fixed, Removed. Omit empty categories. Do not use emoji prefixes (follow v1.3.0 convention).

## 4. Build the Extension

```bash
cd src/ && npm install --silent && npx @anthropic-ai/mcpb pack
```

Verify the build produced a `.mcpb` file:

```bash
ls -la src/src.mcpb
```

## 5. Copy to Releases Directory

```bash
cp src/src.mcpb releases/enhanced-imessage-connector-v<NEW_VERSION>.mcpb
```

## 6. Smoke Test

Verify the build works by running the protocol-level test:

```bash
bash .claude/skills/test-mcp/scripts/test-tools.sh list
```

Expect: `PASS: tools/list — 5 tools registered`. If not, stop and debug.

## 7. Commit and Tag

Stage only the relevant files:

```bash
git add src/package.json src/manifest.json src/index.js README.md CHANGELOG.md
git add -f releases/enhanced-imessage-connector-v<NEW_VERSION>.mcpb
```

Note: `-f` is needed because `*.mcpb` is in `.gitignore`.

```bash
git commit -m "Release v<NEW_VERSION>"
git tag v<NEW_VERSION>
```

## 8. Push and Create GitHub Release

```bash
git push origin HEAD
git push origin v<NEW_VERSION>
```

Create the GitHub release with the `.mcpb` attached. Use the CHANGELOG entry as the release notes:

```bash
gh release create v<NEW_VERSION> \
  releases/enhanced-imessage-connector-v<NEW_VERSION>.mcpb \
  --title "v<NEW_VERSION>" \
  --notes "<CHANGELOG entry for this version>"
```

## 9. Post-Release Verification

Confirm the release exists:

```bash
gh release view v<NEW_VERSION>
```

Report the release URL to the user.
