/**
 * Admin 페이지 UI 확인용 Mock 데이터
 * .env.local 에 NEXT_PUBLIC_MOCK=true 로 설정하면 API 호출 대신 이 데이터를 사용합니다.
 * 확인 끝나면 해당 env 변수를 제거하면 원래대로 복원됩니다.
 */

import type { AdminGathering, AdminGatheringStatus } from './admin'
import type { AdminGatheringListItem, LocationItem, AdminApplicationItem } from './adminGathering'
import type { AdminUserListItem, AdminUserDetail, AdminUserPage } from './adminUser'
import dayjs from 'dayjs'

export const IS_MOCK = process.env.NEXT_PUBLIC_MOCK === 'true'

// ─── 오늘 기준 날짜 유틸 ───────────────────────────────────────────────
const today = dayjs()
const thisMonday = today.startOf('isoWeek')

function dateOffset(offset: number) {
  return thisMonday.add(offset, 'day').format('YYYY-MM-DD')
}

// ─── Mock 게더링 목록 (admin.ts / adminGathering.ts 공용) ──────────────
export const MOCK_GATHERINGS: (AdminGathering & AdminGatheringListItem)[] = [
  {
    id: 'g-001',
    title: '와인 & 재즈의 밤',
    date: dateOffset(0), // 이번주 월
    startTime: '19:00:00',
    endTime: '21:30:00',
    locationName: '이태원 루프탑 하우스',
    price: 35000,
    capacity: 12,
    applicantCount: 8,
    currentApplicants: 8,
    status: 'RECRUITING' as AdminGatheringStatus,
    thumbnailUrl: null,
    moodTags: ['감성적인', '조용한'],
    activityTags: ['와인', '재즈'],
  },
  {
    id: 'g-002',
    title: '주말 브런치 모임',
    date: dateOffset(5), // 이번주 토
    startTime: '11:00:00',
    endTime: '13:00:00',
    locationName: '성수 카페 하우스',
    price: 25000,
    capacity: 10,
    applicantCount: 10,
    currentApplicants: 10,
    status: 'CLOSED' as AdminGatheringStatus,
    thumbnailUrl: null,
    moodTags: ['편안한'],
    activityTags: ['브런치'],
  },
  {
    id: 'g-003',
    title: '보드게임 파티',
    date: dateOffset(2), // 이번주 수
    startTime: '18:30:00',
    endTime: '21:00:00',
    locationName: '홍대 플레이룸',
    price: 20000,
    capacity: 15,
    applicantCount: 6,
    currentApplicants: 6,
    status: 'RECRUITING' as AdminGatheringStatus,
    thumbnailUrl: null,
    moodTags: ['활기찬', '재미있는'],
    activityTags: ['보드게임'],
  },
  {
    id: 'g-004',
    title: '영화 감상 & 토론',
    date: dateOffset(3), // 이번주 목
    startTime: '19:30:00',
    endTime: '22:00:00',
    locationName: '강남 시네마 라운지',
    price: 15000,
    capacity: 8,
    applicantCount: 8,
    currentApplicants: 8,
    status: 'COMPLETED' as AdminGatheringStatus,
    thumbnailUrl: null,
    moodTags: ['지적인'],
    activityTags: ['영화', '토론'],
  },
  {
    id: 'g-005',
    title: '요가 & 명상 클래스',
    date: dateOffset(-3), // 지난주 금
    startTime: '07:00:00',
    endTime: '09:00:00',
    locationName: '한남동 요가원',
    price: 30000,
    capacity: 10,
    applicantCount: 7,
    currentApplicants: 7,
    status: 'COMPLETED' as AdminGatheringStatus,
    thumbnailUrl: null,
    moodTags: ['힐링'],
    activityTags: ['요가', '명상'],
  },
  {
    id: 'g-006',
    title: '와인 테이스팅 초보반',
    date: dateOffset(8), // 다음주 화
    startTime: '19:00:00',
    endTime: '21:00:00',
    locationName: '이태원 루프탑 하우스',
    price: 40000,
    capacity: 8,
    applicantCount: 3,
    currentApplicants: 3,
    status: 'RECRUITING' as AdminGatheringStatus,
    thumbnailUrl: null,
    moodTags: ['감성적인'],
    activityTags: ['와인'],
  },
  {
    id: 'g-007',
    title: '취소된 모임',
    date: dateOffset(1), // 이번주 화
    startTime: '18:00:00',
    endTime: '20:00:00',
    locationName: '강남 시네마 라운지',
    price: 10000,
    capacity: 12,
    applicantCount: 2,
    currentApplicants: 2,
    status: 'CANCELLED' as AdminGatheringStatus,
    thumbnailUrl: null,
    moodTags: null,
    activityTags: null,
  },
]

