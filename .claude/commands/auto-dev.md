인자로 받은 Jira 이슈 키($ARGUMENTS)에 대해 자동 개발 파이프라인을 실행한다.

인자가 없으면 "이슈 키를 인자로 전달하세요. 예: /auto-dev KAN-9"라고 출력하고 종료한다.
인자가 여러 개면(쉼표/공백 구분) 각 이슈에 대해 **한 번에 하나씩** 0~6단계 전체를 순차 실행한다.

---

## 파이프라인 상태

대화 내에서 아래 상태를 추적한다. 각 단계 시작 시 현재 값을 출력한다.

```
ISSUE_KEY     = $ARGUMENTS
TARGET        = ""  (0단계에서 FE 또는 BE로 결정)
REPO_DIR      = ""  (0단계에서 결정)
BRANCH_NAME   = {feat|fix|chore}/{이슈키 소문자}-{간단한-영문-슬러그} (예: feat/kan-9-rate-limit)
PLAN          = ""  (1단계에서 채워짐)
BUILD_RETRIES = 0   (최대 2)
REVIEW_RETRIES = 0  (최대 2)
FAILURE_REASON = ""
```

각 단계 진입 시 `▶ N단계 시작` 을 출력한다.
실패로 루프백할 때는 `↩ 2단계로 재시도 (BUILD M/2회, REVIEW M/2회)` 를 출력한다.

파이프라인 단계 요약:
0단계(타겟 판별) → 1단계 → 2단계 → 3·4단계(병렬) → 5단계 → 6단계(알림 + 스킬 누적)

---

## 0단계: 타겟 레포 판별 (FE / BE)

`▶ 0단계: 타겟 판별`

Jira 이슈 제목의 접두사로 작업 대상 레포를 결정한다.

| 제목 접두사 | TARGET | REPO_DIR |
|---|---|---|
| `[FE]` | FE | `/Users/tjmedia/Downloads/와썹하우스/whatsup-house-frontend` |
| `[BE]` | BE | `/Users/tjmedia/Downloads/와썹하우스/whatsup-house-backend` |
| `[FE/BE]` | 사용자에게 어느 쪽 먼저 할지 질문 | - |
| 접두사 없음 | 이슈 본문으로 추정하되, 불확실하면 사용자에게 질문 | - |

이후 모든 git/빌드/테스트 명령은 반드시 `REPO_DIR`에서 실행한다.

---

## 1단계: 이슈 파악 및 상태 전환

`▶ 1단계: Jira 이슈 파악`

Atlassian Rovo MCP로 이슈를 조회한다.
- cloudId: `d4081ac1-010a-45f5-8241-d9d67209e21b`
- issueIdOrKey: `$ARGUMENTS`

조회 후:
- 이슈 상태를 "진행 중"으로 전환한다 (transition ID: `31`)
- 이슈 제목, 구현 사항, 필요 API 엔드포인트를 파악한다.
- 이슈가 "결정 필요" 상태(선택지가 남아 있는 검토 일감)라면 구현하지 말고 사용자에게 결정을 요청한다.

이어서 구현 계획을 수립하고 PLAN 변수에 저장한다.

```
PLAN:
- 수정할 파일: (기존 파일 중 변경 필요한 것)
- 생성할 파일: (없으면 "없음")
- 구현 접근법: (핵심 로직 한 줄)
- 재사용 가능한 기존 코드: (FE: lib/hooks, lib/api / BE: global 공통 모듈, 기존 도메인 서비스)
- 주의사항: (엣지 케이스, 타입 이슈, FE: SSR / BE: 트랜잭션·Flyway 주의점 등)
```

현재 세션의 memory 디렉토리에 `skills.md`가 있으면 유사한 이슈 패턴을 참고한다.

---

## 2단계: 코드 구현

`▶ 2단계: 개발`

PLAN을 참고해 구현한다.
루프백으로 재진입 시 실패한 이유(빌드 오류 또는 리뷰 지적 사항)를 반드시 함께 수정한다.

### 브랜치 준비 (REPO_DIR에서)

```bash
git fetch origin
git checkout -b BRANCH_NAME origin/develop   # 로컬 develop이 아닌 origin/develop 기준
```

브랜치가 이미 존재하면 `git checkout BRANCH_NAME` 으로 전환한다.

### 구현 규칙 — TARGET=FE (frontend CLAUDE.md 준수)

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

### 구현 규칙 — TARGET=BE (backend .claude/skills/backend/SKILL.md 준수)

아래 순서로 구현한다.

