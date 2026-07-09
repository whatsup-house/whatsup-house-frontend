#!/bin/bash
# PostToolUse: Edit/Write 후 .ts/.tsx 파일에 eslint --fix 자동 실행
# JSON 파싱은 node로 처리한다 (python3는 Windows Git Bash에 없을 수 있음)

INPUT=$(cat)
FILE=$(echo "$INPUT" | node -e "
let d = '';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try { console.log(JSON.parse(d).tool_input?.file_path || ''); }
  catch { console.log(''); }
});
" 2>/dev/null)

if [[ "$FILE" =~ \.(tsx?|jsx?)$ ]] && [ -f "$FILE" ]; then
  PROJECT_ROOT="$(git -C "$(dirname "$FILE")" rev-parse --show-toplevel 2>/dev/null)"
  if [ -n "$PROJECT_ROOT" ]; then
    npx --prefix "$PROJECT_ROOT" eslint --fix "$FILE" --quiet 2>/dev/null
  fi
fi

exit 0
