#!/usr/bin/env bash
# Pre-deploy validation script - checks for placeholder values that must be replaced
# Usage: ./scripts/validate-config.sh
# Exit code 0 = all checks passed, 1 = placeholders found

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "====================================="
echo "  Pre-Deploy Configuration Validator"
echo "====================================="
echo ""

# List of known placeholder patterns to check for (case-insensitive whole-word match)
PLACEHOLDERS=(
  "YOUR_PROJECT_ID"
  "CHANGE_ME"
  "REPLACE_ME"
  "TODO_CHANGE"
  "changeme"
  "replaceme"
  "your-project-id"
  "your_secret_here"
  "your-api-key"
  "example-key"
)

# Files/directories to check
CHECK_PATHS=(
  "contract/config/chains.json"
  "config/"
  ".github/"
  "app/backend/src/"
)

# Patterns that are safe to have in comments or documentation
IGNORE_COMMENTS=true

check_file() {
  local file="$1"
  local found_issue=false

  for placeholder in "${PLACEHOLDERS[@]}"; do
    # Use -w for whole-word matching to avoid false positives like "replacement"
    if grep -qiw "$placeholder" "$file" 2>/dev/null; then
      # Count occurrences (whole-word, case-insensitive)
      local count
      count=$(grep -ciw "$placeholder" "$file" 2>/dev/null || echo 0)

      if $IGNORE_COMMENTS; then
        # Check if ALL occurrences are in comments
        local non_comment_lines
        non_comment_lines=$(grep -niw "$placeholder" "$file" 2>/dev/null | grep -v '^\s*[0-9]*:\s*\(//\|#\|/\*\|\*\|<!--\)' | wc -l || echo 0)
        if [ "$non_comment_lines" -eq 0 ]; then
          continue
        fi
        count=$non_comment_lines
      fi

      if [ "$count" -gt 0 ]; then
        echo -e "  ${RED}✗${NC} Found $count instance(s) of '${YELLOW}$placeholder${NC}' in $file"
        found_issue=true
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done

  if $found_issue; then
    return 1
  fi
  return 0
}

echo "Checking for placeholder values in configuration files..."
echo ""

# Check specific config files
for check_path in "${CHECK_PATHS[@]}"; do
  if [ -f "$check_path" ]; then
    check_file "$check_path"
  elif [ -d "$check_path" ]; then
    while IFS= read -r -d '' file; do
      check_file "$file" || true
    done < <(find "$check_path" -type f \( -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.ts" -o -name "*.js" -o -name "*.env*" -o -name "*.toml" \) -print0 2>/dev/null || true)
  fi
done

echo ""

# Additional checks
echo "Running additional security checks..."

# Check for common hardcoded keys/secrets patterns
HARDCODED_SECRETS=(
  'api[_-]?key\s*[:=]\s*["'"'"'][a-zA-Z0-9_-]{20,}["'"'"']'
  'secret\s*[:=]\s*["'"'"'][a-zA-Z0-9_-]{10,}["'"'"']'
  'password\s*[:=]\s*["'"'"'][^$][a-zA-Z0-9_-]{6,}["'"'"']'
  'token\s*[:=]\s*["'"'"'][a-zA-Z0-9._-]{20,}["'"'"']'
)

for check_path in "${CHECK_PATHS[@]}"; do
  if [ -f "$check_path" ]; then
    FILES="$check_path"
  elif [ -d "$check_path" ]; then
    FILES=$(find "$check_path" -type f \( -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.ts" -o -name "*.js" \) 2>/dev/null || true)
  else
    continue
  fi

  for file in $FILES; do
    for pattern in "${HARDCODED_SECRETS[@]}"; do
      if grep -qP "$pattern" "$file" 2>/dev/null; then
        # Skip if it references an env var
        if ! grep -qP '\$\{.*'"$pattern" "$file" 2>/dev/null; then
          echo -e "  ${YELLOW}⚠${NC} Potential hardcoded secret pattern in $file"
          WARNINGS=$((WARNINGS + 1))
          break
        fi
      fi
    done
  done
done

echo ""

# Summary
echo "====================================="
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "  ${GREEN}✓ All checks passed!${NC}"
  echo "====================================="
  exit 0
else
  if [ "$ERRORS" -gt 0 ]; then
    echo -e "  ${RED}✗ $ERRORS error(s) found${NC}"
  fi
  if [ "$WARNINGS" -gt 0 ]; then
    echo -e "  ${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
  fi
  echo "====================================="
  echo ""
  echo "Please fix the issues above before deploying."
  exit 1
fi
