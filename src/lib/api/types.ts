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

// 회차 상태 (KAN-338). 날짜가 지난 모집중 회차는 백엔드가 DONE으로 내려준다.
export type GatheringSessionStatus = 'OPEN' | 'CLOSED' | 'DONE' | 'CANCELLED'

// 모임 회차 — BE GatheringSessionResponse (KAN-338)
export interface GatheringSession {
  id: string
  eventDate: string              // YYYY-MM-DD
  startTime: string | null       // HH:mm:ss
  endTime: string | null
  location: {
    id: string
    name: string
    address: string | null
    naverMapUrl: string | null
    kakaoMapUrl: string | null
  } | null
  maxAttendees: number
  price: number | null           // 회차 오버라이드 없으면 종류 기본 가격
  applyDeadlineAt: string | null // ISO datetime, 없으면 마감 없음
  status: GatheringSessionStatus
  confirmedCount: number         // 정원을 차지한 인원(승인 + 출석)
  // RANDOM_TABLE 회차 전용 (KAN-345). 응답에 아직 없을 수 있어 optional
  matchRunAt?: string | null
  autoConfirmGraceMinutes?: number | null
  tableSizeMin?: number | null
  tableSizeMax?: number | null
  minGroupScore?: number | null
  maxAgeGap?: number | null
}

// 모임 목록 항목 = 종류 + 조건에 맞는 회차 — BE GatheringResponse (KAN-338)
export interface GatheringListItem {
  id: string
  title: string
  description: string | null
  tags: string[] | null
  thumbnailUrl: string | null
  gatheringType: GatheringType | null
  basePrice: number | null
  createdAt: string              // 종류 등록일 (ISO datetime) — 목록 정렬용 (KAN-295)
  sessions: GatheringSession[]   // 날짜·시작 시간 순
}

// 모임 종류 상세 + 회차 목록 — BE GatheringDetailResponse (KAN-338)
export interface GatheringDetail {
  id: string
  title: string
  description: string | null
  howToRun: string[] | null
  tags: string[] | null
  thumbnailUrl: string | null
  imageUrls?: string[]           // 상세 사진 (썸네일 제외). BE 배포 전엔 없을 수 있다 (KAN-372)
  gatheringType: GatheringType | null
  basePrice: number | null
  sessions: GatheringSession[]   // 날짜·시작 시간 순
}

// 목록 파생: 날짜별 목록의 한 줄 = 종류 + 그 날의 회차
export interface GatheringSessionEntry {
  gathering: GatheringListItem
  session: GatheringSession
}

// 목록 파생: 모아보기 카드 (종류 1개 = 카드 1개)
export type GatheringTypeFilter = 'all' | 'open' | 'completed'
export type GatheringTypeSort = 'popular' | 'latest' | 'oldest'

export interface GatheringTypeCard {
  id: string
  title: string
  thumbnailUrl: string | null
  tags: string[] | null
  totalCount: number
  representativeStatus: GatheringStatus
  // 카드에 표시할 날짜. 진행완료 대표는 null. (KAN-295)
  displayDate: string | null
}

// 관리자 모임 종류 생성/수정 — BE GatheringCreateRequest / GatheringUpdateRequest (KAN-338)
export interface AdminGatheringTypeRequest {
  title: string
  description: string
  howToRun: string[]
  tags: string[]
  basePrice: number
  thumbnailUrl?: string          // 새로 올린 이미지의 tempPath만. 생략하면 기존 썸네일 유지
  imageUrls?: string[]           // 상세 사진 순서대로: 새 사진은 tempPath, 남길 사진은 기존 URL. 생략하면 기존 유지 (KAN-372)
  gatheringType?: GatheringType  // 생성 시에만 반영 (수정 불가)
}

// 우연한 식탁 회차 전용 필드 — RANDOM_TABLE 회차에서만 보낸다. null이면 매칭 규칙 기본값 (KAN-345)
export interface DiningSessionFields {
  matchRunAt: string                     // YYYY-MM-DDTHH:mm, 이 시각에 마감하고 매칭 실행
  autoConfirmGraceMinutes: number | null // 제안 → 자동 확정까지 유예(분). 0이면 즉시
  tableSizeMin: number
  tableSizeMax: number
  minGroupScore: number | null           // 0~1
  maxAgeGap: number | null
}

