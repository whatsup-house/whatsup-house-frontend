// API 공통 응답 타입
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

// 게더링 타입
export interface GatheringListItem {
  id: string
  title: string
  description: string
  eventDate: string      // YYYY-MM-DD
  startTime: string      // HH:mm:ss
  endTime: string
  price: number
  maxAttendees: number
  status: 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'
  thumbnailUrl: string | null
  location: {
    id: string
    name: string
  } | null
}

export interface GatheringDetail extends GatheringListItem {
  howToRun?: string[] | null
  locationAddress?: string
  photoUrls?: string[] | null
  mileageReward?: number
  averageRating?: number | null
  reviewCount?: number
}

// 인증 타입
export interface LoginResponse {
  accessToken: string
  user: {
    id: string
    email: string
    nickname: string
    admin: boolean      // Java boolean isAdmin → Jackson serializes as "admin"
    mileage: number
    avatarUrl: string | null
  }
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  nickname: string
  gender: Gender   // @NotNull in backend
  age: number      // @NotNull in backend
  phone?: string   // nullable, 11 digits
}

export interface RegisterResponse {
  id: string
  email: string
  nickname: string
  createdAt: string
}

// 신청 관련 타입
export type Gender = 'MALE' | 'FEMALE'
export type ReferralSource = 'INSTAGRAM' | 'FRIEND' | 'BLOG' | 'OTHER'

export interface GuestApplicationRequest {
  name: string
  phone: string
  gender: Gender
  age: number
  instagramId?: string
  job?: string
  mbti?: string
  intro?: string
  referrerName?: string
}

export interface GuestApplicationResponse {
  id: string
  bookingNumber: string
  gatheringId: string
  status: string
  createdAt: string
}

export interface UserApplicationRequest {
  gender: Gender
  age: number
  job?: string
  mbti?: string
  intro: string
  referralSource: ReferralSource
}


// 프로필 수정 요청 타입
export interface ProfileUpdateRequest {
  nickname?: string
  phone?: string
  name?: string
  gender?: Gender
  age?: number
  instagramId?: string
  mbti?: string
  job?: string
  bio?: string
  interests?: string[]
}

// 내 신청 내역 타입
export type ApplicationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED'

export interface ApplicationListItem {
  id: string
  bookingNumber: string
  status: ApplicationStatus
  gathering: {
    id: string
    title: string
    eventDate: string
    thumbnailUrl: string | null
  }
  createdAt: string
}

// 비회원 신청 조회 응답 타입
export interface GuestApplicationCheckResponse {
  id: string
  bookingNumber: string
  status: ApplicationStatus
  gathering: {
    id: string
    title: string
    eventDate: string
    thumbnailUrl: string | null
  }
  createdAt: string
}

export interface UserProfile {
  id: string
  email: string
  nickname: string
  name: string | null
  phone: string | null
  bio: string | null
  intro?: string | null
  instagramId?: string | null
  gender: string | null
  age: number | null
  job: string | null
  mbti: string | null
  animalType: string | null
  animalColor: string
  animalPose: string
  interests: string[] | null
  mileage?: number
  avatarUrl: string | null
  admin?: boolean
}
