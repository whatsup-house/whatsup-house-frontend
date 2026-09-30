import type { Page, Route } from '@playwright/test'
import dayjs from 'dayjs'
import type {
  ApplicationListItem,
  ApplicationSubmitResponse,
  DiningAdminTable,
  DiningApplicant,
  DiningApplicationItem,
  DiningAttendanceRow,
  DiningDashboard,
  DiningExceptionCase,
  DiningFeedbackSummary,
  DiningHistoryItem,
  DiningMatchRun,
  DiningMatchingRules,
  DiningPrefillResponse,
  DiningResolution,
  DiningSessionInfo,
  DiningTableDetail,
  DiningTableList,
  DiningTableMember,
  DiningVenue,
  GatheringDetail,
  GatheringForm,
  GatheringSession,
  MyTickets,
} from '@/lib/api/types'
import { apiRes, mockAdminProfile, mockUserProfile } from './mocks'

// ─── 우연한 식탁 E2E 목 (KAN-357) ──────────────────────────────────────────────
// PRD 18장 데모 시나리오: 참가자 12명 → 종류 1 + 회차 2 → 매칭(테이블 2 + 미배정 1) → 확정 → 식당 배정 → 참석·피드백.
// 날짜는 실행 시각 기준 상대값이다(회차는 항상 "다가오는 회차", 체크인 창은 "지금").

const day = (offset: number) => dayjs().add(offset, 'day').format('YYYY-MM-DD')
const at = (date: string, time: string) => `${date}T${time}`
const nowIso = () => dayjs().format('YYYY-MM-DDTHH:mm:ss')

export const DINING_TITLE = '우연한 저녁 식탁'
export const DINING_GATHERING_ID = 'c3000000-0000-0000-0000-000000000001'
export const DINING_SESSION_ID = 'c3100000-0000-0000-0000-000000000001'
export const DINING_SESSION_2_ID = 'c3100000-0000-0000-0000-000000000002'
// 어드민 카드 라벨은 id 앞 4자리(#a1f0, #b2e0)라 앞자리를 다르게 둔다
export const DINING_TABLE_A_ID = 'a1f00000-0000-0000-0000-000000000001'
export const DINING_TABLE_B_ID = 'b2e00000-0000-0000-0000-000000000002'
export const DINING_APPLICATION_ID = 'd3000000-0000-0000-0000-000000000001'
export const DINING_RESOLUTION_ID = 'd4000000-0000-0000-0000-000000000001'
export const DINING_CHAT_ROOM_ID = 'd1000000-0000-0000-0000-000000000357'
export const DINING_VENUE_CASE_ID = 'e3000000-0000-0000-0000-000000000001'

export const DINING_SESSION_DATE = day(7)
export const DINING_SESSION_2_DATE = day(14)

// ─── 참가자 12명 (서로 다른 출생연도·MBTI, 성별 6:6) ─────────────────────────────

export interface DiningParticipant {
  userId: string
  applicationId: string
  memberId: string
  nickname: string
  birthYear: number
  gender: 'MALE' | 'FEMALE'
  mbti: string
  interests: string[]
}

const participant = (
  n: number,
  nickname: string,
  birthYear: number,
  gender: DiningParticipant['gender'],
  mbti: string,
  interests: string[],
): DiningParticipant => {
  const suffix = String(n).padStart(12, '0')
  return {
    // 1번은 로그인 회원(mockUserProfile)
    userId: n === 1 ? mockUserProfile.id : `b3000000-0000-0000-0000-${suffix}`,
    applicationId: n === 1 ? DINING_APPLICATION_ID : `d3100000-0000-0000-0000-${suffix}`,
    memberId: `f3000000-0000-0000-0000-${suffix}`,
    nickname,
    birthYear,
    gender,
    mbti,
    interests,
  }
}