// ─── Mock 장소 목록 ────────────────────────────────────────────────────
export const MOCK_LOCATIONS: LocationItem[] = [
  {
    id: 'loc-001',
    name: '이태원 루프탑 하우스',
    address: '서울특별시 용산구 이태원로 200',
    maxCapacity: 15,
    features: ['루프탑', '주차가능', '프로젝터'],
    contractStatus: 'ACTIVE',
  },
  {
    id: 'loc-002',
    name: '성수 카페 하우스',
    address: '서울특별시 성동구 성수이로 88',
    maxCapacity: 12,
    features: ['카페', '와이파이', '노키즈존'],
    contractStatus: 'ACTIVE',
  },
  {
    id: 'loc-003',
    name: '홍대 플레이룸',
    address: '서울특별시 마포구 와우산로 56',
    maxCapacity: 20,
    features: ['보드게임', '파티룸'],
    contractStatus: 'PENDING',
  },
  {
    id: 'loc-004',
    name: '강남 시네마 라운지',
    address: '서울특별시 강남구 역삼로 120',
    maxCapacity: 10,
    features: ['스크린', '음향시스템'],
    contractStatus: 'ACTIVE',
  },
  {
    id: 'loc-005',
    name: '한남동 요가원',
    address: '서울특별시 용산구 한남대로 42길 15',
    maxCapacity: 10,
    features: ['요가매트', '샤워실'],
    contractStatus: 'EXPIRED',
  },
]

