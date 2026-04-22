# CLAUDE.md

이 문서는 Claude Code가 이 프론트엔드 프로젝트에서 작업할 때 따라야 할 규칙을 정의한다.

---

## 0. 서비스 소개

와썹하우스(Whats Up House)는 1인 가구 2030 청년을 위한 오프라인 소셜 게더링 플랫폼.
- 대표(관리자)가 게더링을 직접 주최하고 운영
- 유저는 게더링을 탐색하고 신청만 함 (유저 간 개인 매칭 없음)
- 게더링은 항상 소규모 (최대 20명)

---

## 1. 기술 스택

- **프레임워크**: Next.js 16.2.2 (App Router) + React 19
- **언어**: TypeScript
- **스타일링**: Tailwind CSS v4
- **서버 상태**: TanStack React Query v5
- **클라이언트 상태**: Zustand v5 (persist)
- **HTTP 클라이언트**: Axios (interceptor로 JWT 자동 첨부)
- **폼**: React Hook Form + Zod
- **아이콘**: Lucide React
- **날짜**: dayjs

---

## 2. 실행 명령어

```bash
npm run dev       # 개발 서버
npm run build     # 빌드
npm run lint      # 린트 검사
```

---

## 3. 프로젝트 구조

```
src/
├── app/                      # Next.js App Router 페이지
│   ├── (auth)/               # 로그인, 회원가입, 온보딩 (인증 불필요)
│   ├── (main)/               # 홈, 게더링, 소셜, 마이페이지
│   ├── admin/                # 관리자 페이지 (isAdmin 체크)
│   ├── layout.tsx            # 루트 레이아웃 (Providers 포함)
│   └── providers.tsx         # React Query Provider
├── components/
│   ├── ui/                   # 순수 UI 컴포넌트 (Button, Card, Badge 등)
│   ├── layout/               # 레이아웃 컴포넌트 (BottomNav 등)
│   ├── gathering/            # 게더링 도메인 컴포넌트
│   └── admin/                # 관리자 전용 컴포넌트
├── lib/
│   ├── api/                  # API 레이어
│   │   ├── client.ts         # Axios 인스턴스 + 인터셉터
│   │   ├── types.ts          # 모든 API 타입 정의
│   │   ├── auth.ts           # 인증 API 함수
│   │   ├── gathering.ts      # 게더링 API 함수
│   │   ├── admin.ts          # 관리자 API 함수
│   │   └── adminGathering.ts # 관리자 게더링 API 함수
│   ├── hooks/                # React Query 훅 (API 함수 래핑)
│   ├── store/                # Zustand 스토어
│   └── utils/                # 유틸 함수
└── styles/
    └── globals.css           # Tailwind 전역 스타일 + 커스텀 토큰
```

---

## 4. 아키텍처 핵심 규칙

### 데이터 흐름 — 반드시 이 순서를 따른다

```
lib/api/*.ts        → axios로 백엔드 API 직접 호출하는 함수
lib/hooks/use*.ts   → React Query로 API 함수를 감싸는 훅
components/         → 훅만 호출, API 함수 직접 import 금지
```

컴포넌트가 `apiClient`나 `lib/api/*.ts`를 직접 import하면 구조 위반이다.

### 상태 관리 구분

- **React Query**: 서버에서 오는 데이터 (게더링 목록, 유저 프로필 등)
- **Zustand**: 클라이언트 전용 상태 (로그인 여부, accessToken 등)
- 서버 데이터를 Zustand에 넣거나, 클라이언트 상태를 React Query로 관리하지 않는다.

### 'use client' 사용 기준

서버 컴포넌트를 기본으로 한다. 아래 경우에만 추가한다.

허용:
- useState, useEffect 등 React 훅 사용 시
- onClick 등 이벤트 핸들러 사용 시
- localStorage, window 등 브라우저 API 사용 시
- React Query / Zustand 훅 사용 시

금지:
- 습관적으로 모든 파일에 추가

---

## 5. 타입 규칙

- 모든 API 요청/응답 타입은 `lib/api/types.ts`에 정의한다.
- 컴포넌트 props는 해당 파일 상단에 interface로 정의한다.
- `any` 사용을 금지한다. 불확실하면 `unknown`을 쓰고 타입을 좁혀간다.
- 백엔드 응답은 항상 `ApiResponse<T>` 구조이며, 훅에서 `.data.data`를 꺼내 반환한다.

---

## 6. 스타일링 규칙

이 프로젝트의 커스텀 Tailwind 디자인 토큰:

- `bg-card` — 카드 배경색
- `bg-tag-bg` — 태그/칩 배경색
- `text-tag-text` — 태그 텍스트 색상
- `text-foreground` — 기본 텍스트 색상
- `rounded-card` — 카드 border-radius

임의의 hex 색상(`#ffffff` 등)을 직접 쓰지 않는다. 반드시 위 토큰을 사용한다.
모바일 우선(mobile-first) 레이아웃을 기본으로 한다.

---

## 7. 라우팅 규칙

- `(auth)/` — 로그인/회원가입/온보딩, 인증 없이 접근 가능
- `(main)/` — 일반 유저 페이지, 인증 필요 시 `useRequireAuth` 사용
- `admin/` — 관리자 전용, `isAdmin` 여부 반드시 확인
- page.tsx는 최대한 얇게 유지하고 실제 UI는 components/로 분리한다.

---

## 8. 테스트 정책

- 테스트는 무조건 작성하지 않는다.
- 핵심 비즈니스 로직, 변경 위험이 높은 유틸 함수 위주로만 작성한다.

---

## 9. 작업 시 주의사항

- 기존 패키지 구조를 임의로 변경하지 않는다.
- 변경은 최소 단위로 수행한다.
- 기존 코드 스타일을 우선적으로 따른다.
- `components/ui/`에 도메인 로직을 넣지 않는다.
- 새 API 타입은 반드시 `lib/api/types.ts`에 추가한다.

---

## 10. 도메인 정보

- **Gathering**: 게더링 목록/상세 조회, 신청
- **Application**: 회원 신청, 비회원 신청
- **Auth**: 로그인, 회원가입, 온보딩, 프로필
- **Admin**: 게더링 관리, 유저 관리, 신청 관리, 장소 관리

---

## 11. Git 브랜치 전략

- `main` — 운영 브랜치. develop에서만 머지.
- `develop` — 개발 브랜치. 기능 브랜치의 머지 대상.
- `feat/{domain}` — 기능 브랜치. develop에서 분기하고 develop으로 머지.

흐름: `feat/*` → `develop` → `main`

## 12. Git 커밋 규칙

- 커밋 메시지에 AI 활용 관련 내용을 포함하지 않는다. (Co-Authored-By 등 금지)