// 관리자 회차 필드 — BE GatheringSessionRequest (회차 수정 본문이자 반복 생성의 base) (KAN-338)
export interface AdminSessionRequest extends Partial<DiningSessionFields> {
  eventDate: string              // YYYY-MM-DD
  startTime: string | null       // HH:mm
  endTime: string | null
  locationId: string
  maxAttendees: number
  priceOverride: number | null   // null이면 종류 기본 가격
  applyDeadlineAt: string | null // YYYY-MM-DDTHH:mm, null이면 마감 없음
}

// 회차 생성 — 단건은 회차 필드를 최상위에, 주간 반복은 { base, repeatWeekly: { until } } (KAN-338)
export type AdminSessionCreateRequest =
  | AdminSessionRequest
  | { base: AdminSessionRequest; repeatWeekly: { until: string } }

// 관리자 모임 목록의 한 줄 = 종류 1개. 회차 단위 관리자 목록을 종류 ID로 묶어 파생한다.
export interface AdminGatheringTypeRow {
  id: string
  title: string
  sessionIds: string[]
  sessionCount: number
  upcomingCount: number          // 오늘 이후 · 취소 제외
  nextEventDate: string | null   // 다가오는 가장 이른 회차 날짜
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

// 달력 dot 표시용 (날짜별 대표 회차 상태)
export interface CalendarDot {
  date: string           // YYYY-MM-DD
  status: GatheringSessionStatus
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
    eventDate: string | null   // 회차 배정 전(우연한 식탁 매칭 전)이면 null (KAN-338)
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
    eventDate: string | null
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
    eventDate: string | null
    startTime?: string | null
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
export type CropRatio = '4:3' | '3:2' | '9:16' | '1:1'
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

// 회원 신청 POST /api/applications — 종류 + 희망 회차(일반 모임은 1개) (KAN-338)
export interface ApplicationCreateRequest extends DynamicApplicationRequest {
  gatheringId: string
  candidateSessionIds: string[]
}

// 신청 생성 응답
export interface ApplicationSubmitResponse {
  id: string
  bookingNumber: string
  gatheringId: string
  status: ApplicationStatus
  createdAt: string
}

// ===== 우연한 식탁 참가자 (/api/dining, KAN-342) =====

// 신청 매칭 상태 — BE MatchStatus. 이용권 차감(확정) 전이면 null
export type MatchStatus =
  | 'WAITING'
  | 'MATCHING'
  | 'CONFIRM_PENDING'
  | 'CONFIRMED'
  | 'REALLOCATING'
  | 'ALTERNATIVE_OFFERED'
  | 'TRANSFERRED'
  | 'NO_MATCH'
  | 'EXCEPTION'

// 이용권 차감 상태 — BE TicketDeductionStatus
export type TicketDeductionStatus =
  | 'DEDUCTED'
  | 'RESTORED'
  | 'REFUND_REQUESTED'
  | 'REFUND_PROCESSING'
  | 'REFUNDED'
  | 'REFUND_FAILED'

export interface DiningSessionInfo {
  id: string
  eventDate: string          // YYYY-MM-DD
  startTime: string | null   // HH:mm:ss
  region: string | null      // 회차 장소명
  matchRunAt?: string | null // 매칭 실행 예정 시각(ISO). BE 가 아직 안 내려주면 표시 생략
}

// 테이블 상태 — BE DiningTableStatus. PROPOSED: 확정 유예 중
export type DiningTableStatus = 'PROPOSED' | 'CONFIRMED' | 'DONE' | 'DISSOLVED'

// 내 우연한 식탁 신청 1건 — GET /api/dining/me/applications 의 applications[]
export interface DiningApplicationItem {
  id: string
  gathering: { id: string; title: string }
  candidateSessions: DiningSessionInfo[]   // 우선순위 순
  assignedSession: DiningSessionInfo | null
  status: ApplicationStatus
  matchStatus: MatchStatus | null
  ticketStatus: TicketDeductionStatus | null
  table: { id: string; status: DiningTableStatus; confirmAt: string | null } | null
  resolutionId?: string | null             // 매칭 실패 해결 선택 ID (KAN-347). 없으면 해결 버튼 비활성
}

export interface DiningApplicationListResponse {
  applications: DiningApplicationItem[]
}

// 매칭 실패 해결 선택 — GET /api/dining/resolutions/{id} (KAN-347, 병렬 개발이라 필드는 optional)
export type DiningResolutionChoice = 'TRANSFER' | 'KEEP_TICKET' | 'REFUND'
export type DiningResolutionStatus = 'OFFERED' | 'RESOLVED' | 'EXPIRED'

export interface DiningResolution {
  id: string
  applicationId?: string
  offeredSessions?: (DiningSessionInfo & { endTime?: string | null })[]
  choice?: DiningResolutionChoice | null
  respondBy?: string | null   // ISO datetime. 지나면 KEEP_TICKET 으로 자동 처리
  status?: DiningResolutionStatus
}

// POST /api/dining/resolutions/{id}/choose. TRANSFER 면 sessionId 필수
export interface DiningResolutionChooseRequest {
  choice: DiningResolutionChoice
  sessionId?: string
}

// 신청 폼 프리필 — GET /api/dining/prefill?gatheringId= . 답한 적 없는 표준 질문은 빠진다
export interface DiningPrefillResponse {
  answers: {
    reservedKey: ReservedQuestionKey
    questionKey: string                  // 이 모임 폼에서의 질문 키
    value: string | number | string[]
  }[]
}

// 확정 테이블의 내 참석 — BE AttendanceStatus. 체크인(POST /api/dining/tables/{id}/check-in, KAN-349) 응답도 같은 모양
export type DiningAttendanceStatus = 'SCHEDULED' | 'ATTENDED' | 'CANCELED_EARLY' | 'CANCELED_LATE' | 'NO_SHOW'

export interface DiningAttendance {
  status: DiningAttendanceStatus
  checkedInAt: string | null
}

// 테이블 상세 — GET /api/dining/tables/{id} (KAN-346). 멤버가 아니면 403, 없으면 404
export interface DiningTableDetail {
  id: string
  status: 'CONFIRMED' | 'DONE'
  session: {
    eventDate: string          // YYYY-MM-DD
    startTime: string | null   // HH:mm:ss
    endTime: string | null
    region: string | null
  }
  venue: { name: string; address: string | null; mapUrl: string | null; priceRange: string | null } | null  // 배정 전이면 null
  chatRoomId: string | null
  // 구성원 제한 소개(INF-06): 닉네임·MBTI·관심사만 내려온다. userId 는 피드백·신고 대상 지정용(KAN-346 반영 전엔 없음)
  members: { userId?: string; nickname: string; mbti: string | null; interests: string[] | null }[] | null
  cancelPolicy: string | null
  myAttendance: DiningAttendance | null
}

// 행사 후 피드백 — POST /api/dining/tables/{id}/feedback (KAN-350). 멤버당 1회
export type DiningRejoinIntent = 'YES' | 'MAYBE' | 'NO'
// AGAIN=다시 만나고 싶음, AVOID=같은 테이블 원치 않음. 운영자·매칭 전용이라 상대에게 공개되지 않는다
export type DiningPeerPreferenceKind = 'AGAIN' | 'AVOID'

export interface DiningFeedbackRequest {
  tableScore: number   // 1~5
  talkScore: number
  venueScore: number
  rejoinIntent: DiningRejoinIntent
  comment?: string     // 최대 2000자
  peers?: { userId: string; kind: DiningPeerPreferenceKind }[]
}

// 같은 테이블 멤버 신고 — POST /api/dining/tables/{id}/reports (KAN-350)
export interface DiningReportRequest {
  reportedUserId: string
  reason: string       // 최대 2000자
}

// 내 참가 이력 한 건 — GET /api/dining/me/history (KAN-350). 최신 회차 순
export interface DiningHistoryItem {
  tableId: string
  sessionId: string
  eventDate: string              // YYYY-MM-DD
  region: string | null
  venueName: string | null       // 배정 전이면 null
  tableStatus: DiningTableStatus // 확정·종료 테이블만 온다
  feedbackSubmitted: boolean
  attendanceStatus: DiningAttendanceStatus | null  // 아직 BE 가 항상 null → 표시 생략
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
    eventDate: string | null   // 회차 배정 전이면 null (KAN-338)
    startTime: string | null
  }
  createdAt: string
  answers: AnswerView[]
}

// ===== 신청폼 관리 (관리자) =====

export type MatchingStrategy = 'SAME' | 'DIVERSE' | 'OVERLAP'

// 우연한 식탁 표준 항목 키 (백엔드 ReservedQuestionKey와 1:1, KAN-341)
export type ReservedQuestionKey =
  | 'BIRTH_YEAR'
  | 'GENDER'
  | 'MBTI'
  | 'INTERESTS'
  | 'MY_STYLE'
  | 'WANTED_STYLE'
  | 'DIET'

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
  // 표준 항목이면 삭제·타입 변경 불가, 라벨·선택지만 수정 (KAN-343). 구버전 응답엔 필드가 없다.
  reservedKey?: ReservedQuestionKey | null
}

