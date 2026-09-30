import apiClient from './client'
import type {
  ApiResponse,
  AdminApplicationDetail,
  AdminGatheringTypeRequest,
  AdminGatheringTypeRow,
  AdminSessionCreateRequest,
  AdminSessionRequest,
  GatheringDetail,
  GatheringSession,
  PaymentStatus,
} from './types'

// 화면 표시 모델. 백엔드 목록 응답을 getAll에서 이 형태로 매핑한다. (KAN-185)
// 항목 하나 = 회차 하나. id는 회차 ID, gatheringId는 종류 ID. (KAN-338)
export interface AdminGatheringListItem {
  id: string
  gatheringId: string
  title: string
  date: string                 // 백엔드 eventDate 매핑
  startTime: string
  endTime: string
  locationName: string | null
  price: number
  capacity: number             // 백엔드 maxAttendees 매핑
  currentApplicants: number    // 백엔드 applicantCount 매핑
  applicantCount?: number
  status: string
  thumbnailUrl?: string | null // 목록 응답엔 없음(폼 호환용, 항상 비어옴)
}

// 백엔드 관리자 게더링 목록 응답 원본 (AdminGatheringResponse)
interface RawAdminGathering {
  id: string
  gatheringId: string
  title: string
  eventDate: string
  startTime: string | null
  endTime: string | null
  locationName: string | null
  price: number | null
  maxAttendees: number
  status: string
  applicantCount: number
}

export type GatheringType = 'REGULAR' | 'RANDOM_TABLE'

// 회차 단위 관리자 목록을 종류 단위로 묶는다. 목록 순서(BE 반환 순)대로 종류가 처음 나온 순서를 유지한다.
// ponytail: 회차가 하나도 없는 종류는 BE 목록에 없어 빠진다. 종류 목록 API가 생기면 교체.
export function groupAdminGatheringTypes(items: AdminGatheringListItem[], today: string): AdminGatheringTypeRow[] {
  const rows = new Map<string, AdminGatheringTypeRow>()
  for (const item of items) {
    const row = rows.get(item.gatheringId) ?? {
      id: item.gatheringId,
      title: item.title,
      sessionIds: [],
      sessionCount: 0,
      upcomingCount: 0,
      nextEventDate: null,
    }
    row.sessionIds.push(item.id)
    row.sessionCount += 1
    if (item.date >= today && item.status !== 'CANCELLED') {
      row.upcomingCount += 1
      if (!row.nextEventDate || item.date < row.nextEventDate) row.nextEventDate = item.date
    }
    rows.set(item.gatheringId, row)
  }
  return [...rows.values()]
}

export interface LocationItem {
  id: string
  name: string
  address: string
  maxCapacity: number
  features: string[] | null
  contractStatus: string
  naverMapUrl?: string | null
  kakaoMapUrl?: string | null
}

// 백엔드 관리자 장소 목록 응답 원본 (AdminLocationResponse, KAN-208)
interface RawAdminLocation {
  id: string
  name: string
  address: string
  naverMapUrl: string | null
  kakaoMapUrl: string | null
  maxCapacity: number | null
  status: string | null
  memo: string | null
}

// 프론트 장소 모델을 백엔드 계약으로 변환한다. (KAN-194)
// contractStatus → status(enum ACTIVE/EXPIRED), features → memo. 빈 URL은 생략.
function toLocationBody(data: Partial<LocationItem>) {
  return {
    name: data.name,
    address: data.address,
    naverMapUrl: data.naverMapUrl || undefined,
    kakaoMapUrl: data.kakaoMapUrl || undefined,
    maxCapacity: data.maxCapacity,
    status: data.contractStatus || 'ACTIVE',
    memo: data.features && data.features.length > 0 ? data.features.join(', ') : undefined,
  }
}

export type ApplicationStatus = 'PENDING' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'ATTENDED' | 'REJECTED' | 'CANCELLED'

export interface AdminApplicationItem {
  id: string
  bookingNumber?: string
  name: string
  phone: string | null
  gender: string | null
  age: number | null
  job: string | null
  mbti: string | null
  intro: string | null
  referralSource: string | null
  status: ApplicationStatus
  paid: boolean              // 유료 게더링 여부 (입금 체크 노출 대상). (KAN-243)
  free: boolean              // 참가비 0원 여부
  paymentStatus?: PaymentStatus | null
  paymentConfirmed: boolean  // 입금 확인 여부
  gatheringType?: GatheringType
  createdAt: string
  isGuest: boolean
}