export const DINING_PARTICIPANTS: DiningParticipant[] = [
  participant(1, mockUserProfile.nickname, 1999, 'FEMALE', 'INFP', ['독서·글쓰기', '전시·공연·아트']),
  participant(2, '준서', 1996, 'MALE', 'ENTP', ['운동 (헬스, 러닝, 클라이밍 등)', '여행']),
  participant(3, '서연', 1998, 'FEMALE', 'ISFJ', ['맛집·카페 탐방', '사진·영상']),
  participant(4, '도윤', 1994, 'MALE', 'ESTJ', ['자기계발·공부', '운동 (헬스, 러닝, 클라이밍 등)']),
  participant(5, '하은', 2000, 'FEMALE', 'ENFP', ['음악', '영화·드라마']),
  participant(6, '민재', 1997, 'MALE', 'INTJ', ['독서·글쓰기', '자기계발·공부']),
  participant(7, '지아', 1995, 'FEMALE', 'ESFP', ['패션·뷰티', '맛집·카페 탐방']),
  participant(8, '현우', 1993, 'MALE', 'ISTP', ['여행', '사진·영상']),
  participant(9, '수아', 2001, 'FEMALE', 'INFJ', ['전시·공연·아트', '음악']),
  participant(10, '예준', 1992, 'MALE', 'ENFJ', ['영화·드라마', '맛집·카페 탐방']),
  participant(11, '채원', 1991, 'FEMALE', 'ISTJ', ['독서·글쓰기', '여행']),
  participant(12, '태오', 1985, 'MALE', 'ESTP', ['운동 (헬스, 러닝, 클라이밍 등)', '음악']),
]

// 매칭 결과: A 6명 · B 5명 · 미배정 1명(나이 차 초과 → 대체 회차 제안)
export const TABLE_A_MEMBERS = DINING_PARTICIPANTS.slice(0, 6)
export const TABLE_B_MEMBERS = DINING_PARTICIPANTS.slice(6, 11)
export const UNASSIGNED_PARTICIPANT = DINING_PARTICIPANTS[11]

// ─── 종류 1 + 회차 2 ─────────────────────────────────────────────────────────

const session = (
  id: string,
  eventDate: string,
  [startTime, endTime]: [string, string],
  location: { id: string; name: string; address: string },
): GatheringSession => ({
  id,
  eventDate,
  startTime,
  endTime,
  location: { ...location, naverMapUrl: null, kakaoMapUrl: null },
  maxAttendees: 12,
  price: null,
  applyDeadlineAt: null,
  status: 'OPEN',
  confirmedCount: 0,
  matchRunAt: at(dayjs(eventDate).subtract(2, 'day').format('YYYY-MM-DD'), '20:00:00'),
  autoConfirmGraceMinutes: 30,
  tableSizeMin: 4,
  tableSizeMax: 6,
  minGroupScore: null,
  maxAgeGap: null,
})

export const mockDiningSessions: GatheringSession[] = [
  session(DINING_SESSION_ID, DINING_SESSION_DATE, ['19:00:00', '21:00:00'],
    { id: 'a3000000-0000-0000-0000-000000000001', name: '성수', address: '서울 성동구 성수동' }),
  session(DINING_SESSION_2_ID, DINING_SESSION_2_DATE, ['12:30:00', '14:30:00'],
    { id: 'a3000000-0000-0000-0000-000000000002', name: '을지로', address: '서울 중구 을지로' }),
]

export const mockDiningGathering: GatheringDetail = {
  id: DINING_GATHERING_ID,
  title: DINING_TITLE,
  description: '처음 만난 4~6명이 한 테이블에서 저녁을 함께해요. 멤버와 식당은 와썹하우스가 매칭해 드려요.',
  howToRun: ['희망 날짜 선택', '매칭', '테이블 확정', '식사'],
  tags: ['우연한 식탁'],
  thumbnailUrl: '/home/home-1.png',
  gatheringType: 'RANDOM_TABLE',
  basePrice: 25000,
  sessions: mockDiningSessions,
}

// 참가자 API 의 회차 요약
export const toSessionInfo = (s: GatheringSession): DiningSessionInfo => ({
  id: s.id,
  eventDate: s.eventDate,
  startTime: s.startTime,
  region: s.location?.name ?? null,
  matchRunAt: s.matchRunAt ?? null,
})
export const DINING_SESSION_INFOS = mockDiningSessions.map(toSessionInfo)

// ─── 표준 폼 (BE V6 시드와 같은 질문 키) + 프리필 + 이용권 ──────────────────────────

