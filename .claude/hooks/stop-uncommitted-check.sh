#!/bin/bash
# Stop: 응답 완료 후 uncommitted 변경 파일 경고

UNCOMMITTED=$(git status --porcelain 2>/dev/null | grep -v "^??" | wc -l | tr -d ' ')

if [ "$UNCOMMITTED" -gt "0" ]; then
  echo ""
  echo "⚠️  커밋되지 않은 변경 파일 ${UNCOMMITTED}개:"
  git status --short 2>/dev/null | grep -v "^??"
fi

exit 0
