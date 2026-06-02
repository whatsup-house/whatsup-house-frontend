#!/bin/bash
# PostToolUse: Edit/Write 후 .ts/.tsx 파일에 eslint --fix 자동 실행

INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null)

if [[ "$FILE" =~ \.(tsx?|jsx?)$ ]] && [ -f "$FILE" ]; then
  PROJECT_ROOT="$(git -C "$(dirname "$FILE")" rev-parse --show-toplevel 2>/dev/null)"
  if [ -n "$PROJECT_ROOT" ]; then
    npx --prefix "$PROJECT_ROOT" eslint --fix "$FILE" --quiet 2>/dev/null
  fi
fi

exit 0
