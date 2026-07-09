인자로 받은 Jira 이슈 키($ARGUMENTS)에 대해 자동 개발 파이프라인을 실행한다.

인자가 없으면 "이슈 키를 인자로 전달하세요. 예: /auto-dev KAN-9"라고 출력하고 종료한다.
인자가 여러 개면(쉼표/공백 구분) 각 이슈에 대해 **한 번에 하나씩** 전체 파이프라인을 순차 실행한다.

파이프라인: 0.타겟 판별 → 1.이슈 파악/계획 → 2.구현 → 3.검증(빌드∥리뷰) → 4.실행 검증 → 5.커밋/PR → 6.알림/기록

가드레일: 빌드 실패와 리뷰 위반은 각각 **최대 2회**까지 수정 후 재검증한다. 초과 시 실패로 종료하고 6단계에서 실패 알림을 보낸다. 진행 상황은 태스크 도구(TaskCreate/TaskUpdate)로 추적한다.

---

## 0단계: 타겟 레포 판별 (FE / BE)

Jira 이슈 제목의 접두사로 작업 대상을 결정한다: `[FE]` → 프론트엔드, `[BE]` → 백엔드. 접두사가 없으면 이슈 본문으로 추정하되, 불확실하면 사용자에게 질문한다.

REPO_DIR은 하드코딩하지 않고 **현재 머신에서 탐색**한다:

1. 현재 세션 루트가 해당 레포면 그대로 사용
2. 아니면 아래 후보 경로를 순서대로 확인 (존재 + `git rev-parse` 성공 기준):
   - Windows: `C:\Users\SSAFY\Desktop\TJmedia\와썹\{whatsup-house-frontend | backend}`
   - macOS: `/Users/tjmedia/Downloads/와썹하우스/{whatsup-house-frontend | whatsup-house-backend}`
3. 둘 다 실패하면 사용자에게 레포 경로를 질문한다.

이후 모든 git/빌드/테스트 명령은 반드시 REPO_DIR에서 실행한다.

---

## 1단계: 이슈 파악 및 계획

Atlassian MCP로 이슈를 조회한다 (cloudId: `d4081ac1-010a-45f5-8241-d9d67209e21b`, 실패 시 getAccessibleAtlassianResources로 재확인).

- 이슈 상태를 "진행 중"으로 전환한다. transition ID를 하드코딩하지 말고 `getTransitionsForJiraIssue`로 조회해 이름이 "진행 중"인 전환을 사용한다.
- 이슈 제목, 구현 사항, 필요 API 엔드포인트를 파악한다.
- 이슈가 "결정 필요" 상태(선택지가 남아 있는 검토 일감)라면 구현하지 말고 사용자에게 결정을 요청한다.

**난이도 판별**: 이슈가 아래 중 하나라도 건드리면 HARD로 분류한다.
- DB 마이그레이션 / 스키마 변경
- 인증·인가 / 결제·이용권 / 마일리지 정산
- 동시성·트랜잭션 경계

HARD 이슈는 2단계 구현 후 3단계 리뷰와 별개로, **opus 급 서브에이전트(claude-opus-4-8)에 설계 검토를 추가 위임**한다 (변경 파일 경로와 이슈 요약을 전달).

구현 계획(PLAN)을 수립한다. PLAN은 5단계에서 PR 본문의 "구현 계획" 섹션에 그대로 들어간다.

```
PLAN:
- 수정할 파일 / 생성할 파일
- 구현 접근법 (핵심 로직 한 줄)
- 재사용 가능한 기존 코드 (FE: lib/hooks, lib/api / BE: global 공통 모듈, 기존 도메인 서비스)
- 주의사항 (엣지 케이스, FE: SSR / BE: 트랜잭션·Flyway)
```

현재 세션의 memory 디렉토리에 `skills.md`가 있으면 유사한 이슈 패턴을 참고한다.

---

## 2단계: 코드 구현

### 브랜치 준비 (REPO_DIR에서)

```bash
git fetch origin
git checkout -b {feat|fix|chore}/{이슈키 소문자}-{영문-슬러그} origin/develop
```

브랜치가 이미 존재하면 checkout으로 전환한다. 재시도로 재진입한 경우 실패 원인(빌드 오류/리뷰 지적)을 반드시 함께 수정한다.

### 구현 규칙 — TARGET=FE

types.ts → api 함수 → React Query 훅 → 컴포넌트 → 라우팅 순서로 구현한다.
`any` 금지, 컴포넌트에서 apiClient 직접 import 금지, hex 색상 금지(커스텀 토큰 사용), `use client` 최소화. 상세 규칙은 `.claude/rules/frontend/`를 따른다.

### 구현 규칙 — TARGET=BE

