현재 브랜치에서 변경된 파일을 읽고, `frontend-reviewer` 에이전트에 위임해 코드를 검토한다.

다음 순서로 진행한다:

1. `git diff develop --name-only`로 변경된 파일 목록을 확인한다.
   목록이 비어있으면 "변경된 파일이 없습니다"를 출력하고 종료한다.

2. 변경된 파일을 모두 읽는다.

3. `Agent` 도구로 `.claude/agent/frontend-reviewer.md`에 정의된 `frontend-reviewer` 에이전트를 호출한다.
   프롬프트에 다음 내용을 포함한다:
   - 검토 대상 파일 목록 (경로 포함)
   - 각 파일의 전체 내용
   - "위 파일들이 프로젝트 규칙을 위반하는지 검토해줘. 규칙은 `.claude/rules/frontend/` 폴더를 참고해."

4. 에이전트의 검토 결과를 그대로 출력한다.
