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

// 폼 모델(date/capacity)을 백엔드 요청 계약(eventDate/maxAttendees)으로 변환한다. (KAN-185)
// 백엔드가 받지 않는 필드(howToRun/moodTags/activityTags/mileageReward)는 보내지 않는다.
function toGatheringRequestBody(data: GatheringCreateRequest) {
  return {
    title: data.title,
    description: data.description,
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
  mapUrl?: string | null   // 기존 하위 호환 필드
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
  createdAt: string
  isGuest: boolean
}

export const adminGatheringApi = {
  getAll: async (status?: string, date?: string): Promise<AdminGatheringListItem[]> => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (date) params.append('date', date)
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
    // 목록 조회는 클라이언트 엔드포인트로 이동됨(KAN-161). 관리자 컨트롤러는 쓰기 전용.
    // 클라이언트 응답에 없는 관리자 필드(수용/계약상태/특징)는 기본값으로 채워 렌더 크래시를 막는다.
    const res = await apiClient.get<ApiResponse<Partial<LocationItem>[]>>('/api/locations')
    return (res.data.data ?? []).map((l) => ({
      id: l.id ?? '',
      name: l.name ?? '',
      address: l.address ?? '',
      maxCapacity: l.maxCapacity ?? 0,
      features: l.features ?? [],
      contractStatus: l.contractStatus ?? '',
      naverMapUrl: l.naverMapUrl ?? null,
      kakaoMapUrl: l.kakaoMapUrl ?? null,
      mapUrl: l.mapUrl ?? null,
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
}