// ─── Mock 참가자 목록 ──────────────────────────────────────────────────
export const MOCK_APPLICATIONS: Record<string, AdminApplicationItem[]> = {
  'g-001': [
    { id: 'a-001', name: '김민지', phone: '010-1234-5678', gender: 'FEMALE', age: 28, job: '디자이너', mbti: 'ENFP', intro: '와인 좋아해요!', referralSource: 'INSTAGRAM', status: 'APPLIED', createdAt: today.subtract(3, 'day').toISOString(), isGuest: false },
    { id: 'a-002', name: '이준호', phone: '010-2345-6789', gender: 'MALE', age: 32, job: '개발자', mbti: 'INTJ', intro: '재즈 감상이 취미입니다', referralSource: 'FRIEND', status: 'ATTENDED', createdAt: today.subtract(2, 'day').toISOString(), isGuest: false },
    { id: 'a-003', name: '박서연', phone: '010-3456-7890', gender: 'FEMALE', age: 26, job: '마케터', mbti: 'ISFJ', intro: null, referralSource: 'BLOG', status: 'APPLIED', createdAt: today.subtract(2, 'day').toISOString(), isGuest: true },
    { id: 'a-004', name: '최우진', phone: '010-4567-8901', gender: 'MALE', age: 30, job: '프리랜서', mbti: 'ENTP', intro: '새로운 사람 만나는 걸 좋아합니다', referralSource: 'OTHER', status: 'APPLIED', createdAt: today.subtract(1, 'day').toISOString(), isGuest: false },
    { id: 'a-005', name: '정하은', phone: '010-5678-9012', gender: 'FEMALE', age: 29, job: '대학생', mbti: 'INFP', intro: null, referralSource: 'INSTAGRAM', status: 'ATTENDED', createdAt: today.subtract(1, 'day').toISOString(), isGuest: false },
    { id: 'a-006', name: '한도윤', phone: '010-6789-0123', gender: 'MALE', age: 27, job: '회사원', mbti: 'ESTJ', intro: '처음 참가합니다', referralSource: 'FRIEND', status: 'APPLIED', createdAt: today.toISOString(), isGuest: true },
    { id: 'a-007', name: '윤서아', phone: '010-7890-1234', gender: 'FEMALE', age: 31, job: '교사', mbti: 'ESFJ', intro: null, referralSource: 'INSTAGRAM', status: 'APPLIED', createdAt: today.toISOString(), isGuest: false },
    { id: 'a-008', name: '강지훈', phone: '010-8901-2345', gender: 'MALE', age: 34, job: '기획자', mbti: 'ISTP', intro: '와인 초보입니다', referralSource: 'BLOG', status: 'APPLIED', createdAt: today.toISOString(), isGuest: false },
  ],
  'g-002': [
    { id: 'a-011', name: '이수빈', phone: '010-1111-2222', gender: 'FEMALE', age: 25, job: '대학생', mbti: 'ENFJ', intro: '브런치 좋아해요', referralSource: 'INSTAGRAM', status: 'ATTENDED', createdAt: today.subtract(5, 'day').toISOString(), isGuest: false },
    { id: 'a-012', name: '김태현', phone: '010-3333-4444', gender: 'MALE', age: 29, job: '회사원', mbti: 'ISTJ', intro: null, referralSource: 'FRIEND', status: 'ATTENDED', createdAt: today.subtract(4, 'day').toISOString(), isGuest: false },
  ],
  'g-003': [
    { id: 'a-021', name: '오지원', phone: '010-5555-6666', gender: 'FEMALE', age: 24, job: '대학생', mbti: 'INTP', intro: '보드게임 초보!', referralSource: 'INSTAGRAM', status: 'APPLIED', createdAt: today.subtract(1, 'day').toISOString(), isGuest: true },
    { id: 'a-022', name: '배준혁', phone: '010-7777-8888', gender: 'MALE', age: 28, job: '개발자', mbti: 'ENTJ', intro: null, referralSource: 'FRIEND', status: 'APPLIED', createdAt: today.toISOString(), isGuest: false },
  ],
}

