// API 공통 응답 타입
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

// 게더링 상태
export type GatheringStatus = 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'

// 게더링 종류 (REGULAR=일반, RANDOM_TABLE=우연한 식탁)
export type GatheringType = 'REGULAR' | 'RANDOM_TABLE'

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
  createdAt?: string     // 등록일 (ISO datetime) — 목록 정렬용 (KAN-295)
  location: {
    id: string
    name: string
    address?: string | null
    naverMapUrl?: string | null
    kakaoMapUrl?: string | null
  } | null
  // 태그 — BE(KAN-304)에서 제공. 미제공 시 칩 미표시 (KAN-305)
  tags?: string[] | null
}

export interface GatheringDetail extends GatheringListItem {
  gatheringType?: GatheringType
  howToRun?: string[] | null
  locationAddress?: string
  photoUrls?: string[] | null
  mileageReward?: number
  averageRating?: number | null
  reviewCount?: number
}

// 우연한 식탁 이용권 (KAN-260)
export type TicketPassStatus = 'PENDING' | 'ACTIVE' | 'USED_UP' | 'CANCELLED'
export type TicketProduct = 'RANDOM_TABLE_ONE' | 'RANDOM_TABLE_FOUR'
export type ParticipantAccountStatus = 'ACTIVE' | 'BLOCKED'
export type RandomTableEligibility = 'UNREVIEWED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'

export interface TicketProductItem {
  id: string
  name: string
  sessionCount: number
  price: number
}

export interface TicketPass {
  id: string
  applicationId: string | null
  productId: string | null
  product: TicketProduct | null
  productLabel: string
  totalCount: number
  remainingCount: number
  status: TicketPassStatus
  createdAt: string
  activatedAt: string | null
  purchaseAmount: number
  paymentDeadline: string | null
  paymentConfirmedAt: string | null
}

export interface MyTickets {
  accountStatus: ParticipantAccountStatus
  randomTableEligibility: RandomTableEligibility
  purchasable: boolean
  totalRemaining: number
  passes: TicketPass[]
  applicationId: string | null
  bookingNumber?: string | null
  gatheringId: string | null
  applicationStatus?: ApplicationStatus | null
}

export interface GuestOverview {
  name: string
  randomTableEligibility: RandomTableEligibility
  totalRemaining: number
  passes: TicketPass[]
  applications: ApplicationListItem[]
}

export interface TicketPurchaseRequest {
  productId?: string | null
  product?: TicketProduct | null
  applicationId?: string | null
}

export interface GuestTicketPurchaseRequest extends TicketPurchaseRequest {
  bookingNumber: string
}

// 달력 dot 표시용 (날짜별 대표 게더링 상태)
export interface CalendarDot {
  date: string           // YYYY-MM-DD
  status: GatheringStatus
}

// 인증 타입
// access/refresh 토큰은 HttpOnly 쿠키로 발급되어 응답 body에는 사용자 정보만 담긴다. (KAN-189)
export interface LoginResponse {
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
  age: number      // @NotNull in backend — birthDate 기준 만 나이(BE 전환 전까지 호환용 전송)
  birthDate?: string // 생년월일 (YYYY-MM-DD). BE(KAN-257)에서 영속화 후 age 계산에 사용
  phone?: string   // 11 digits
  intro?: string
  instagramId?: string
  job?: string
  mbti?: string
}

export interface RegisterResponse {
  id: string
  email: string
  nickname: string
  createdAt: string
}

export interface FindEmailRequest {
  name: string
  phone: string
}

export interface FindEmailResponse {
  maskedEmail: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetRequestResponse {
  accepted: boolean
}

export interface PasswordResetConfirmRequest {
  token: string
  newPassword: string
}

export interface PasswordResetConfirmResponse {
  reset: boolean
}

export interface UserWithdrawRequest {
  password: string
}

export interface UserWithdrawResponse {
  withdrawn: boolean
}

// 신청 관련 타입
export type Gender = 'MALE' | 'FEMALE'


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
  intro?: string
  bio?: string
  interests?: string[]
}

// 직업 카탈로그 (KAN-270)
export interface JobItem {
  code: string
  label: string
}

export interface JobGroup {
  category: string
  categoryLabel: string
  jobs: JobItem[]
}

// 내 신청 내역 타입
export type ApplicationStatus = 'PENDING' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'ATTENDED'

// 결제 상태. 무료 게더링은 FREE로 내려오며, 유료 우연한 식탁 이용권 결제는 별도 도메인에서 처리한다.
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FREE'