// ===== 자동매칭 (관리자) =====

export type MatchingGroupStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'

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

// ===== 우연한 식탁 운영 (관리자, KAN-348) =====

// 운영 대시보드 회차 카드 — BE DiningDashboardResponse.SessionCard
export interface DiningDashboardSession {
  sessionId: string
  gatheringId: string
  title: string
  eventDate: string              // YYYY-MM-DD
  startTime: string | null       // HH:mm:ss
  locationName: string | null    // 지역
  status: GatheringSessionStatus
  paidCount: number
  maxAttendees: number
  matchRunAt: string | null      // ISO datetime
  isMatchRunDone: boolean        // 테이블이 하나라도 만들어졌으면 true
  tableCount: number             // 제안 중 + 확정
  openExceptionCount: number
}

// GET /api/admin/dining/dashboard
export interface DiningDashboard {
  upcomingSessionCount: number
  waitingApplicantCount: number
  paidApplicantCount: number
  proposedTableCount: number
  confirmedTableCount: number
  openExceptionCount: number     // 회차 무관 전체
  sessions: DiningDashboardSession[] // 날짜·시작 시간 순
}

// PUT /api/admin/dining/sessions/{id}/venues 본문 항목 (목록으로 통째로 교체)
export interface SessionVenueRequest {
  venueId: string
  capacityTables: number         // 1~100
}

