#!/usr/bin/env bash
# bump-version.sh — Update version across all 4 project files.
# Requires: python3 (pre-installed on macOS)
# Note: Uses macOS-specific sed syntax (darwin only).
# Usage: bump-version.sh <NEW_VERSION>
# Example: bump-version.sh 1.4.0
set -euo pipefail

NEW_VERSION="${1:?Usage: bump-version.sh <NEW_VERSION>}"
PROJECT_DIR="$(git rev-parse --show-toplevel)"

# Preflight checks
command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 is required but not found on PATH" >&2; exit 1; }

# Validate semver format
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: Version must be in MAJOR.MINOR.PATCH format (got: $NEW_VERSION)" >&2
  exit 1
fi

# Read current version from package.json (path passed via argv to avoid injection)
CURRENT_VERSION=$(python3 -c "
import json, sys
try:
    data = json.load(open(sys.argv[1]))
    print(data['version'])
except (FileNotFoundError, KeyError, json.JSONDecodeError) as e:
    print(f'ERROR: Cannot read version from {sys.argv[1]}: {e}', file=sys.stderr)
    sys.exit(1)
" "$PROJECT_DIR/src/package.json")

if [[ "$CURRENT_VERSION" == "$NEW_VERSION" ]]; then
  echo "ERROR: New version ($NEW_VERSION) is the same as current version" >&2
  exit 1
fi

echo "Bumping version: $CURRENT_VERSION -> $NEW_VERSION"

# Escape dots for sed regex (1.3.0 -> 1\.3\.0)
ESCAPED_CURRENT=$(echo "$CURRENT_VERSION" | sed 's/\./\\./g')

# Use python3 for replacements — exact string matching, no regex ambiguity,
# and reports an error if the pattern is not found (unlike sed which returns 0).
replace_exact() {
  local filepath="$1"
  local old_str="$2"
  local new_str="$3"
  python3 -c "
import sys
path, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
content = open(path).read()
if old not in content:
    print(f'FAIL: pattern not found in {path}', file=sys.stderr)
    sys.exit(1)
open(path, 'w').write(content.replace(old, new, 1))
" "$filepath" "$old_str" "$new_str"
}

# 1. src/package.json — "version": "X.Y.Z"
replace_exact "$PROJECT_DIR/src/package.json" "\"version\": \"$CURRENT_VERSION\"" "\"version\": \"$NEW_VERSION\""

# 2. src/manifest.json — "version": "X.Y.Z"
replace_exact "$PROJECT_DIR/src/manifest.json" "\"version\": \"$CURRENT_VERSION\"" "\"version\": \"$NEW_VERSION\""

# 3. src/index.js — version: 'X.Y.Z'
replace_exact "$PROJECT_DIR/src/index.js" "version: '$CURRENT_VERSION'" "version: '$NEW_VERSION'"

# 4. README.md — enhanced-imessage-connector-vX.Y.Z.mcpb
replace_exact "$PROJECT_DIR/README.md" "enhanced-imessage-connector-v$CURRENT_VERSION" "enhanced-imessage-connector-v$NEW_VERSION"

# Verify all replacements succeeded (belt-and-suspenders)
ERRORS=0
grep -q "\"version\": \"$NEW_VERSION\""                  "$PROJECT_DIR/src/package.json"  || { echo "FAIL: src/package.json" >&2; ERRORS=$((ERRORS+1)); }
grep -q "\"version\": \"$NEW_VERSION\""                  "$PROJECT_DIR/src/manifest.json" || { echo "FAIL: src/manifest.json" >&2; ERRORS=$((ERRORS+1)); }
grep -q "version: '$NEW_VERSION'"                        "$PROJECT_DIR/src/index.js"      || { echo "FAIL: src/index.js" >&2; ERRORS=$((ERRORS+1)); }
grep -q "enhanced-imessage-connector-v$NEW_VERSION\.mcpb" "$PROJECT_DIR/README.md"        || { echo "FAIL: README.md" >&2; ERRORS=$((ERRORS+1)); }

if [ "$ERRORS" -gt 0 ]; then
  echo "ERROR: $ERRORS file(s) failed to update" >&2
  exit 1
fi

echo "OK: All 4 files updated to $NEW_VERSION"