const STYLE_CHOICES = ['잔잔하고 조용한 편', '활기차고 에너지 있는 편', '깊은 대화를 좋아함', '가볍고 유머 있는 대화를 좋아함', '경청을 잘 함', '이야기를 이끄는 편']

export const mockDiningForm: GatheringForm = {
  formId: 'f6000000-0000-0000-0000-000000000357',
  gatheringId: DINING_GATHERING_ID,
  guideText: '매칭에 쓰이는 표준 질문이에요. 지난번 답변을 불러왔어요.',
  questions: [
    { questionId: 'q-birth-year', questionKey: 'birth_year', type: 'NUMBER', label: '출생연도', placeholder: '예: 1995', required: true, displayOrder: 0, options: null, validation: null, systemReserved: false },
    { questionId: 'q-gender', questionKey: 'gender', type: 'SINGLE_CHOICE', label: '성별', placeholder: null, required: true, displayOrder: 1, options: { choices: ['MALE', 'FEMALE'] }, validation: null, systemReserved: false },
    { questionId: 'q-mbti', questionKey: 'mbti', type: 'MBTI_INPUT', label: 'MBTI', placeholder: null, required: true, displayOrder: 2, options: null, validation: null, systemReserved: false },
    {
      questionId: 'q-interests', questionKey: 'interests', type: 'MULTI_CHOICE', label: '나의 요즘 관심사는? (복수 선택)', placeholder: null, required: true, displayOrder: 3,
      options: { choices: ['영화·드라마', '음악', '독서·글쓰기', '운동 (헬스, 러닝, 클라이밍 등)', '맛집·카페 탐방', '여행', '사진·영상', '전시·공연·아트', '패션·뷰티', '자기계발·공부'] },
      validation: null, systemReserved: false,
    },
    { questionId: 'q-my-style', questionKey: 'my_style', type: 'MULTI_CHOICE', label: '나는 어떤 사람인가요? (복수 선택)', placeholder: null, required: true, displayOrder: 4, options: { choices: STYLE_CHOICES }, validation: null, systemReserved: false },
    { questionId: 'q-wanted-style', questionKey: 'wanted_style', type: 'MULTI_CHOICE', label: '어떤 사람과 같은 테이블에 앉고 싶으신가요? (복수 선택)', placeholder: null, required: true, displayOrder: 5, options: { choices: STYLE_CHOICES }, validation: null, systemReserved: false },
    { questionId: 'q-diet', questionKey: 'diet', type: 'SHORT_TEXT', label: '못 먹는 음식이나 식이 제한이 있다면 알려주세요', placeholder: '예: 갑각류 알레르기, 채식', required: false, displayOrder: 6, options: null, validation: null, systemReserved: false },
  ],
}

const me = DINING_PARTICIPANTS[0]
export const mockDiningPrefill: DiningPrefillResponse = {
  answers: [
    { reservedKey: 'BIRTH_YEAR', questionKey: 'birth_year', value: me.birthYear },
    { reservedKey: 'GENDER', questionKey: 'gender', value: me.gender },
    { reservedKey: 'MBTI', questionKey: 'mbti', value: me.mbti },
    { reservedKey: 'INTERESTS', questionKey: 'interests', value: me.interests },
    { reservedKey: 'MY_STYLE', questionKey: 'my_style', value: ['깊은 대화를 좋아함', '경청을 잘 함'] },
    { reservedKey: 'WANTED_STYLE', questionKey: 'wanted_style', value: ['가볍고 유머 있는 대화를 좋아함'] },
  ],
}

export const mockDiningTickets: MyTickets = {
  accountStatus: 'ACTIVE',
  randomTableEligibility: 'APPROVED',
  purchasable: true,
  totalRemaining: 3,
  passes: [{
    id: 'e4000000-0000-0000-0000-000000000001',
    applicationId: null,
    productId: null,
    product: 'RANDOM_TABLE_FOUR',
    productLabel: '4회권',
    totalCount: 4,
    remainingCount: 3,
    status: 'ACTIVE',
    createdAt: at(day(-30), '10:00:00'),
    activatedAt: at(day(-30), '12:00:00'),
    purchaseAmount: 90000,
    paymentDeadline: null,
    paymentConfirmedAt: at(day(-30), '12:00:00'),
  }],
  applicationId: null,
  gatheringId: null,
}

