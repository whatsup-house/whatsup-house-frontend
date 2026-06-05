// API 공통 응답 타입
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

// 게더링 상태
export type GatheringStatus = 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'

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
  status: GatheringStatus
  thumbnailUrl: string | null
  location: {
    id: string
    name: string
    address?: string | null
    naverMapUrl?: string | null
    kakaoMapUrl?: string | null
    mapUrl?: string | null   // 기존 하위 호환 필드
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

// 달력 dot 표시용 (날짜별 대표 게더링 상태)
export interface CalendarDot {
  date: string           // YYYY-MM-DD
  status: GatheringStatus
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
  nickname?: string
  applicationId: string
  gatheringId: string
  gatheringTitle?: string
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
  tempPath: string
  previewUrl: string
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
  applicationId: string
  reviewContent: string
  imageTempPaths?: string[]
}

export interface ReviewCreateResponse {
  reviewId: string
  userId: string
  nickname?: string
  applicationId: string
  gatheringId: string
  gatheringTitle?: string
  reviewType: ReviewType
  reviewContent: string
  likeCount: number
  images: ReviewImageItem[]
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

// ===== 신청폼 (EAV 동적 폼) =====

// 질문 타입 (백엔드 QuestionType enum과 1:1)
export type QuestionType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'SINGLE_CHOICE'
  | 'MULTI_CHOICE'
  | 'NUMBER'
  | 'MBTI_INPUT'

// 선택형 질문 보기. 백엔드 jsonb는 자유 구조라 choices 키 컨벤션을 사용한다.
export interface QuestionOptions {
  choices?: string[]
  [key: string]: unknown
}

// 동적 신청폼 질문 (GET /api/gatherings/{id}/form)
export interface FormQuestionDetail {
  questionId: string
  questionKey: string
  type: QuestionType
  label: string
  placeholder: string | null
  required: boolean
  displayOrder: number
  options: QuestionOptions | null
  validation: Record<string, unknown> | null
  systemReserved: boolean   // name/phone 등 시스템 예약 질문 (회원은 계정값 사용)
}

// 게더링 신청폼 전체
export interface GatheringForm {
  formId: string
  gatheringId: string | null
  guideText: string | null
  questions: FormQuestionDetail[]
}

// 답변 1건 (EAV value). value는 질문 타입에 따라 string | number | string[]
export interface AnswerItem {
  questionId: string
  value: string | number | string[]
}

// 동적 신청 요청 body (회원/비회원 공통)
export interface DynamicApplicationRequest {
  answers: AnswerItem[]
}

// 신청 생성 응답
export interface ApplicationSubmitResponse {
  id: string
  bookingNumber: string
  gatheringId: string
  status: ApplicationStatus
  createdAt: string
}

// 답변 조회 (questionKey/label/value). value는 저장된 원시값이 펼쳐져 옴
export interface AnswerView {
  questionKey: string
  label: string
  value: string | number | string[] | null
}

// 신청 상세 (회원 GET /api/applications/{id}, 비회원 GET /api/applications/check)
export interface ApplicationDetail {
  id: string
  bookingNumber: string
  name: string | null
  phone: string | null
  status: ApplicationStatus
  gathering: {
    id: string
    title: string
    eventDate: string
    startTime: string | null
  }
  createdAt: string
  answers: AnswerView[]
}

// ===== 신청폼 관리 (관리자) =====

export type MatchingStrategy = 'SAME' | 'DIVERSE' | 'OVERLAP'

// 질문 추가/수정 요청 (POST/PUT /api/admin/.../form/questions)
export interface FormQuestionUpsertRequest {
  questionKey: string
  type: QuestionType
  label: string
  placeholder?: string
  required: boolean
  displayOrder: number
  options?: QuestionOptions
  validation?: Record<string, unknown>
  isMatchingField: boolean
  matchingStrategy?: MatchingStrategy
  matchingWeight?: number
}

// 질문 관리 응답
export interface FormQuestionAdminItem {
  questionId: string
  questionKey: string
  type: QuestionType
  label: string
  placeholder: string | null
  required: boolean
  displayOrder: number
  options: QuestionOptions | null
  validation: Record<string, unknown> | null
  isMatchingField: boolean
  systemReserved: boolean
  matchingStrategy: MatchingStrategy | null
  matchingWeight: number | null
}

// ===== 자동매칭 (관리자) =====

export type MatchingGroupStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'

// 자동매칭 실행 결과 (POST /api/admin/gatherings/{id}/matching)
export interface MatchingRunResult {
  gatheringId: string
  algorithmVersion: string
  confirmedCount: number
  groupCount: number
  matchedCount: number
  unmatchedCount: number
}

// 매칭 멤버 1명
export interface MatchingMemberView {
  memberId: string | null     // 미배정자는 null
  applicationId: string
  name: string | null
  phone: string | null
  seatOrder: number | null
  manualAssign: boolean
}

// 매칭 그룹 1개
export interface MatchingGroupView {
  groupId: string
  eventDate: string
  status: MatchingGroupStatus
  groupScore: number | null
  groupSize: number
  restaurantName: string | null
  restaurantAddress: string | null
  members: MatchingMemberView[]
}

// 매칭 결과 조회 (GET /api/admin/gatherings/{id}/matching)
export interface MatchingResult {
  gatheringId: string
  groups: MatchingGroupView[]
  unmatched: MatchingMemberView[]
}

// 관리자 신청 상세 (답변 포함) — GET /api/admin/applications/{id}
export interface AdminApplicationDetail {
  id: string
  bookingNumber: string
  name: string | null
  phone: string | null
  status: ApplicationStatus
  gatheringId: string
  userId: string | null
  createdAt: string
  answers: AnswerView[]
}
