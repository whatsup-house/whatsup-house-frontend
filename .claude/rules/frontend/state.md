# State Management Rules

이 문서는 프론트엔드 상태 관리 규칙을 정의한다.

---

## 1. 상태 분류 원칙

| 상태 종류 | 도구 | 예시 |
|-----------|------|------|
| 서버 데이터 | React Query | 게더링 목록, 유저 프로필, 신청 목록 |
| 클라이언트 상태 | Zustand | 로그인 여부, accessToken, isAdmin |
| 로컬 UI 상태 | useState | 모달 열림/닫힘, 탭 선택, 입력값 |
| 폼 상태 | React Hook Form | 폼 필드값, 유효성, 제출 상태 |

서버 데이터를 Zustand에 넣거나, 클라이언트 상태를 React Query로 관리하지 않는다.

---

## 2. React Query 규칙

### queryKey 규칙

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

### staleTime 정책

자주 바뀌지 않는 데이터는 staleTime을 설정해 불필요한 재요청을 방지한다.

```ts
// 5분: 프로필, 게더링 상세
staleTime: 1000 * 60 * 5

// 10초: 닉네임 중복 확인처럼 짧게 캐시해야 하는 경우
staleTime: 1000 * 10
```

실시간성이 중요한 데이터(예: 신청자 수)는 staleTime을 설정하지 않는다.

### enabled 조건

조건부 실행이 필요할 때는 enabled를 사용한다.

```ts
// id가 있을 때만 실행
enabled: !!id

// 로그인 상태일 때만 실행
enabled: isLoggedIn

// 입력값이 충분할 때만 실행
enabled: nickname.length >= 2
```

### 훅 위치

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

- `lib/store/authStore.ts` — 인증 상태 (accessToken, userId, nickname, isAdmin, isLoggedIn)

### 스토어 사용 규칙

- persist를 사용하는 스토어는 SSR hydration 문제를 주의한다.
- 클라이언트에서만 접근해야 하는 경우 `useHydration` 훅으로 마운트 후 읽는다.

```ts
// SSR 환경에서 persist 스토어 안전하게 읽기
const isHydrated = useHydration()
const { isLoggedIn } = useAuthStore()

if (!isHydrated) return null  // hydration 전 렌더링 방지
```

- 새 전역 상태가 필요하다면 `lib/store/`에 별도 파일로 추가한다.
- 서버 데이터를 Zustand에 저장하지 않는다.

---

## 4. 폼 상태 규칙

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

- 서버 데이터를 Zustand에 저장
- 클라이언트 전용 상태를 React Query로 관리
- 컴포넌트 파일 안에서 useQuery / useMutation 직접 작성
- persist 스토어를 SSR 환경에서 hydration 없이 바로 읽기
- 전역 상태 남용 (지역 상태로 처리 가능하면 useState 사용)
