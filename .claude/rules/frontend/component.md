# Component Rules

이 문서는 프론트엔드 컴포넌트 작성 시 따라야 할 규칙을 정의한다.

---

## 1. 컴포넌트 역할 분리

### Page (`app/**/page.tsx`)
- 라우팅 진입점. 최대한 얇게 유지한다.
- 데이터 패칭 트리거 역할.
- 실제 UI 렌더링은 components/로 위임한다.

### Feature Component (`components/{domain}/`)
- 도메인 로직과 UI를 함께 가진다.
- 훅을 직접 호출해도 된다.
- 예: `GatheringDetail.tsx`, `UserApplicationForm.tsx`

### UI Component (`components/ui/`)
- 순수 표현 컴포넌트. 도메인 로직을 갖지 않는다.
- props로 받은 데이터만 렌더링한다.
- API 호출, 훅 호출 금지.
- 예: `Button.tsx`, `Card.tsx`, `Badge.tsx`

---

## 2. 'use client' 규칙

서버 컴포넌트를 기본으로 한다.

추가해야 하는 경우:
- React 훅(useState, useEffect 등) 사용
- 이벤트 핸들러(onClick, onChange 등) 사용
- 브라우저 API(localStorage, window 등) 사용
- React Query / Zustand 훅 사용

추가하면 안 되는 경우:
- 단순 정적 렌더링 컴포넌트
- 습관적으로 붙이는 경우

---

## 3. Props 규칙

- props는 반드시 interface로 타입을 정의한다.
- props 이름은 명확하게 짓는다. (data, item 같은 모호한 이름 지양)
- 서버 응답 객체 전체를 props로 내리지 않는다. 필요한 필드만 내려준다.
- 콜백 함수 props는 `on` 접두사를 사용한다. (onSubmit, onClose 등)

```tsx
// 좋음
interface GatheringCardProps {
  id: string
  title: string
  status: 'RECRUITING' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'
  onApply: (id: string) => void
}

// 나쁨
interface GatheringCardProps {
  data: GatheringListItem  // 전체 객체 통째로 내리지 않는다
}
```

---

## 4. API 호출 규칙

컴포넌트에서 API를 직접 호출하지 않는다.

```tsx
// 금지
import apiClient from '@/lib/api/client'
import { fetchGatherings } from '@/lib/api/gathering'

// 허용
import { useGatherings } from '@/lib/hooks/useGatherings'
```

---

## 5. 스타일링 규칙

- Tailwind 커스텀 토큰을 우선 사용한다. (`bg-card`, `bg-tag-bg`, `text-tag-text` 등)
- 임의 hex 색상(`#fff`, `text-[#333]` 등)을 직접 쓰지 않는다.
- 모바일 우선으로 작성한다. (sm: md: 등 breakpoint는 mobile-first 기준)
- 인라인 style 속성 사용을 지양한다.

---

## 6. 파일 네이밍

- 컴포넌트 파일은 PascalCase.tsx 사용
- 훅 파일은 camelCase.ts (use 접두사)
- 유틸 파일은 camelCase.ts

---

## 7. 금지 사항

- UI 컴포넌트(`components/ui/`)에 도메인 로직 작성
- 컴포넌트 내에서 `apiClient` 직접 import
- props에 서버 응답 객체 전체를 그대로 전달
- `any` 타입 사용
- 불필요한 `use client` 추가
- 임의 hex 색상 직접 사용