export const mockDiningSubmitResult: ApplicationSubmitResponse = {
  id: DINING_APPLICATION_ID,
  bookingNumber: 'WH26RT000357',
  gatheringId: DINING_GATHERING_ID,
  status: 'CONFIRMED', // 이용권 차감 완료 → 매칭 대기
  createdAt: nowIso(),
}

// ─── 참가자 상태 카드 / 테이블 상세 / 이력 ──────────────────────────────────────

export const diningApplication = (overrides: Partial<DiningApplicationItem> = {}): DiningApplicationItem => ({
  id: DINING_APPLICATION_ID,
  gathering: { id: DINING_GATHERING_ID, title: DINING_TITLE },
  candidateSessions: DINING_SESSION_INFOS,
  assignedSession: null,
  status: 'CONFIRMED',
  matchStatus: 'WAITING',
  ticketStatus: 'DEDUCTED',
  table: null,
  resolutionId: null,
  ...overrides,
})

// 마이페이지 신청 목록 한 줄 — 우연한 식탁 신청이면 상태 카드로 바뀐다
const toApplicationListItem = (item: DiningApplicationItem): ApplicationListItem => ({
  id: item.id,
  bookingNumber: mockDiningSubmitResult.bookingNumber,
  status: item.status,
  paymentStatus: null,
  gathering: { id: item.gathering.id, title: item.gathering.title, eventDate: item.assignedSession?.eventDate ?? null, thumbnailUrl: mockDiningGathering.thumbnailUrl, gatheringType: 'RANDOM_TABLE' },
  createdAt: at(day(-3), '10:00:00'),
})

export const mockDiningResolution: DiningResolution = {
  id: DINING_RESOLUTION_ID,
  applicationId: DINING_APPLICATION_ID,
  offeredSessions: [{ ...DINING_SESSION_INFOS[1], endTime: mockDiningSessions[1].endTime }],
  choice: null,
  respondBy: at(day(3), '23:59:00'),
  status: 'OFFERED',
}

export const mockDiningVenues: DiningVenue[] = [
  { id: 'e5000000-0000-0000-0000-000000000001', name: '성수 소반', address: '서울 성동구 연무장길 12', mapUrl: 'https://naver.me/soban', priceRange: '2~3만원', region: '성수', isActive: true },
  { id: 'e5000000-0000-0000-0000-000000000002', name: '뚝섬 오븐', address: '서울 성동구 서울숲길 45', mapUrl: null, priceRange: '3~4만원', region: '성수', isActive: true },
  { id: 'e5000000-0000-0000-0000-000000000003', name: '을지로 한상', address: '서울 중구 을지로 150', mapUrl: null, priceRange: '2~3만원', region: '을지로', isActive: false },
]
export const [VENUE_SOBAN, VENUE_OVEN] = mockDiningVenues

export const diningTableDetail = (overrides: Partial<DiningTableDetail> = {}): DiningTableDetail => ({
  id: DINING_TABLE_A_ID,
  status: 'CONFIRMED',
  session: { eventDate: DINING_SESSION_DATE, startTime: '19:00:00', endTime: '21:00:00', region: '성수' },
  venue: { name: VENUE_SOBAN.name, address: VENUE_SOBAN.address, mapUrl: VENUE_SOBAN.mapUrl, priceRange: VENUE_SOBAN.priceRange },
  chatRoomId: DINING_CHAT_ROOM_ID,
  members: TABLE_A_MEMBERS.map(({ userId, nickname, mbti, interests }) => ({ userId, nickname, mbti, interests })),
  cancelPolicy: '회차 시작 2일 전까지 취소하면 이용권을 돌려드려요.\n그 이후 취소·노쇼는 이용권이 차감돼요.',
  myAttendance: { status: 'SCHEDULED', checkedInAt: null },
  ...overrides,
})

// 체크인 창(시작 ±2시간) 안: 오늘, 지금 시작하는 회차
export const checkInOpenSession = (): DiningTableDetail['session'] => ({
  eventDate: dayjs().format('YYYY-MM-DD'),
  startTime: dayjs().format('HH:mm:00'),
  endTime: dayjs().add(2, 'hour').format('HH:mm:00'),
  region: '성수',
})

