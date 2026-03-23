# Deployment

## Release Process

1. Test all 5 tools thoroughly with real message data
2. Update version in 3 files (package.json, manifest.json, index.js)
3. Update CHANGELOG.md with changes
4. Build: `cd src/ && npx @anthropic-ai/mcpb pack`
5. Copy `.mcpb` file to `releases/` directory with version in filename
6. Create GitHub release with `.mcpb` file attached
7. Update README.md if user-facing changes

## Distribution

Built `.mcpb` files are single-file packages containing:
- index.js
- package.json (with dependencies)
- manifest.json
- node_modules/ (bundled dependencies)

Users install by double-clicking `.mcpb` file — no build process required.

## Known Limitations

1. **AttributedBody parsing** is basic — only extracts ASCII text, not formatting/attachments
2. **Contact resolution blocks event loop** — `execSync` AppleScript call blocks for ~0.5s on first use (acceptable for MCP stdio server)
3. **Group chat participant names** require per-handle contact resolution (fast after initial AppleScript load)
4. **No attachment support** — only text content is extracted
5. **Requires Full Disk Access** — macOS security permission needed for Messages database access