export interface ApplicationListItem {
  id: string
  bookingNumber: string
  status: ApplicationStatus
  paymentStatus?: PaymentStatus | null
  gathering: {
    id: string
    title: string
    eventDate: string
    thumbnailUrl: string | null
    gatheringType?: GatheringType
  }
  createdAt: string
}

// 비회원 신청 조회 응답 타입
export interface GuestApplicationCheckResponse {
  id: string
  bookingNumber: string
  status: ApplicationStatus
  paymentStatus?: PaymentStatus | null
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
  paymentStatus?: PaymentStatus | null
  ticketRemainingCount?: number | null
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

export interface ReviewLocateResponse {
  reviewId: string
  page: number
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
  applicationId: string
  bookingNumber: string
  gatheringTitle: string | null
  status: string
  createdAt: string
}

// 백엔드 회원 목록 응답(UserListResponse) 기준. 상세 전용 필드는 포함하지 않는다. (KAN-187)
export interface AdminUserListItem {
  id: string
  email: string
  nickname: string
  phone: string | null
  admin: boolean
  mileage: number
  totalApplications: number
  attendedCount: number
  createdAt: string
}

// 백엔드 회원 상세 응답(UserDetailResponse) 기준. (KAN-188)
export interface AdminUserDetail {
  id: string
  email: string
  name: string | null
  nickname: string
  phone: string | null
  gender: string | null
  age: number | null
  job: string | null
  mbti: string | null
  intro: string | null
  instagramId: string | null
  admin: boolean
  mileage: number
  accountStatus: 'ACTIVE' | 'SUSPENDED'
  totalApplications: number
  attendedCount: number
  createdAt: string
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
  // 연결된 게더링의 유효 상태(과거 OPEN은 COMPLETED 보정). GATHERING 타입에만 존재. (KAN-211)
  gatheringStatus: GatheringStatus | null
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

// 백엔드 캐러셀 생성/수정 요청. 이미지는 업로드 결과의 tempPath로 전달한다.
// (수정 시 tempPath 생략하면 기존 이미지 유지 — KAN-182/183). dateLabel은 백엔드가 게더링에서 파생.
export interface AdminHeroCarouselSlideRequest {
  type: HeroSlideType
  tempPath?: string
  title: string
  content?: string
  gatheringId?: string
  sortOrder: number
}

// 이미지 업로드
export type CropRatio = '4:3' | '9:16' | '1:1'
export type CropContext = 'review' | 'carousel' | 'avatar' | 'gathering'

// 백엔드 SupabaseStorageService.ALLOWED_FOLDERS와 일치해야 한다.
export type UploadFolder = 'carousel' | 'gathering' | 'review' | 'avatar'

export interface ImageUploadResponse {
  tempPath: string
  previewUrl: string
}

// 홈 노출 관리 대상 = 실제 작성된 리뷰. (KAN-184)
// 백엔드는 임의 후기 생성/수정을 지원하지 않고, 실제 리뷰의 홈 노출 여부/순서만 관리한다.
export interface AdminHomeReview {
  reviewId: string
  nickname: string
  reviewContent: string
  likeCount: number
  gatheringTitle: string
  imageUrl: string | null      // 리뷰 첫 이미지
  homeFeatured: boolean
  homeDisplayOrder: number | null
  createdAt: string
}

export type AdminHomeReviewSort = 'LATEST' | 'LIKES'

export interface AdminHomeReviewPage {
  content: AdminHomeReview[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ReviewHomeFeaturedRequest {
  isHomeFeatured: boolean
  homeDisplayOrder?: number
}

export interface ReviewHomeOrderItem {
  reviewId: string
  homeDisplayOrder: number
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
  bio?: string | null
  intro?: string | null
  instagramId?: string | null
  gender: Gender | null
  age: number | null
  job: string | null
  mbti: string | null
  animalType: string | null
  animalColor: string
  animalPose: string
  interests: string[] | null
  mileage?: number
  avatarUrl: string | null
  characterUrl: string | null
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
  paymentStatus?: PaymentStatus | null
  ticketRemainingCount?: number | null
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

// 인앱 알림 (KAN-262)
export type NotificationType = 'PARTICIPATION_CONFIRMED' | 'MILEAGE_EARNED' | 'REVIEW_LIKE_MILESTONE'
// 알림 클릭 시 이동 대상 (FE가 라우트로 매핑)
export type NotificationLink = 'APPLICATIONS' | 'MILEAGE' | 'REVIEWS'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  content: string | null
  link: NotificationLink | null
  isRead: boolean
  createdAt: string
}

export interface UnreadCountResponse {
  unreadCount: number
}