// 피드백이 열린 회차: 어제 끝난 테이블
export const finishedSession = (): DiningTableDetail['session'] => ({
  eventDate: day(-1), startTime: '19:00:00', endTime: '21:00:00', region: '성수',
})

const mockDiningHistory = (feedbackSubmitted: boolean): DiningHistoryItem[] => [
  { tableId: DINING_TABLE_A_ID, sessionId: DINING_SESSION_ID, eventDate: day(-1), region: '성수', venueName: VENUE_SOBAN.name, tableStatus: 'DONE', feedbackSubmitted, attendanceStatus: 'ATTENDED' },
  { tableId: 'a0000000-0000-0000-0000-000000000099', sessionId: 'c3100000-0000-0000-0000-000000000099', eventDate: day(-35), region: '을지로', venueName: '을지로 한상', tableStatus: 'DONE', feedbackSubmitted: true, attendanceStatus: null },
]

// ─── 라우팅 헬퍼 ─────────────────────────────────────────────────────────────

export function apiError(status: number, code: string, message: string, params?: Record<string, unknown>) {
  return { status, json: { success: false, code, message, data: null, ...(params && { params }) } }
}

// 경로가 정확히 같은 API 요청만 가로챈다(쿼리 무시). 페이지 URL(/dining/...)과 겹치지 않게 /api 로 시작하는 경로만 쓴다.
const onApi = (page: Page, path: string | RegExp, handler: (route: Route) => unknown) =>
  page.route((url) => (typeof path === 'string' ? url.pathname === path : path.test(url.pathname)), async (route) => {
    await handler(route)
  })

// 목을 안 건 API 가 로컬 백엔드(8080)로 새지 않게 404 로 막는다. 다른 route 보다 먼저 등록해야 한다(나중 등록이 우선).
export async function blockUnmockedApis(page: Page) {
  await page.route('**/api/**', (route) => route.fulfill(apiError(404, 'NOT_MOCKED', '목 없음')))
}

// 종류 페이지 → 신청 3단계에 필요한 조회
export async function mockDiningApplyApis(page: Page) {
  await onApi(page, `/api/gatherings/${DINING_GATHERING_ID}`, (route) => route.fulfill({ json: apiRes(mockDiningGathering) }))
  await onApi(page, `/api/gatherings/${DINING_GATHERING_ID}/form`, (route) => route.fulfill({ json: apiRes(mockDiningForm) }))
  await onApi(page, '/api/dining/prefill', (route) => route.fulfill({ json: apiRes(mockDiningPrefill) }))
  await onApi(page, '/api/tickets/me', (route) => route.fulfill({ json: apiRes(mockDiningTickets) }))
}

// 마이페이지 신청 목록 + 우연한 식탁 상태. getItems 가 바뀌면 다음 조회부터 반영된다.
export async function mockMyDiningApplications(page: Page, getItems: () => DiningApplicationItem[]) {
  await onApi(page, '/api/applications', (route) => {
    if (route.request().method() === 'POST') return route.fulfill({ json: apiRes(mockDiningSubmitResult) })
    return route.fulfill({ json: apiRes(getItems().map(toApplicationListItem)) })
  })
  await onApi(page, '/api/dining/me/applications', (route) => route.fulfill({ json: apiRes({ applications: getItems() }) }))
  await onApi(page, `/api/dining/resolutions/${DINING_RESOLUTION_ID}`, (route) => route.fulfill({ json: apiRes(mockDiningResolution) }))
  await onApi(page, `/api/dining/resolutions/${DINING_RESOLUTION_ID}/choose`, (route) => route.fulfill({ json: apiRes(null) }))
  await onApi(page, /^\/api\/dining\/applications\/[^/]+\/cancel$/, (route) => route.fulfill({ json: apiRes(null) }))
}