// BE SessionVenueResponse
export interface SessionVenue {
  venue: DiningVenue
  capacityTables: number
  usedTables: number
}

// ===== 우연한 식탁 회차 콘솔 (관리자, KAN-352) =====
// 시각은 LocalDateTime ISO 문자열.

// GET /api/admin/dining/sessions/{id}/applicants — BE DiningApplicantResponse. 나이·성별·MBTI는 신청 답변 원문
export interface DiningApplicant {
  applicationId: string
  userId: string | null            // 레거시 비회원 신청은 null
  name: string
  age: string | null
  gender: string | null
  mbti: string | null
  status: ApplicationStatus
  isPaid: boolean                  // 이용권 차감 완료 = 승인·출석
  matchStatus: MatchStatus | null
  candidateSessions: { sessionId: string; eventDate: string; priority: number }[] // 1순위부터
  participationCount: number
  hasExcludedRelation: boolean     // 같은 회차 신청자와 피하고 싶음·신고 관계
}

// BE ScoreDetail. penalties는 감점 항목명 → 감점 값
export interface DiningScoreDetail {
  pairAvg: number
  pairMin: number
  penalties: Record<string, number> | null
}

export type DiningAssignReason = 'INITIAL' | 'REALLOCATED' | 'MANUAL' | 'SPLIT' | 'MERGED'
export type DiningUnassignedReason = 'AGE_GAP' | 'BLOCKED_PAIR' | 'NOT_ENOUGH_PEOPLE' | 'LOW_SCORE' | 'NEXT_SESSION_WAITING'

