import apiClient from './client'
import type { ApiResponse, AdminApplicationDetail } from './types'

// 화면 표시 모델. 백엔드 목록 응답을 getAll에서 이 형태로 매핑한다. (KAN-185)
export interface AdminGatheringListItem {
  id: string
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

// 관리자 게더링 상세 응답 (GET /api/admin/gatherings/{id}). 수정 패널 prefill용. (KAN-220)
export interface AdminGatheringDetail {
  id: string
  title: string
  description: string | null
  howToRun?: string[] | null
  eventDate: string
  startTime: string | null
  endTime: string | null
  price: number | null
  maxAttendees: number
  status: string
  thumbnailUrl: string | null
  location: { id: string; name: string; address: string } | null
}

export type GatheringType = 'REGULAR' | 'RANDOM_TABLE'

export interface GatheringCreateRequest {
  title: string
  description: string
  howToRun?: string[]
  locationId: string
  date: string
  startTime: string
  endTime: string
  price: number
  capacity: number
  thumbnailUrl?: string
  moodTags?: string[]
  activityTags?: string[]
  mileageReward?: number
  gatheringType?: GatheringType   // 생성 시에만 반영됨 (수정은 백엔드에서 무시)
}

// 화면 모델(date/capacity)을 백엔드 계약(eventDate/maxAttendees)으로 변환한다. (KAN-185)
function toGatheringRequestBody(data: GatheringCreateRequest) {
  return {
    title: data.title,
    description: data.description,
    howToRun: data.howToRun,
    locationId: data.locationId,
    eventDate: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    price: data.price,
    maxAttendees: data.capacity,
    thumbnailUrl: data.thumbnailUrl,
    gatheringType: data.gatheringType,
  }
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

export type ApplicationStatus = 'PENDING' | 'CONFIRMED' | 'ATTENDED'

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
  paymentConfirmed: boolean  // 입금 확인 여부
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

  create: async (data: GatheringCreateRequest) => {
    const res = await apiClient.post<ApiResponse<unknown>>('/api/admin/gatherings', toGatheringRequestBody(data))
    return res.data.data
  },

  // 수정 패널 prefill용 상세 조회 (소개/장소 등 목록 응답에 없는 필드 포함). (KAN-220)
  getById: async (id: string): Promise<AdminGatheringDetail> => {
    const res = await apiClient.get<ApiResponse<AdminGatheringDetail>>(`/api/admin/gatherings/${id}`)
    return res.data.data
  },

  update: async (id: string, data: GatheringCreateRequest) => {
    const res = await apiClient.put<ApiResponse<unknown>>(`/api/admin/gatherings/${id}`, toGatheringRequestBody(data))
    return res.data.data
  },

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
