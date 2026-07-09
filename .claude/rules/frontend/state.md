# State Management Rules

이 문서는 프론트엔드 상태 관리 규칙을 정의한다.
우선순위: **[CRITICAL]** 위반 시 머지 불가 / **[HIGH]** 리뷰에서 반드시 지적 / **[MEDIUM]** 가능하면 수정

---

## 1. 상태 분류 원칙 [CRITICAL]

| 상태 종류 | 도구 | 예시 |
|-----------|------|------|
| 서버 데이터 | React Query | 게더링 목록, 유저 프로필, 신청 목록 |
| 클라이언트 상태 | Zustand | 로그인 여부(isLoggedIn), userId, nickname, isAdmin |
| 로컬 UI 상태 | useState | 모달 열림/닫힘, 탭 선택, 입력값 |
| 폼 상태 | React Hook Form | 폼 필드값, 유효성, 제출 상태 |

- 서버 데이터를 Zustand에 넣거나, 클라이언트 상태를 React Query로 관리하지 않는다.
- **토큰은 클라이언트에 저장하지 않는다.** 인증은 HttpOnly 쿠키(accessToken/refreshToken) 기반이며 `withCredentials`로 자동 전송된다. accessToken을 Zustand·localStorage·sessionStorage 어디에도 넣지 않는다. (KAN-189)

---

## 2. React Query 규칙

### queryKey 규칙 [HIGH]

queryKey는 배열로 작성하고 계층적으로 구성한다.

```ts
// 목록
queryKey: ['gatherings', date]

// 상세
queryKey: ['gathering', id]

// 중첩 리소스
queryKey: ['gathering', id, 'applications']

// 사용자 관련
queryKey: ['my-profile']
queryKey: ['nickname-check', nickname]
```

### staleTime 정책 [MEDIUM]

자주 바뀌지 않는 데이터는 staleTime을 설정해 불필요한 재요청을 방지한다.

```ts
// 5분: 프로필, 게더링 상세
staleTime: 1000 * 60 * 5

// 10초: 닉네임 중복 확인처럼 짧게 캐시해야 하는 경우
staleTime: 1000 * 10
```

실시간성이 중요한 데이터(예: 신청자 수)는 staleTime을 설정하지 않는다.

### enabled 조건 [MEDIUM]

조건부 실행이 필요할 때는 enabled를 사용한다.

```ts
enabled: !!id              // id가 있을 때만
enabled: isLoggedIn        // 로그인 상태일 때만
enabled: nickname.length >= 2
```

### 훅 위치 [CRITICAL]

React Query 훅은 반드시 `lib/hooks/` 안에 작성한다.
컴포넌트 파일 안에서 useQuery, useMutation을 직접 쓰지 않는다.

```ts
// 금지 — 컴포넌트에서 직접
const { data } = useQuery({ queryKey: ['gatherings'], queryFn: fetchGatherings })

// 허용 — 훅으로 분리 후 사용
const { data } = useGatherings(date)
```

---

## 3. Zustand 규칙

### 현재 스토어

- `lib/store/authStore.ts` — 인증 상태 (userId, nickname, isAdmin, isLoggedIn, isInitialized)
  - **메모리 전용이다. persist를 쓰지 않는다.** 새로고침 시 상태는 `/api/users/me` 호출로 복원한다 (쿠키가 진실의 원천).
- `lib/store/navigationStore.ts`, `lib/store/toastStore.ts` — UI 상태

### 스토어 사용 규칙

- [HIGH] 서버 데이터를 Zustand에 저장하지 않는다.
- [HIGH] 새 전역 상태가 필요하면 `lib/store/`에 별도 파일로 추가한다.
- [MEDIUM] persist가 정말 필요한 스토어를 새로 만들 경우에만 SSR hydration을 주의한다 — 마운트 후 읽기(`useHydration` 패턴). 현재 persist를 쓰는 스토어는 없다.

---

## 4. 폼 상태 규칙 [HIGH]

- 폼은 React Hook Form + Zod로 처리한다.
- Zod 스키마는 폼 파일 상단 또는 별도 파일에 정의한다.
- 폼 제출은 `useMutation`과 연결해 서버에 전송한다.
- 유효성 검사 메시지는 한국어로 작성한다.

```ts
const schema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
})
```

---

## 5. 금지 사항

- [CRITICAL] 토큰(accessToken/refreshToken)을 클라이언트 저장소(Zustand/localStorage/sessionStorage)에 저장
- [CRITICAL] 컴포넌트 파일 안에서 useQuery / useMutation 직접 작성
- [HIGH] 서버 데이터를 Zustand에 저장
- [HIGH] 클라이언트 전용 상태를 React Query로 관리
- [MEDIUM] 전역 상태 남용 (지역 상태로 처리 가능하면 useState 사용)