// BE DiningTableListResponse.MemberView (좌석 순)
export interface DiningTableMember {
  memberId: string
  applicationId: string
  userId: string
  nickname: string
  birthYear: number | null
  gender: string | null
  mbti: string | null
  assignReason: DiningAssignReason
  isManual: boolean
}

// BE DiningTableListResponse.TableView (해체된 테이블 제외)
export interface DiningAdminTable {
  id: string
  status: DiningTableStatus
  groupScore: number | null        // 0~1
  scoreDetail: DiningScoreDetail | null
  confirmAt: string | null         // 자동 확정 예정 시각
  locked: boolean                  // 수동 조정됨 — 재실행해도 유지
  venueId: string | null
  members: DiningTableMember[]
  chatRoomId?: string | null       // BE 목록 응답에 아직 없다. 내려오면 채팅방 상태를 표시한다
}

// BE MatchRunResponse
export interface DiningMatchRun {
  id: string
  startedAt: string
  finishedAt: string | null
  triggeredBy: string
  candidateCount: number
  tableCount: number
  splitCount: number
  mergeCount: number
  reallocatedCount: number
  unassignedCount: number
  algorithmVersion: string
}

// GET /api/admin/dining/sessions/{id}/tables
export interface DiningTableList {
  tables: DiningAdminTable[]
  unassigned: { applicationId: string; nickname: string; reason: DiningUnassignedReason }[]
  lastRun: DiningMatchRun | null   // 실행 이력이 없으면 null
}

// POST /api/admin/dining/tables/{id}/confirm-now — 하드 조건 위반으로 보류되면 status가 PROPOSED 그대로
export interface DiningTableConfirmResult {
  id: string
  status: DiningTableStatus
  confirmedAt: string | null
  venueId: string | null
  chatRoomId: string | null
}

export interface DiningTableViolation {
  tableId: string
  rule: 'TABLE_SIZE' | 'AGE_GAP' | 'BLOCKED_PAIR'
  message: string
}

// 테이블 조정(move·split·merge·dissolve) 응답 — 조정된 테이블만. 위반이면 400 TABLE_RULE_VIOLATION(params.violations)
export interface DiningTableAdjustResponse {
  tables: DiningAdminTable[]
  validation: { valid: boolean; violations: DiningTableViolation[] }
}

// 테이블 조정 요청. 확정(CONFIRMED) 테이블이 끼면 reason 필수(BE 400)
export type DiningTableAdjustRequest =
  | { type: 'move'; tableId: string; memberId: string; targetTableId: string; reason?: string }
  | { type: 'split'; tableId: string; memberIds: string[]; reason?: string }
  | { type: 'merge'; tableIds: string[]; reason?: string } // 첫 테이블로 합친다
  | { type: 'dissolve'; tableId: string; reason?: string }

// GET /api/admin/dining/sessions/{id}/attendance (KAN-349 계약, 아직 404일 수 있다)
export interface DiningAttendanceRow {
  attendanceId: string
  memberId: string
  nickname: string
  status: DiningAttendanceStatus
  checkedInAt: string | null
  noShowCandidate: boolean
}

