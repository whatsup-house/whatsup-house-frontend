인자로 받은 Jira 이슈 키($ARGUMENTS)에 대해 자동 개발 파이프라인을 실행한다.

인자가 없으면 "이슈 키를 인자로 전달하세요. 예: /auto-dev KAN-9"라고 출력하고 종료한다.

---

## 파이프라인 상태

대화 내에서 아래 상태를 추적한다. 각 단계 시작 시 현재 값을 출력한다.

```
ISSUE_KEY     = $ARGUMENTS
BRANCH_NAME   = feat/{$ARGUMENTS를 소문자로} (예: feat/kan-9)
BUILD_RETRIES = 0   (최대 2)
REVIEW_RETRIES = 0  (최대 2)
FAILURE_REASON = ""
```

각 단계 진입 시 `▶ N단계 시작` 을 출력한다.
실패로 루프백할 때는 `↩ N단계로 재시도 (M/2회)` 를 출력한다.

---

## 1단계: 이슈 파악 및 상태 전환

`▶ 1단계: Jira 이슈 파악`

Atlassian Rovo MCP로 이슈를 조회한다.
- cloudId: `d4081ac1-010a-45f5-8241-d9d67209e21b`
- issueIdOrKey: `$ARGUMENTS`

조회 후:
- 이슈 상태를 "진행 중"으로 전환한다 (transition ID: `31`)
- 이슈 제목, 구현 사항, 필요 API 엔드포인트를 파악한다.

---

## 2단계: 코드 구현

`▶ 2단계: 개발`

루프백으로 재진입 시 실패한 이유(빌드 오류 또는 리뷰 지적 사항)를 반드시 함께 수정한다.

### 브랜치 준비

```bash
git checkout develop
git pull origin develop
git checkout -b BRANCH_NAME
```

브랜치가 이미 존재하면 `git checkout BRANCH_NAME` 으로 전환한다.

### 구현 규칙 (CLAUDE.md 준수)

아래 순서로 구현한다.

1. `lib/api/types.ts` — 필요한 API 요청/응답 타입 추가
2. `lib/api/{domain}.ts` — API 함수 추가 (axios, response.data.data 반환)
3. `lib/hooks/use{Domain}.ts` — React Query 훅 추가
4. `components/` — UI 컴포넌트 구현
5. `app/` — page.tsx 라우팅 연결 (필요한 경우)

**반드시 지켜야 할 규칙:**
- `any` 타입 사용 금지
- 컴포넌트에서 apiClient 직접 import 금지
- hex 색상 직접 사용 금지 (커스텀 토큰 사용)
- `use client`는 꼭 필요한 경우에만 추가

---

## 3단계: 빌드/린트 검증

`▶ 3단계: 빌드/린트 검증 (BUILD_RETRIES: {현재값}/2)`

```bash
npm run lint && npm run build
```

**통과** → 4단계로 진행

**실패 & BUILD_RETRIES < 2:**
```
BUILD_RETRIES += 1
FAILURE_REASON = "빌드/린트 오류: {오류 메시지 요약}"
```
`↩ 2단계로 재시도 (BUILD_RETRIES/2회)` 출력 후 오류를 수정하러 2단계로 돌아간다.

**실패 & BUILD_RETRIES >= 2:**
```
FAILURE_REASON = "빌드/린트 3회 모두 실패.\n마지막 오류: {오류 메시지 전체}"
```
6단계(실패 알림)로 이동한다.

---

## 4단계: 코드 리뷰

`▶ 4단계: 코드 리뷰 (REVIEW_RETRIES: {현재값}/2)`

`review.md` 의 검토 기준(데이터 흐름, 타입 안전성, 상태 관리, 컴포넌트 규칙, 스타일링)으로 변경된 파일을 검토한다.

**"규칙 위반 없음"** → 5단계로 진행

**위반 발견 & REVIEW_RETRIES < 2:**
```
REVIEW_RETRIES += 1
FAILURE_REASON = "리뷰 지적: {위반 내용 요약}"
```
`↩ 2단계로 재시도 (REVIEW_RETRIES/2회)` 출력 후 지적 사항을 수정하러 2단계로 돌아간다.
2단계 수정 완료 후 반드시 3단계(빌드 재검증)도 다시 실행한다.

**위반 발견 & REVIEW_RETRIES >= 2:**
```
FAILURE_REASON = "리뷰 3회 모두 통과 실패.\n마지막 지적 사항: {위반 내용 전체}"
```
6단계(실패 알림)로 이동한다.

---

## 5단계: 커밋 및 PR 생성

`▶ 5단계: 커밋 및 PR 생성`

### 커밋

변경된 파일을 명시적으로 스테이징하고 커밋한다.

```bash
git add {변경된 파일 경로들}
git commit -m "feat: {이슈 제목을 한 줄로 요약}"
```

커밋 메시지 규칙:
- AI 활용 관련 내용 절대 포함 금지 (Co-Authored-By 등)
- 한국어 요약

### PR 생성

`pr.md` 의 PR 생성 로직을 따르되, 아래 조건을 추가한다.

- `--base develop`
- PR 제목: `[$ARGUMENTS] {이슈 제목 요약}`
- PR 본문 "관련 티켓" 섹션에 `$ARGUMENTS` 이슈 키와 Jira 링크 명시
  - 형식: `**$ARGUMENTS**: [{이슈 제목}](https://whatsuphouse.atlassian.net/browse/$ARGUMENTS)`

**PR 생성 성공** → PR URL을 PR_URL 변수에 저장 → 6단계(성공 알림)로 이동

**PR 생성 실패:**
```
FAILURE_REASON = "PR 생성 실패: {오류 메시지}"
```
6단계(실패 알림)로 이동한다.

---

## 6단계: Mattermost 알림

`▶ 6단계: Mattermost 알림`

`notify.md` 의 로직을 따른다.

- 성공 시: `/notify success $ARGUMENTS {PR_URL}`
- 실패 시: `/notify failure $ARGUMENTS {FAILURE_REASON}`