export const adminGatheringApi = {
  getAll: async (status?: string, date?: string): Promise<AdminGatheringListItem[]> => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (date) params.append('eventDate', date)
    const query = params.toString()
    const res = await apiClient.get<ApiResponse<RawAdminGathering[]>>(
      `/api/admin/gatherings${query ? `?${query}` : ''}`
    )
    // 백엔드 eventDate/maxAttendees/applicantCount를 화면 모델(date/capacity/currentApplicants)로 매핑. (KAN-185)
    return (res.data.data ?? []).map((g) => ({
      id: g.id,
      gatheringId: g.gatheringId,
      title: g.title,
      date: g.eventDate,
      startTime: g.startTime ?? '',
      endTime: g.endTime ?? '',
      locationName: g.locationName,
      price: g.price ?? 0,
      capacity: g.maxAttendees,
      currentApplicants: g.applicantCount ?? 0,
      applicantCount: g.applicantCount,
      status: g.status,
    }))
  },

  // 모임 종류 생성. 회차는 createSessions로 따로 추가한다. (KAN-338)
  create: async (data: AdminGatheringTypeRequest): Promise<GatheringDetail> => {
    const res = await apiClient.post<ApiResponse<GatheringDetail>>('/api/admin/gatherings', data)
    return res.data.data
  },

  // 모임 종류 상세 + 전체 회차. 회차 ID로 요청해도 그 회차의 종류로 응답한다. (KAN-338)
  getById: async (id: string): Promise<GatheringDetail> => {
    const res = await apiClient.get<ApiResponse<GatheringDetail>>(`/api/admin/gatherings/${id}`)
    return res.data.data
  },

  // 종류 ID만 받는다. 타입은 바꿀 수 없다.
  update: async (id: string, data: AdminGatheringTypeRequest): Promise<GatheringDetail> => {
    const res = await apiClient.put<ApiResponse<GatheringDetail>>(`/api/admin/gatherings/${id}`, data)
    return res.data.data
  },

  // 회차 추가 — 단건 또는 주간 반복. 만들어진 회차 목록을 돌려준다.
  createSessions: async (gatheringId: string, data: AdminSessionCreateRequest): Promise<GatheringSession[]> => {
    const res = await apiClient.post<ApiResponse<GatheringSession[]>>(`/api/admin/gatherings/${gatheringId}/sessions`, data)
    return res.data.data
  },

  updateSession: async (sessionId: string, data: AdminSessionRequest): Promise<GatheringSession> => {
    const res = await apiClient.put<ApiResponse<GatheringSession>>(`/api/admin/gatherings/sessions/${sessionId}`, data)
    return res.data.data
  },

  // 신청이 있는 회차면 409
  deleteSession: async (sessionId: string) => {
    await apiClient.delete(`/api/admin/gatherings/sessions/${sessionId}`)
  },

  // 경로 id는 회차 ID (KAN-338)
  updateStatus: async (id: string, status: string) => {
    await apiClient.patch(`/api/admin/gatherings/${id}/status`, { status })
  },

  // 홈 큐레이션 노출 토글 (KAN-190)
  setCuration: async (id: string, isCurated: boolean) => {
    await apiClient.patch(`/api/admin/gatherings/${id}/curation`, { isCurated })
  },

  // 큐레이션 노출 순서 변경 (앞에서부터 1위)
  reorderCurated: async (gatheringIds: string[]) => {
    await apiClient.put('/api/admin/gatherings/curated/order', { gatheringIds })
  },

  // 종류 삭제(회차 포함). 신청이 있는 회차가 있으면 409
  delete: async (id: string) => {
    await apiClient.delete(`/api/admin/gatherings/${id}`)
  },

  getLocations: async (): Promise<LocationItem[]> => {
    // 관리자 목록 API 사용 — 공개 응답에 없는 운영 필드(수용/계약상태/메모)를 포함한다. (KAN-208)
    const res = await apiClient.get<ApiResponse<RawAdminLocation[]>>('/api/admin/locations')
    return (res.data.data ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      address: l.address,
      maxCapacity: l.maxCapacity ?? 0,
      // 백엔드 memo(쉼표 구분 문자열)를 화면 모델 features 배열로 변환
      features: l.memo ? l.memo.split(',').map((f) => f.trim()).filter(Boolean) : [],
      contractStatus: l.status ?? 'ACTIVE',
      naverMapUrl: l.naverMapUrl ?? null,
      kakaoMapUrl: l.kakaoMapUrl ?? null,
    }))
  },

  createLocation: async (data: Partial<LocationItem>) => {
    const res = await apiClient.post<ApiResponse<unknown>>('/api/admin/locations', toLocationBody(data))
    return res.data.data
  },

  updateLocation: async (id: string, data: Partial<LocationItem>) => {
    const res = await apiClient.put<ApiResponse<unknown>>(`/api/admin/locations/${id}`, toLocationBody(data))
    return res.data.data
  },

  deleteLocation: async (id: string) => {
    await apiClient.delete(`/api/admin/locations/${id}`)
  },

  getApplications: async (gatheringId: string): Promise<AdminApplicationItem[]> => {
    const res = await apiClient.get<ApiResponse<AdminApplicationItem[]>>(
      `/api/admin/gatherings/${gatheringId}/applications`
    )
    return res.data.data ?? []
  },

  getApplicationsByGathering: async (gatheringId: string): Promise<AdminApplicationItem[]> => {
    const res = await apiClient.get<ApiResponse<AdminApplicationItem[]>>(
      `/api/admin/applications?gatheringId=${gatheringId}`
    )
    return res.data.data ?? []
  },

  // 신청 상세 (EAV 답변 포함)
  getApplicationDetail: async (applicationId: string): Promise<AdminApplicationDetail> => {
    const res = await apiClient.get<ApiResponse<AdminApplicationDetail>>(
      `/api/admin/applications/${applicationId}`
    )
    return res.data.data
  },

  updateAttendance: async (applicationId: string, attended: boolean) => {
    const res = await apiClient.patch<ApiResponse<unknown>>(
      `/api/admin/applications/${applicationId}/attend`,
      { attended }
    )
    return res.data.data
  },

  deleteApplication: async (applicationId: string) => {
    await apiClient.delete(`/api/admin/applications/${applicationId}`)
  },

  updateApplicationStatus: async (applicationId: string, status: ApplicationStatus) => {
    const res = await apiClient.patch<ApiResponse<unknown>>(
      `/api/admin/applications/${applicationId}/status`,
      { status }
    )
    return res.data.data
  },

  // 입금 확인 토글 (신청 상태와 독립). (KAN-243)
  updatePaymentStatus: async (applicationId: string, confirmed: boolean) => {
    const res = await apiClient.patch<ApiResponse<unknown>>(
      `/api/admin/applications/${applicationId}/payment`,
      { confirmed }
    )
    return res.data.data
  },
}