// 테이블 상세·체크인·피드백·신고·참가 이력. 체크인·피드백 성공은 이후 조회에 반영된다.
export async function mockDiningTableApis(page: Page, initial: DiningTableDetail) {
  let detail = initial
  let feedbackSubmitted = false
  const base = `/api/dining/tables/${initial.id}`

  await onApi(page, base, (route) => route.fulfill({ json: apiRes(detail) }))
  await onApi(page, `${base}/check-in`, (route) => {
    detail = { ...detail, myAttendance: { status: 'ATTENDED', checkedInAt: nowIso() } }
    return route.fulfill({ json: apiRes(detail.myAttendance) })
  })
  await onApi(page, `${base}/feedback`, (route) => {
    feedbackSubmitted = true
    return route.fulfill({ json: apiRes(null) })
  })
  await onApi(page, `${base}/reports`, (route) => route.fulfill({ json: apiRes(null) }))
  await onApi(page, '/api/dining/me/history', (route) => route.fulfill({ json: apiRes(mockDiningHistory(feedbackSubmitted)) }))
}

// ─── 어드민: 대시보드 · 회차 콘솔 · 예외함 · 설정 ─────────────────────────────────

export const mockDiningDashboard: DiningDashboard = {
  upcomingSessionCount: 2,
  waitingApplicantCount: 12,
  paidApplicantCount: 12,
  proposedTableCount: 0,
  confirmedTableCount: 0,
  openExceptionCount: 1,
  sessions: mockDiningSessions.map((s, i) => ({
    sessionId: s.id,
    gatheringId: DINING_GATHERING_ID,
    title: DINING_TITLE,
    eventDate: s.eventDate,
    startTime: s.startTime,
    locationName: s.location?.name ?? null,
    status: s.status,
    paidCount: i === 0 ? 12 : 3,
    maxAttendees: s.maxAttendees,
    matchRunAt: s.matchRunAt ?? null,
    isMatchRunDone: false,
    tableCount: 0,
    openExceptionCount: i === 0 ? 1 : 0,
  })),
}

const toApplicant = (p: DiningParticipant): DiningApplicant => ({
  applicationId: p.applicationId,
  userId: p.userId,
  name: p.nickname,
  age: String(dayjs().year() - p.birthYear),
  gender: p.gender,
  mbti: p.mbti,
  status: 'CONFIRMED',
  isPaid: true,
  matchStatus: 'WAITING',
  candidateSessions: [{ sessionId: DINING_SESSION_ID, eventDate: DINING_SESSION_DATE, priority: 1 }],
  participationCount: p.birthYear % 3,
  hasExcludedRelation: false,
})

const toMember = (p: DiningParticipant): DiningTableMember => ({
  memberId: p.memberId,
  applicationId: p.applicationId,
  userId: p.userId,
  nickname: p.nickname,
  birthYear: p.birthYear,
  gender: p.gender,
  mbti: p.mbti,
  assignReason: 'INITIAL',
  isManual: false,
})

const proposedTable = (id: string, members: DiningParticipant[], groupScore: number): DiningAdminTable => ({
  id,
  status: 'PROPOSED',
  groupScore,
  scoreDetail: { pairAvg: groupScore + 0.05, pairMin: groupScore - 0.2, penalties: null },
  confirmAt: dayjs().add(30, 'minute').format('YYYY-MM-DDTHH:mm:ss'),
  locked: false,
  venueId: null,
  members: members.map(toMember),
  chatRoomId: null,
})

export const mockMatchRun = (): DiningMatchRun => ({
  id: 'e6000000-0000-0000-0000-000000000001',
  startedAt: nowIso(),
  finishedAt: nowIso(),
  triggeredBy: mockAdminProfile.id,
  candidateCount: 12,
  tableCount: 2,
  splitCount: 0,
  mergeCount: 0,
  reallocatedCount: 0,
  unassignedCount: 1,
  algorithmVersion: 'rule-v2',
})

// "지금 매칭 실행" 결과: 테이블 2개 제안 + 미배정 1명
export const matchedTableList = (): DiningTableList => ({
  tables: [proposedTable(DINING_TABLE_A_ID, TABLE_A_MEMBERS, 0.78), proposedTable(DINING_TABLE_B_ID, TABLE_B_MEMBERS, 0.71)],
  unassigned: [{ applicationId: UNASSIGNED_PARTICIPANT.applicationId, nickname: UNASSIGNED_PARTICIPANT.nickname, reason: 'AGE_GAP' }],
  lastRun: mockMatchRun(),
})

