# API Rules

이 문서는 프론트엔드 API 레이어 작성 규칙을 정의한다.

---

## 1. 레이어 구조

```
lib/api/client.ts     → Axios 인스턴스 (수정 금지)
lib/api/types.ts      → 모든 API 타입 정의
lib/api/{domain}.ts   → 도메인별 API 함수
lib/hooks/use*.ts     → React Query로 API 함수 래핑
```

---

## 2. API 함수 작성 규칙

- API 함수는 반드시 `lib/api/` 아래에 도메인별로 작성한다.
- 반환값에서 `response.data.data`를 꺼내서 반환한다. (ApiResponse<T> 구조)
- 함수명은 동사로 시작한다. (`fetch`, `submit`, `update`, `delete`)

```ts
// lib/api/gathering.ts

export const fetchGatheringDetail = async (id: string): Promise<GatheringDetail> => {
  const response = await apiClient.get<ApiResponse<GatheringDetail>>(`/api/gatherings/${id}`)
  return response.data.data
}
```

---

## 3. 타입 정의 규칙

- 모든 API 요청/응답 타입은 `lib/api/types.ts`에 정의한다.
- 컴포넌트나 훅 파일 안에 인라인으로 타입을 정의하지 않는다.
- 백엔드 응답 구조를 정확히 반영한다.

```ts
// lib/api/types.ts

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface GatheringDetail extends GatheringListItem {
  description: string
  howToRun: string[] | null
  locationAddress: string
  photoUrls: string[] | null
  mileageReward: number
  averageRating: number | null
  reviewCount: number
}
```

---

## 4. Axios 클라이언트 규칙

`lib/api/client.ts`는 수정하지 않는다. 이미 다음이 설정되어 있다.

- baseURL: `NEXT_PUBLIC_API_URL` 환경변수 or `http://localhost:8080`
- 요청 인터셉터: Zustand에서 accessToken 읽어서 Authorization 헤더 자동 첨부
- 응답 인터셉터: 401 응답 시 `/login`으로 자동 이동

---

## 5. 에러 처리 규칙

- 에러 처리는 훅(useMutation의 onError)에서 담당한다.
- API 함수 안에 try-catch를 작성하지 않는다.
- 에러 메시지는 `error.response?.data?.message`에서 읽는다.

```ts
// lib/hooks/useGatherings.ts
export function useSubmitApplication() {
  return useMutation({
    mutationFn: ({ id, data }) => submitUserApplication(id, data),
    onError: (error) => {
      // 에러 처리
    },
  })
}
```

---

## 6. 환경변수 규칙

- API 기본 URL은 `NEXT_PUBLIC_API_URL`로 관리한다.
- 클라이언트에서 접근하는 환경변수는 반드시 `NEXT_PUBLIC_` 접두사를 붙인다.
- 환경변수는 `.env.local`에 작성하고 git에 올리지 않는다.

---

## 7. 금지 사항

- 컴포넌트에서 `apiClient`를 직접 import
- 컴포넌트에서 `lib/api/*.ts` 함수를 직접 import
- `lib/api/types.ts` 외부에 API 타입 인라인 정의
- `lib/api/client.ts` 임의 수정
- API 함수 안에 try-catch 작성 (훅에서 처리)
- 하드코딩된 API URL 사용 (반드시 apiClient 사용)
