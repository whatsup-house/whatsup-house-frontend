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
  bio?: string
  job?: string
  mbti?: string
  interests?: string[]
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

// 토큰 기반 비로그인 신청 조회 응답 타입
export interface ApplicationTokenCheckResponse {
  id: string
  bookingNumber: string
  status: ApplicationStatus
  applicantName: string | null
  gathering: {
    id: string
    title: string
    eventDate: string
    startTime?: string
    locationName?: string | null
    thumbnailUrl: string | null
  }
  createdAt: string
}

export interface CuratedGathering {
  id: string
  title: string
  thumbnailUrl: string | null
  eventDate: string
  locationName: string | null
  price: number
  status: 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'
  curatedRank: number
}

export interface HomeReviewItem {
  reviewId: string
  nickname: string
  gatheringId: string
  gatheringTitle: string
  reviewContent: string
  likeCount: number
  thumbnailImageUrl: string | null
  homeDisplayOrder: number
}

export type ReviewType = 'TEXT' | 'PHOTO'

export interface ReviewImageItem {
  imageId: string
  imageUrl: string
  displayOrder: number
}

export interface ReviewItem {
  reviewId: string
  userId: string
  applicationId: string
  gatheringId: string
  reviewType: ReviewType
  reviewContent: string
  likeCount: number
  images: ReviewImageItem[]
  createdAt: string
}

export interface ReviewLikeResponse {
  reviewId: string
  liked: boolean
  likeCount: number
}

export interface ReviewDeleteResponse {
  reviewId: string
  deleted: boolean
}

export interface GatheringReviewPageResponse {
  content: ReviewItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface AdminDashboardGathering {
  id: string
  title: string
  eventDate: string
  startTime: string
  endTime: string
  locationName: string | null
  price: number
  maxAttendees: number
  applicantCount: number
  pendingCount: number
  confirmedCount: number
  attendedCount: number
  status: 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'
}

export interface AdminUserApplicationItem {
  id: string
  gatheringTitle?: string
  status: string
  createdAt: string
  isGuest: boolean
}

export interface AdminUserListItem {
  id: string
  nickname: string
  name: string | null
  phone: string | null
  email: string
  gender: string | null
  age: number | null
  job: string | null
  mbti: string | null
  createdAt: string
  applicationCount: number
  mileage: number
  accountStatus: string
}

export interface AdminUserDetail extends AdminUserListItem {
  bio: string | null
  animalType: string | null
  interests: string[] | null
  applicationHistory: AdminUserApplicationItem[]
}

export interface AdminUserPage {
  content: AdminUserListItem[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export type HeroSlideType = 'GATHERING' | 'CALENDAR' | 'STORY'

export interface HeroCarouselSlide {
  id: string
  type: HeroSlideType
  imageUrl: string
  title: string
  content: string | null
  dateLabel: string | null
  gatheringId: string | null
  sortOrder: number
}

export interface AdminHeroCarouselSlide {
  id: string
  type: HeroSlideType
  imageUrl: string
  title: string
  content: string | null
  dateLabel: string | null
  gatheringId: string | null
  sortOrder: number
  isActive: boolean
}

export interface AdminHeroCarouselSlideRequest {
  type: HeroSlideType
  imageUrl: string
  title: string
  content?: string
  dateLabel?: string
  gatheringId?: string
  sortOrder: number
}

// 이미지 업로드
export type CropRatio = '4:3' | '9:16' | '1:1'
export type CropContext = 'review' | 'carousel' | 'avatar'

export interface ImageUploadResponse {
  imageUrl: string
}

export interface AdminHomeReview {
  id: string
  content: string
  authorName: string
  avatarUrl: string | null
  gatheringTitle: string
  rating: number
  displayOrder: number
  isActive: boolean
}

export interface AdminHomeReviewRequest {
  content: string
  authorName: string
  avatarUrl?: string
  gatheringTitle: string
  rating: number
  displayOrder?: number
}

export interface ReviewCreateRequest {
  type: ReviewType
  content: string
  imageUrl?: string | null
  rating: number
}

export interface ReviewCreateResponse {
  id: string
  type: ReviewType
  content: string
  imageUrl: string | null
  rating: number
  mileageEarned: number
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

// 마일리지 타입
export type MileageType = 'SIGNUP' | 'ATTENDANCE' | 'REVIEW_REWARD' | 'REVIEW_UPGRADE' | 'ADMIN_ADJUST'

export interface MileageBalanceResponse {
  userId: string
  mileage: number
}

export interface MileageHistoryItem {
  id: string
  type: MileageType
  amount: number
  balanceAfter: number
  relatedId: string | null
  adjustReason: string | null
  createdAt: string
}

export interface MileageHistoryPageResponse {
  content: MileageHistoryItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