// GET /api/admin/dining/sessions/{id}/feedback-summary (KAN-350). 평균은 응답이 없으면 null
export interface DiningFeedbackSummary {
  responseCount: number
  memberCount: number
  responseRate: number             // 0~1
  avgTable: number | null
  avgTalk: number | null
  avgVenue: number | null
  rejoinYes: number
  rejoinMaybe: number
  rejoinNo: number
  reportCount: number
  byTable: { tableId: string; responseCount: number; avgTable: number | null; avgTalk: number | null; avgVenue: number | null }[]
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
export type NotificationType =
  | 'PARTICIPATION_CONFIRMED'
  | 'MILEAGE_EARNED'
  | 'REVIEW_LIKE_MILESTONE'
  // 우연한 식탁 (BE NotificationType KAN-342·346·347·349)
  | 'DINING_PAYMENT_PENDING'
  | 'DINING_CONFIRMED'
  | 'DINING_ALTERNATIVE_OFFERED'
  | 'DINING_TRANSFERRED'
  | 'DINING_REFUND_REQUESTED'
  | 'DINING_REFUND_COMPLETED'
  | 'DINING_WAITING'
  | 'DINING_REALLOCATING'
  | 'DINING_REMINDER'
  | 'DINING_FEEDBACK_REQUEST'
  | 'DINING_NEXT_SESSIONS'
// 알림 클릭 시 이동 대상 (FE가 라우트로 매핑)
export type NotificationLink = 'APPLICATIONS' | 'MILEAGE' | 'REVIEWS' | 'TICKET_PURCHASE' | 'DINING_TABLE' | 'DINING_RESOLUTION' | 'DINING_FEEDBACK_REQUEST' | 'DINING_HISTORY'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  content: string | null
  link: NotificationLink | null
  // 이동 대상 ID (KAN-346·349). DINING_TABLE·DINING_FEEDBACK_REQUEST=테이블 ID, DINING_HISTORY=모임 종류 ID,
  // TICKET_PURCHASE·APPLICATIONS(우연한 식탁)=신청 ID. 없으면 null
  linkId?: string | null
  isRead: boolean
  createdAt: string
}

export interface UnreadCountResponse {
  unreadCount: number
}

// ===== 우연한 식탁 운영: 예외함·설정 (KAN-353) =====
// 백엔드 AdminDiningController(KAN-348) 계약. 시각은 LocalDateTime ISO 문자열.
export type DiningExceptionType = 'PAYMENT' | 'DATA' | 'VENUE' | 'NOTIFICATION' | 'SAFETY' | 'CONFLICT' | 'REFUND'
export type DiningExceptionStatus = 'OPEN' | 'RESOLVED'
// WARN=기록만, RESTRICT/BAN=우연한 식탁 참여 자격 RESTRICTED
export type DiningSafetyAction = 'WARN' | 'RESTRICT' | 'BAN'

// GET /api/admin/dining/exceptions — 전체 회차 횡단, 최신순
export interface DiningExceptionCase {
  id: string
  type: DiningExceptionType
  status: DiningExceptionStatus
  sessionId: string | null
  // 현재는 매칭 그룹 ID
  tableId: string | null
  applicationId: string | null
  reason: string
  action: DiningSafetyAction | null
  resolvedBy: string | null
  resolutionNote: string | null
  createdAt: string
  resolvedAt: string | null
}

// PATCH /api/admin/dining/exceptions/{id} — RESOLVED면 note 필수, action은 SAFETY만
export interface DiningExceptionStatusRequest {
  status: DiningExceptionStatus
  note?: string
  action?: DiningSafetyAction
}

export interface DiningMatchingWeights {
  gender: number
  mbti: number
  interests: number
  wantedStyle: number
  custom: number
}

// GET/PUT /api/admin/dining/settings/matching-rules — 요청·응답 같은 모양(PUT은 전체 교체)
export interface DiningMatchingRules {
  maxAgeGap: number
  tableSizeMin: number
  tableSizeMax: number
  minGroupScore: number
  autoConfirmGraceMinutes: number
  weights: DiningMatchingWeights
}

// GET /api/admin/dining/venues — 삭제되지 않은 식당, 지역·이름 순
export interface DiningVenue {
  id: string
  name: string
  address: string
  mapUrl: string | null
  priceRange: string | null
  region: string
  isActive: boolean
}

// POST /venues, PUT /venues/{id} (전체 교체)
export type DiningVenueRequest = Omit<DiningVenue, 'id'>

// PUT /api/admin/dining/tables/{id}/venue
export interface DiningTableVenueResponse {
  tableId: string
  venue: DiningVenue
}