1. `global/exception/ErrorCode.java` — 필요한 에러 코드 추가
2. `domain/{도메인}/entity`, `repository` — 엔티티/쿼리 메서드 (스키마 변경 시 Flyway 신규 V{N}__*.sql 추가, 기존 V 파일 수정 금지 — 체크섬 오류 발생)
3. `domain/{도메인}/service` — 비즈니스 로직 (@Transactional, CustomException(ErrorCode))
4. `domain/{도메인}/controller` — ApiResult<T> 응답, 관리자는 /api/admin/**
5. 시큐리티 규칙 변경 시 `global/config/SecurityConfig.java`

**반드시 지켜야 할 규칙:**
- 응답은 ApiResult/ApiResponse 래퍼, 예외는 CustomException(ErrorCode)
- DTO와 Entity 분리, Lombok 활용
- 운영 DB는 Flyway + ddl-auto:validate — 엔티티 변경과 마이그레이션이 반드시 일치해야 함
- 서버는 Caddy 리버스 프록시 뒤에 있음 — 클라이언트 IP는 X-Forwarded-For에서 읽는다

---

## 3·4단계: 빌드/린트 검증 + 코드 리뷰 (병렬)

`▶ 3·4단계: 빌드 검증 + 코드 리뷰 병렬 실행 (BUILD_RETRIES: {현재값}/2, REVIEW_RETRIES: {현재값}/2)`

### TARGET=FE

`Agent` 도구로 아래 두 에이전트를 **동시에** 호출한다.

- `build-validator` 에이전트 (`.claude/agent/build-validator.md`)
- `frontend-reviewer` 에이전트 (`.claude/agent/frontend-reviewer.md`)
  - 프롬프트에 변경 파일 목록과 각 파일의 전체 내용 포함
  - "위 파일들이 프로젝트 규칙(`.claude/rules/frontend/`)을 위반하는지 검토해줘."

### TARGET=BE

- 빌드 검증: `REPO_DIR`에서 `./gradlew build` 직접 실행 (테스트 포함). 실패 시 `BUILD_FAILURE`로 간주.
- 코드 리뷰: `Agent` 도구로 백엔드 레포의 `backend-reviewer` 에이전트(`{REPO_DIR}/.claude/agents/backend-reviewer.md`의 역할·기준을 프롬프트에 포함해 general-purpose로 호출)에 변경 파일 전체 내용을 전달한다.
  - "위 파일들이 백엔드 규칙(`.claude/skills/backend/SKILL.md`)을 위반하는지 검토해줘."

두 결과를 모두 받은 후 아래 순서로 평가한다.

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

`REPO_DIR`에서 변경 파일만 명시적으로 `git add` (git add . / -A 금지) → 커밋 → 푸시 → `gh pr create --base develop`.

- 커밋 메시지: `{feat|fix|chore}: {이슈 제목 한 줄 요약} ({ISSUE_KEY})` — AI 관련 문구(Co-Authored-By 등) 금지
- PR 본문: 개요 / 변경사항 / 검증 결과(빌드·테스트) / Jira 링크 `https://whatsuphouse.atlassian.net/browse/{ISSUE_KEY}`

PR 생성 성공 → PR_URL 저장 → 6단계(성공 알림)
PR 생성 실패 → `FAILURE_REASON = "PR 생성 실패: {오류}"` → 6단계(실패 알림)

---

## 6단계: Mattermost 알림 + 스킬 누적

`▶ 6단계: Mattermost 알림`

`notify.md` 의 로직을 따른다.

- 성공 시: `/notify success {ISSUE_KEY} {PR_URL}`
- 실패 시: `/notify failure {ISSUE_KEY} {FAILURE_REASON}`

### 스킬 누적 (성공 시에만)

성공 알림 후, 아래 형식으로 **현재 세션의 memory 디렉토리**의 `skills.md` 파일 끝에 항목을 추가한다.
(memory 디렉토리는 사용자마다 다르다. 예: `~/.claude/projects/{프로젝트-슬러그}/memory/skills.md`)

```
### {ISSUE_KEY} | {이슈 제목 요약} | {오늘 날짜 YYYY-MM-DD}
- 타겟: {FE / BE}
- 이슈 유형: {상태 분기 / API 연동 / UI 컴포넌트 / 관리자 기능 / 보안 / 마이그레이션 / ...}
- 수정 파일: {2단계에서 변경한 파일 목록}
- 핵심 접근법: {PLAN의 구현 접근법 한 줄}
- 재사용 포인트: {다음 유사 작업에서 참고할 내용}
```