// ─── Mock 사용자 목록 ──────────────────────────────────────────────────
export const MOCK_USERS: AdminUserListItem[] = [
  { id: 'u-001', nickname: '민지', name: '김민지', phone: '010-1234-5678', email: 'minji@test.com', gender: 'FEMALE', age: 28, job: 'WORKER', mbti: 'ENFP', createdAt: '2026-01-15T10:00:00Z', applicationCount: 5, mileage: 2500, accountStatus: 'ACTIVE' },
  { id: 'u-002', nickname: '준호', name: '이준호', phone: '010-2345-6789', email: 'junho@test.com', gender: 'MALE', age: 32, job: 'WORKER', mbti: 'INTJ', createdAt: '2026-01-20T10:00:00Z', applicationCount: 3, mileage: 1500, accountStatus: 'ACTIVE' },
  { id: 'u-003', nickname: '서연', name: '박서연', phone: '010-3456-7890', email: 'seoyeon@test.com', gender: 'FEMALE', age: 26, job: 'WORKER', mbti: 'ISFJ', createdAt: '2026-02-01T10:00:00Z', applicationCount: 2, mileage: 1000, accountStatus: 'ACTIVE' },
  { id: 'u-004', nickname: '우진', name: '최우진', phone: '010-4567-8901', email: 'woojin@test.com', gender: 'MALE', age: 30, job: 'FREELANCER', mbti: 'ENTP', createdAt: '2026-02-10T10:00:00Z', applicationCount: 7, mileage: 3500, accountStatus: 'ACTIVE' },
  { id: 'u-005', nickname: '하은', name: '정하은', phone: '010-5678-9012', email: 'haeun@test.com', gender: 'FEMALE', age: 29, job: 'STUDENT', mbti: 'INFP', createdAt: '2026-02-20T10:00:00Z', applicationCount: 1, mileage: 500, accountStatus: 'SUSPENDED' },
  { id: 'u-006', nickname: '도윤', name: '한도윤', phone: '010-6789-0123', email: 'doyun@test.com', gender: 'MALE', age: 27, job: 'WORKER', mbti: 'ESTJ', createdAt: '2026-03-01T10:00:00Z', applicationCount: 4, mileage: 2000, accountStatus: 'ACTIVE' },
  { id: 'u-007', nickname: '관리자', name: '와썹어드민', phone: '010-0000-0000', email: 'admin@whatsuphouse.com', gender: null, age: null, job: null, mbti: null, createdAt: '2026-01-01T00:00:00Z', applicationCount: 0, mileage: 0, accountStatus: 'ADMIN' },
  { id: 'u-008', nickname: '서아', name: '윤서아', phone: '010-7890-1234', email: 'seoa@test.com', gender: 'FEMALE', age: 31, job: 'WORKER', mbti: 'ESFJ', createdAt: '2026-03-05T10:00:00Z', applicationCount: 6, mileage: 3000, accountStatus: 'ACTIVE' },
  { id: 'u-009', nickname: '지훈', name: '강지훈', phone: '010-8901-2345', email: 'jihoon@test.com', gender: 'MALE', age: 34, job: 'WORKER', mbti: 'ISTP', createdAt: '2026-03-10T10:00:00Z', applicationCount: 2, mileage: 1000, accountStatus: 'ACTIVE' },
  { id: 'u-010', nickname: '수빈', name: '이수빈', phone: '010-1111-2222', email: 'subin@test.com', gender: 'FEMALE', age: 25, job: 'STUDENT', mbti: 'ENFJ', createdAt: '2026-03-15T10:00:00Z', applicationCount: 3, mileage: 1500, accountStatus: 'ACTIVE' },
]

export const MOCK_USER_DETAIL: AdminUserDetail = {
  ...MOCK_USERS[0],
  bio: '새로운 사람들과 만나서 이야기하는 걸 좋아해요. 와인도 좋아하고 재즈 음악도 즐겨 들어요.',
  animalType: '고양이',
  interests: ['와인', '음악', '여행'],
  applicationHistory: [
    { id: 'ah-001', gatheringTitle: '와인 & 재즈의 밤', status: 'ATTENDED', createdAt: '2026-04-01T10:00:00Z', isGuest: false },
    { id: 'ah-002', gatheringTitle: '주말 브런치 모임', status: 'APPLIED', createdAt: '2026-04-10T10:00:00Z', isGuest: false },
    { id: 'ah-003', gatheringTitle: '요가 & 명상 클래스', status: 'CANCELLED', createdAt: '2026-03-20T10:00:00Z', isGuest: false },
  ],
}

// ─── Mock 페이지네이션 ─────────────────────────────────────────────────
export function getMockUserPage(keyword?: string, page = 0, size = 10): AdminUserPage {
  let filtered = MOCK_USERS
  if (keyword) {
    const kw = keyword.toLowerCase()
    filtered = MOCK_USERS.filter(
      (u) => u.nickname.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw)
    )
  }
  const start = page * size
  const content = filtered.slice(start, start + size)
  return {
    content,
    totalElements: filtered.length,
    totalPages: Math.ceil(filtered.length / size),
    number: page,
    size,
  }
}

// ─── Mock 달력 dots ────────────────────────────────────────────────────
export function getMockCalendarDots(year: number, month: number): string[] {
  return MOCK_GATHERINGS
    .filter((g) => {
      const d = dayjs(g.date)
      return d.year() === year && d.month() + 1 === month
    })
    .map((g) => g.date)
}