// ===== 채팅 (KAN-332) =====
// 백엔드(KAN-328) 계약: docs chat-design 5절. 모든 시각은 ISO 문자열.
export type ChatRoomType = 'INQUIRY' | 'GROUP'
export type ChatMessageType = 'TEXT' | 'IMAGE' | 'SYSTEM'
// SYSTEM_NOTICE: 서버가 남기는 안내문(우연한 식탁 확정 안내 등)
export type ChatSystemKind = 'JOINED' | 'KICKED' | 'NOTICE_SET' | 'SYSTEM_NOTICE'

// BE ChatMessage.system 호출부 기준. JOINED·KICKED·NOTICE_SET → nicknames(탈퇴 회원은 null), SYSTEM_NOTICE → text
export interface ChatSystemParams {
  nicknames?: (string | null)[]
  text?: string
}

// BE ChatMessageResponse.Sender. 탈퇴 회원은 nickname 이 null. 문의방에서 관리자는 사용자에게 nickname "와썹하우스"로 내려온다.
// Lombok boolean isAdmin → JSON "admin"
export interface ChatSender {
  id: string
  nickname: string | null
  admin: boolean
}

export interface ChatLinkPreview {
  url: string
  title: string | null
  description: string | null
  image: string | null
}

// Lombok boolean isMine → JSON "mine"
export interface ChatReaction {
  emoji: string
  count: number
  // 내가 누른 리액션인지
  mine: boolean
}

// BE ChatMessageResponse. Lombok boolean isEdited/isDeleted → JSON "edited"/"deleted"
export interface ChatMessage {
  id: string
  roomId: string
  type: ChatMessageType
  // SYSTEM 이면 null
  sender: ChatSender | null
  // TEXT 본문. 삭제·IMAGE·SYSTEM 이면 null
  content: string | null
  // IMAGE 서명 URL(1시간 유효). 그 외 null
  imageUrl: string | null
  systemKind: ChatSystemKind | null
  systemParams: ChatSystemParams | null
  linkPreview: ChatLinkPreview | null
  reactions: ChatReaction[]
  // 이 메시지를 아직 안 읽은 멤버 수 (카톡식)
  unreadCount: number
  edited: boolean
  deleted: boolean
  createdAt: string
}

// 방 목록 미리보기용 마지막 메시지 (BE ChatLastMessageResponse). Lombok boolean isDeleted → JSON "deleted"
export interface ChatLastMessage {
  id: string
  type: ChatMessageType
  senderId: string | null
  // TEXT 본문. IMAGE·SYSTEM·삭제면 null
  content: string | null
  systemKind: ChatSystemKind | null
  systemParams: ChatSystemParams | null
  deleted: boolean
  createdAt: string
}

// GET /api/chat/rooms — 서버가 최근 메시지 순으로 정렬, hidden 제외
export interface ChatRoomSummary {
  id: string
  type: ChatRoomType
  name: string
  memberCount: number
  lastMessage: ChatLastMessage | null
  unreadCount: number
}

// BE ChatRoomDetailResponse.Member. Lombok boolean isAdmin → JSON "admin"
export interface ChatMember {
  userId: string
  nickname: string | null
  admin: boolean
}

// BE ChatRoomDetailResponse.Permissions. Lombok boolean isMuted/isAdmin → JSON "muted"/"admin"
export interface ChatRoomPermissions {
  // 멤버 & 미뮤트 & 계정 정상
  canSend: boolean
  muted: boolean
  canLeave: boolean
  canHide: boolean
  admin: boolean
}

// GET /api/chat/rooms/{id} (BE ChatRoomDetailResponse)
export interface ChatRoomDetail {
  id: string
  type: ChatRoomType
  // INQUIRY 를 관리자가 볼 때 문의자가 탈퇴했으면 null
  name: string | null
  sourceType: ChatSourceType | null
  sourceId: string | null
  memberCount: number
  members: ChatMember[]
  // 없거나 삭제됐으면 null
  notice: ChatMessage | null
  permissions: ChatRoomPermissions
}

export interface ChatSendMessageRequest {
  type: 'TEXT' | 'IMAGE'
  // TEXT: 본문, IMAGE: 업로드 응답의 path
  content: string
}

export interface ChatInquiryRoomResponse {
  roomId: string
}

export interface ChatImageUploadResponse {
  path: string
}