export const mockDiningAttendance: DiningAttendanceRow[] = [...TABLE_A_MEMBERS, ...TABLE_B_MEMBERS].map((p, i) => ({
  attendanceId: `e7000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
  memberId: p.memberId,
  nickname: p.nickname,
  // 마지막 1명은 체크인 없음 → 노쇼 후보
  status: i < 10 ? 'ATTENDED' : 'SCHEDULED',
  checkedInAt: i < 10 ? at(DINING_SESSION_DATE, '18:5' + (i % 10) + ':00') : null,
  noShowCandidate: i >= 10,
}))

export const mockDiningFeedbackSummary: DiningFeedbackSummary = {
  responseCount: 9,
  memberCount: 11,
  responseRate: 9 / 11,
  avgTable: 4.2,
  avgTalk: 4.4,
  avgVenue: 3.9,
  rejoinYes: 6,
  rejoinMaybe: 2,
  rejoinNo: 1,
  reportCount: 1,
  byTable: [
    { tableId: DINING_TABLE_A_ID, responseCount: 5, avgTable: 4.4, avgTalk: 4.6, avgVenue: 4.0 },
    { tableId: DINING_TABLE_B_ID, responseCount: 4, avgTable: 4.0, avgTalk: 4.2, avgVenue: 3.8 },
  ],
}

export const mockVenueException: DiningExceptionCase = {
  id: DINING_VENUE_CASE_ID,
  type: 'VENUE',
  status: 'OPEN',
  sessionId: DINING_SESSION_ID,
  tableId: DINING_TABLE_B_ID,
  applicationId: null,
  reason: '#b2e0 테이블: 확정됐지만 회차 식당 풀에 남은 자리가 없어 식당을 배정하지 못했어요.',
  action: null,
  resolvedBy: null,
  resolutionNote: null,
  createdAt: nowIso(),
  resolvedAt: null,
}

export const mockMatchingRules: DiningMatchingRules = {
  maxAgeGap: 7,
  tableSizeMin: 4,
  tableSizeMax: 6,
  minGroupScore: 0.35,
  autoConfirmGraceMinutes: 30,
  weights: { gender: 1, mbti: 1, interests: 1, wantedStyle: 1, custom: 0.5 },
}

interface AdminDiningMockOptions {
  matched?: boolean // true 면 매칭 실행 후(테이블 2개 제안) 상태로 시작
}

// 어드민 우연한 식탁 API. 매칭 실행·이동·즉시 확정·식당 배정·예외 처리·규칙 저장은 서버처럼 상태에 반영된다.
export async function mockAdminDiningApis(page: Page, { matched = false }: AdminDiningMockOptions = {}) {
  let tableList: DiningTableList = matched ? matchedTableList() : { tables: [], unassigned: [], lastRun: null }
  let exceptions: DiningExceptionCase[] = [mockVenueException]
  let rules = mockMatchingRules
  const sessionPath = `/api/admin/dining/sessions/${DINING_SESSION_ID}`
  const updateTable = (id: string, update: (table: DiningAdminTable) => DiningAdminTable) => {
    tableList = { ...tableList, tables: tableList.tables.map((t) => (t.id === id ? update(t) : t)) }
    return tableList.tables.find((t) => t.id === id)
  }

  await onApi(page, '/api/admin/dining/dashboard', (route) => route.fulfill({ json: apiRes(mockDiningDashboard) }))
  // 회차 ID 로 조회해도 종류 상세 + 전체 회차로 응답한다
  await onApi(page, /^\/api\/admin\/gatherings\/[^/]+$/, (route) => route.fulfill({ json: apiRes(mockDiningGathering) }))

  await onApi(page, `${sessionPath}/applicants`, (route) => {
    const unassignedIds = new Set(tableList.unassigned.map((u) => u.applicationId))
    const confirmed = tableList.tables.length > 0 && tableList.tables.every((t) => t.status === 'CONFIRMED')
    return route.fulfill({
      json: apiRes(DINING_PARTICIPANTS.map((p): DiningApplicant => ({
        ...toApplicant(p),
        matchStatus: !tableList.lastRun ? 'WAITING' : unassignedIds.has(p.applicationId) ? 'ALTERNATIVE_OFFERED' : confirmed ? 'CONFIRMED' : 'MATCHING',
      }))),
    })
  })
  await onApi(page, `${sessionPath}/match-runs`, (route) => {
    tableList = matchedTableList()
    return route.fulfill({ json: apiRes(tableList.lastRun) })
  })
  await onApi(page, `${sessionPath}/tables`, (route) => route.fulfill({ json: apiRes(tableList) }))
  await onApi(page, `${sessionPath}/attendance`, (route) => route.fulfill({ json: apiRes(mockDiningAttendance) }))
  await onApi(page, `${sessionPath}/feedback-summary`, (route) => route.fulfill({ json: apiRes(mockDiningFeedbackSummary) }))

  await onApi(page, /^\/api\/admin\/dining\/tables\/[^/]+\/members\/[^/]+\/move$/, (route) => {
    const parts = new URL(route.request().url()).pathname.split('/') // /api/admin/dining/tables/{id}/members/{memberId}/move
    const fromId = parts[5]
    const memberId = parts[7]
    const { targetTableId } = route.request().postDataJSON() as { targetTableId: string }
    const member = tableList.tables.find((t) => t.id === fromId)?.members.find((m) => m.memberId === memberId)
    if (!member) return route.fulfill(apiError(404, 'TABLE_MEMBER_NOT_FOUND', '멤버를 찾을 수 없어요.'))
    const from = updateTable(fromId, (t) => ({ ...t, locked: true, members: t.members.filter((m) => m.memberId !== memberId) }))
    const to = updateTable(targetTableId, (t) => ({ ...t, locked: true, members: [...t.members, { ...member, assignReason: 'MANUAL', isManual: true }] }))
    return route.fulfill({ json: apiRes({ tables: [from, to], validation: { valid: true, violations: [] } }) })
  })
  await onApi(page, /^\/api\/admin\/dining\/tables\/[^/]+\/confirm-now$/, (route) => {
    const tableId = new URL(route.request().url()).pathname.split('/')[5]
    const chatRoomId = `d1000000-0000-0000-0000-00000000${tableId.slice(0, 4)}`
    const table = updateTable(tableId, (t) => ({ ...t, status: 'CONFIRMED', confirmAt: null, chatRoomId }))
    return route.fulfill({ json: apiRes({ id: tableId, status: 'CONFIRMED', confirmedAt: nowIso(), venueId: table?.venueId ?? null, chatRoomId }) })
  })
  await onApi(page, /^\/api\/admin\/dining\/tables\/[^/]+\/venue$/, (route) => {
    const tableId = new URL(route.request().url()).pathname.split('/')[5]
    const { venueId } = route.request().postDataJSON() as { venueId: string }
    updateTable(tableId, (t) => ({ ...t, venueId }))
    return route.fulfill({ json: apiRes({ tableId, venue: mockDiningVenues.find((v) => v.id === venueId) }) })
  })
  await onApi(page, '/api/admin/dining/venues', (route) => route.fulfill({ json: apiRes(mockDiningVenues) }))

  await onApi(page, '/api/admin/dining/exceptions', (route) => {
    const params = new URL(route.request().url()).searchParams
    const type = params.get('type')
    const status = params.get('status')
    return route.fulfill({ json: apiRes(exceptions.filter((c) => (!type || c.type === type) && (!status || c.status === status))) })
  })
  await onApi(page, /^\/api\/admin\/dining\/exceptions\/[^/]+$/, (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop()
    const { note } = route.request().postDataJSON() as { note: string }
    exceptions = exceptions.map((c) => (c.id === id ? { ...c, status: 'RESOLVED', resolutionNote: note, resolvedBy: mockAdminProfile.id, resolvedAt: nowIso() } : c))
    return route.fulfill({ json: apiRes(exceptions.find((c) => c.id === id)) })
  })
  await onApi(page, '/api/admin/dining/settings/matching-rules', (route) => {
    if (route.request().method() === 'PUT') rules = route.request().postDataJSON() as DiningMatchingRules
    return route.fulfill({ json: apiRes(rules) })
  })
}
