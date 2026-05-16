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
실패로 루프백할 때는 `↩ 2단계로 재시도 (BUILD M/2회, REVIEW M/2회)` 를 출력한다.

파이프라인 단계 요약:
1단계 → 2단계 → 3·4단계(병렬) → 5단계 → 6단계

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

## 3·4단계: 빌드/린트 검증 + 코드 리뷰 (병렬)

`▶ 3·4단계: 빌드 검증 + 코드 리뷰 병렬 실행 (BUILD_RETRIES: {현재값}/2, REVIEW_RETRIES: {현재값}/2)`

`Agent` 도구로 아래 두 에이전트를 **동시에** 호출한다.

- `build-validator` 에이전트 (`.claude/agent/build-validator.md`)
- `frontend-reviewer` 에이전트 (`.claude/agent/frontend-reviewer.md`)
  - 프롬프트에 변경 파일 목록과 각 파일의 전체 내용 포함
  - "위 파일들이 프로젝트 규칙(`.claude/rules/frontend/`)을 위반하는지 검토해줘."

두 에이전트의 결과를 모두 받은 후 아래 순서로 평가한다.

### 결과 평가

**① 빌드 실패 여부 확인**

`BUILD_FAILURE` 반환 시:
- BUILD_RETRIES < 2 → `BUILD_RETRIES += 1`, 리뷰 결과와 함께 FAILURE_REASON에 합산
- BUILD_RETRIES >= 2 → `FAILURE_REASON = "빌드/린트 3회 모두 실패.\n{오류 내용 전체}"` → 6단계(실패)

**② 리뷰 위반 여부 확인**

규칙 위반 반환 시:
- REVIEW_RETRIES < 2 → `REVIEW_RETRIES += 1`, 지적 사항을 FAILURE_REASON에 합산
- REVIEW_RETRIES >= 2 → `FAILURE_REASON = "리뷰 3회 모두 통과 실패.\n{위반 내용 전체}"` → 6단계(실패)

**③ 종합 판단**

- 빌드 실패 또는 리뷰 위반이 하나라도 있고 재시도 가능 →
  ```
  FAILURE_REASON = "빌드 오류: {요약}\n리뷰 지적: {요약}"  (해당하는 항목만)
  ```
  `↩ 2단계로 재시도 (BUILD_RETRIES/2회, REVIEW_RETRIES/2회)` 출력 후 2단계로 돌아간다.
  2단계 수정 완료 후 반드시 3·4단계를 다시 실행한다.

- 빌드 성공 + 리뷰 위반 없음 → 5단계로 진행

---

## 5단계: 커밋 및 PR 생성

`▶ 5단계: 커밋 및 PR 생성`

`Agent` 도구로 `.claude/agent/pr-creator.md`에 정의된 `pr-creator` 에이전트를 호출한다.
프롬프트에 다음 내용을 포함한다:
- `ISSUE_KEY`: $ARGUMENTS
- `ISSUE_TITLE`: 1단계에서 파악한 이슈 제목
- `JIRA_URL`: `https://whatsuphouse.atlassian.net/browse/$ARGUMENTS`
- `CHANGED_FILES`: 2단계에서 생성/수정한 파일 경로 목록
- `COMMIT_MESSAGE`: 이슈 제목을 한 줄로 요약한 한국어 문장

**에이전트가 `PR_SUCCESS` 반환** → PR_URL 변수에 저장 → 6단계(성공 알림)로 이동

**에이전트가 `PR_FAILURE` 반환:**
```
FAILURE_REASON = "PR 생성 실패: {에이전트가 반환한 오류 메시지}"
```
6단계(실패 알림)로 이동한다.

---

## 6단계: Mattermost 알림

`▶ 6단계: Mattermost 알림`

`notify.md` 의 로직을 따른다.

- 성공 시: `/notify success $ARGUMENTS {PR_URL}`
- 실패 시: `/notify failure $ARGUMENTS {FAILURE_REASON}`