// 클라이언트 전용: 낙관적 전송 대기열 항목 (서버 응답 전까지 반투명 표시)
export interface ChatOutgoingMessage {
  tempId: string
  type: 'TEXT' | 'IMAGE'
  // TEXT: 본문, IMAGE: 로컬 미리보기 object URL
  content: string
  image: Blob | null
  createdAt: string
  failed: boolean
}

// ===== 채팅 소켓 (KAN-333) =====
// GET /api/chat/socket-token — STOMP CONNECT 의 Authorization: Bearer 헤더용 단기 토큰
export interface ChatSocketTokenResponse {
  token: string
  // 수명(초). 기본 120
  expiresIn: number
}

// /topic/rooms/{roomId} 이벤트 봉투 (BE ChatSocketEventResponse). 메시지 페이로드는 방 전체에 한 번 보내는 뷰어 중립 값이다.
export type ChatSocketEvent =
  | { kind: 'MESSAGE_CREATED' | 'MESSAGE_UPDATED' | 'MESSAGE_DELETED' | 'REACTION_CHANGED'; roomId: string; payload: ChatMessage }
  | { kind: 'READ'; roomId: string; payload: { userId: string; messageId: string } }
  // 해제면 null
  | { kind: 'NOTICE_CHANGED'; roomId: string; payload: ChatMessage | null }
  | { kind: 'MEMBER_CHANGED'; roomId: string; payload: { userIds: string[] } }

// /user/queue/rooms — 새 메시지가 생긴 방의 목록 미리보기 (봉투 없음, BE ChatRoomPreviewResponse)
export interface ChatRoomPreviewEvent {
  roomId: string
  lastMessage: ChatLastMessage
  unreadCount: number
}

// ===== 채팅 웹 푸시 (KAN-336) =====
export interface ChatPushPublicKeyResponse {
  // VAPID 공개키(base64url). PushManager.subscribe 의 applicationServerKey 로 쓴다.
  publicKey: string
}

// PushSubscription.toJSON() 형태
export interface ChatPushSubscriptionRequest {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// ===== 관리자 채팅 (KAN-334) =====
// 백엔드 AdminChatController 실제 계약. Lombok boolean isX 필드는 JSON 에서 x 로 직렬화된다(isUnanswered → unanswered).
export type ChatSourceType = 'GATHERING' | 'DINING_TABLE'
export type ChatReportStatus = 'OPEN' | 'RESOLVED'

// GET /api/admin/chat/rooms — 전체 방
export interface AdminChatRoomSummary {
  id: string
  type: ChatRoomType
  // GROUP: 방 이름, INQUIRY: 문의자 닉네임(탈퇴 시 null)
  name: string | null
  sourceType: ChatSourceType | null
  sourceId: string | null
  memberCount: number
  lastMessage: ChatLastMessage | null
  unreadCount: number
  // 문의방 미답변(마지막 메시지를 문의자가 보냄)
  unanswered: boolean
  // 내가 참여 중인지. 미참여 단체방은 멤버 API 로 먼저 들어가야 방을 볼 수 있다.
  member: boolean
}

// POST /api/admin/chat/rooms — 생성한 관리자는 서버가 자동 포함
export interface AdminChatRoomCreateRequest {
  name: string
  memberIds: string[]
  sourceType?: ChatSourceType
  sourceId?: string
}

export type ChatRoomIdResponse = ChatInquiryRoomResponse

// GET /api/admin/chat/rooms/source-members — 게더링 참가 확정자 / 매칭 조원
export interface ChatSourceMember {
  userId: string
  nickname: string
}

// GET /api/admin/chat/reports
export interface AdminChatReport {
  id: string
  roomId: string
  messageId: string
  reporterId: string
  reporterNickname: string | null
  reason: string
  status: ChatReportStatus
  createdAt: string
  messageType: ChatMessageType
  messageSenderId: string | null
  messageSenderNickname: string | null
  // 검토용 TEXT 원문(삭제된 메시지 포함). IMAGE·SYSTEM 은 null
  messageContent: string | null
  messageDeleted: boolean
}