ErrorCode → entity/repository → service → controller 순서로 구현한다.
- 스키마 변경 시 Flyway 신규 `V{N}__*.sql` 추가. **기존 V 파일 수정 절대 금지** (체크섬 오류)
- 응답은 ApiResult 래퍼, 예외는 CustomException(ErrorCode)
- 운영 DB는 Flyway + ddl-auto:validate — 엔티티와 마이그레이션이 반드시 일치해야 함
- 서버는 Caddy 리버스 프록시 뒤 — 클라이언트 IP는 X-Forwarded-For에서 읽는다
- 상세 규칙은 백엔드 레포 `.claude/skills/backend/SKILL.md`를 따른다.

---

## 3단계: 빌드 검증 + 코드 리뷰 (병렬)

### TARGET=FE

`Agent` 도구로 두 서브에이전트를 **동시에** 호출한다:
- `build-validator` (haiku) — 프롬프트: "REPO_DIR에서 lint와 build를 실행하고 결과를 보고해줘"
- `frontend-reviewer` (opus) — 프롬프트에 **변경된 파일의 경로 목록만** 전달한다. 파일 내용을 복붙하지 않는다 (에이전트가 직접 읽는다).

### TARGET=BE

- 빌드 검증: REPO_DIR에서 `./gradlew build` 직접 실행 (테스트 포함, 백그라운드 실행 가능)
- 코드 리뷰: 백엔드 레포의 리뷰 에이전트가 있으면 그것을, 없으면 general-purpose 에이전트에 백엔드 규칙 준수 검토를 위임한다. 역시 **경로 목록만** 전달.

### 결과 평가

- 빌드 실패: BUILD_RETRIES < 2면 +1 하고 2단계로 돌아가 수정. 초과 시 실패 종료.
- 리뷰 위반(REVIEW_FAIL): REVIEW_RETRIES < 2면 +1 하고 2단계로 돌아가 수정. 초과 시 실패 종료.
  - 단, 리뷰어가 "문서-코드 불일치 의심"으로 보고한 항목은 코드 수정 대상이 아니라 사용자 보고 대상이다.
- 둘 다 통과 → 4단계.

---

## 4단계: 실행 검증 (빌드 통과 ≠ 동작함)

### TARGET=FE

1. Playwright e2e가 있으므로 스모크를 돌린다: `npx playwright test --project=chromium` (전체가 오래 걸리면 변경 영역 관련 spec만).
2. e2e가 변경 영역을 커버하지 않으면 `.claude/skills/webapp-testing/` 스킬을 사용한다 — `scripts/with_server.py`로 dev 서버를 띄우고 변경된 화면에 실제 접근해 렌더링·콘솔 에러를 확인한다. 백엔드가 필요한 화면이면 BE 서버도 함께 띄운다 (`--server` 옵션 2개).
3. 실패 시 3단계의 빌드 실패와 동일하게 취급한다 (BUILD_RETRIES 공유).

### TARGET=BE

`./gradlew test`가 3단계 build에 포함되므로, 추가로 신규/변경 엔드포인트가 있으면 서버를 띄워 해당 엔드포인트를 1회 호출해 2xx/기대 응답을 확인한다.

---

## 5단계: 커밋 및 PR 생성

REPO_DIR에서 변경 파일만 명시적으로 `git add` (`git add .` / `-A` 금지) → 커밋 → 푸시 → `gh pr create --base develop`.

- 커밋 메시지: `{feat|fix|chore}: {이슈 제목 한 줄 요약} ({ISSUE_KEY})` — AI 관련 문구(Co-Authored-By 등) 금지
- PR 본문: 개요 / **구현 계획(1단계 PLAN 전문)** / 변경사항 / 검증 결과(빌드·테스트·실행 검증) / Jira 링크 `https://whatsuphouse.atlassian.net/browse/{ISSUE_KEY}`
- `gh` CLI가 없으면 커밋·푸시까지만 하고 PR 생성 URL(`https://github.com/{org}/{repo}/compare/develop...{브랜치}`)을 사용자에게 안내한다.

성공 → PR_URL 저장 → 6단계. 실패 → FAILURE_REASON 기록 → 6단계.

---

## 6단계: Mattermost 알림 + 스킬 누적

`notify.md`의 로직을 따른다.
- 성공: `/notify success {ISSUE_KEY} {PR_URL}`
- 실패: `/notify failure {ISSUE_KEY} {FAILURE_REASON}`

### 스킬 누적 (성공 시에만)

현재 세션의 memory 디렉토리의 `skills.md` 파일 끝에 항목을 추가한다.

```
### {ISSUE_KEY} | {이슈 제목 요약} | {오늘 날짜 YYYY-MM-DD}
- 타겟: {FE / BE} / 난이도: {NORMAL / HARD}
- 이슈 유형: {상태 분기 / API 연동 / UI 컴포넌트 / 관리자 기능 / 보안 / 마이그레이션 / ...}
- 수정 파일: {변경 파일 목록}
- 핵심 접근법: {PLAN의 구현 접근법 한 줄}
- 재사용 포인트: {다음 유사 작업에서 참고할 내용}
```
