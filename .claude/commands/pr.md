현재 브랜치의 변경사항을 바탕으로 GitHub Pull Request를 생성한다.

인자로 Jira 티켓 번호를 받는다. 예: /pr KAN-9

다음 순서로 진행한다:

1. 현재 브랜치명 확인: `git branch --show-current`
2. 변경된 커밋 요약: `git log develop..HEAD --oneline`
3. 변경된 파일 목록: `git diff develop --name-only`
4. Jira 티켓 번호가 있으면 `mcp__claude_ai_Atlassian_Rovo__getJiraIssue`로 티켓 정보를 조회한다.
   - cloudId: `d4081ac1-010a-45f5-8241-d9d67209e21b`
   - 조회 후 `summary` (티켓 이름)와 `webUrl` (Jira 링크)를 추출한다.
5. 아래 형식으로 PR을 생성한다.

---

PR 생성 명령어:

```
gh pr create \
  --title "[$ARGUMENTS] <변경사항을 한 줄로 요약>" \
  --body "<아래 본문>" \
  --base develop
```

PR 본문 형식:

```
## 관련 티켓
- [$ARGUMENTS] <티켓 summary> — <Jira webUrl>

## 변경 내용
- (변경된 파일/기능을 bullet로 요약)

## 주요 구현 사항
- (핵심 구현 내용 2-5개)

## 체크리스트
- [ ] 명세서 요구사항 충족
- [ ] 프로젝트 규칙 준수 (/review 통과)
- [ ] 모바일 레이아웃 확인
- [ ] 타입 오류 없음 (npm run build)
```

Jira 티켓 번호가 없으면 (인자 없이 /pr 실행 시):
- 티켓 번호 없이 PR 제목을 구성하고, 관련 티켓 섹션은 생략한다.

---

PR 생성 후:
- 생성된 PR URL을 출력한다.
- Jira 티켓 번호가 있으면 "$ARGUMENTS PR이 생성됐습니다: <PR URL>"을 출력한다.
