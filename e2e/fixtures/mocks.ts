import type { Page } from '@playwright/test'
import { MOCK_HERO_CAROUSEL_SLIDES } from '@/lib/hooks/useAdminHeroCarousel'
import { MOCK_ADMIN_HOME_REVIEWS } from '@/lib/hooks/useAdminHomeReview'

// 훅 파일의 mock 데이터를 그대로 재export해서 spec 파일에서도 동일한 데이터 참조 가능
export { MOCK_HERO_CAROUSEL_SLIDES, MOCK_ADMIN_HOME_REVIEWS }

// ─── E2E 전용 Mock Data ────────────────────────────────────────────────────────
// DB 시드 및 프론트엔드 컴포넌트 내부 mock과 동일한 ID/데이터를 사용한다.

// DB seed의 gatherings 테이블 UUID
export const MOCK_GATHERING_ID = 'c2000000-0000-0000-0000-000000000001'
export const MOCK_CLOSED_GATHERING_ID = 'c2000000-0000-0000-0000-000000000002'

export const mockGathering = {
  id: MOCK_GATHERING_ID,
  title: '퇴근 게더링',
  description: '퇴근 후 가볍게. 팜팜발리에서 하루의 피로를 풀고 새로운 사람들과 솔직한 이야기를 나눠요. 음료와 간단한 안주가 포함됩니다.',
  eventDate: '2026-05-14',
  startTime: '19:30:00',
  endTime: '21:30:00',
  price: 20000,
  maxAttendees: 16,
  status: 'OPEN',
  thumbnailUrl: '/home/home-2.png',
  location: { id: 'a2000000-0000-0000-0000-000000000001', name: '팜팜발리' },
  locationAddress: '서울 마포구 와우산로 21길 20',
  howToRun: ['자기소개', '미션', '네트워킹'],
  photoUrls: null,
  mileageReward: 500,
  averageRating: 4.5,
  reviewCount: 8,
}

export const mockClosedGathering = {
  ...mockGathering,
  id: MOCK_CLOSED_GATHERING_ID,
  title: '대학생 게더링',
  status: 'CLOSED',
  eventDate: '2026-05-17',
  startTime: '15:00:00',
  endTime: '17:30:00',
  price: 15000,
  maxAttendees: 20,
  thumbnailUrl: '/home/home-3.png',
  location: { id: 'a2000000-0000-0000-0000-000000000002', name: '서울대입구역' },
  locationAddress: '서울 관악구 봉천로 559',
}

// DB seed의 users 테이블 — user1 (일반 유저)
export const mockUserProfile = {
  id: 'b1000000-0000-0000-0000-000000000002',
  email: 'user1@test.com',
  nickname: '지은이',
  name: '이지은',
  phone: '01011112222',
  bio: '조용한 게 좋아요',
  intro: null,
  instagramId: 'jieun_26',
  gender: 'FEMALE',
  age: 26,
  job: '그래픽 디자이너',
  mbti: 'INFP',
  animalType: null,
  animalColor: '',
  animalPose: '',
  interests: ['감성', '독서'],
  mileage: 1500,
  avatarUrl: null,
  admin: false,
}

// DB seed의 users 테이블 — admin
export const mockAdminProfile = {
  id: 'b1000000-0000-0000-0000-000000000001',
  email: 'admin@whatsuphouse.com',
  nickname: '큐레이터',
  name: '김큐레이터',
  phone: '01012340000',
  bio: '와썹하우스를 운영합니다',
  intro: null,
  instagramId: 'curator_wh',
  gender: 'MALE',
  age: 30,
  job: '플랫폼 운영',
  mbti: 'ENFJ',
  animalType: null,
  animalColor: '',
  animalPose: '',
  interests: [],
  mileage: 0,
  avatarUrl: null,
  admin: true,
}

export const mockApplications = [
  {
    id: 'app-001',
    bookingNumber: 'WH260514A1B2',
    status: 'PENDING',
    gathering: {
      id: MOCK_GATHERING_ID,
      title: '퇴근 게더링',
      eventDate: '2026-05-14',
      thumbnailUrl: '/home/home-2.png',
    },
    createdAt: '2026-05-10T10:00:00',
  },
  {
    id: 'app-002',
    bookingNumber: 'WH260518C3D4',
    status: 'CONFIRMED',
    gathering: {
      id: 'c2000000-0000-0000-0000-000000000003',
      title: '썬데이 러닝 클럽 (SRC)',
      eventDate: '2026-05-18',
      thumbnailUrl: '/home/home-1.png',
    },
    createdAt: '2026-04-28T15:00:00',
  },
]

// DB seed의 gatherings 테이블 (관리자 목록 형태)
export const mockAdminGatherings = [
  {
    id: MOCK_GATHERING_ID,
    title: '퇴근 게더링',
    date: '2026-05-14',
    startTime: '19:30:00',
    endTime: '21:30:00',
    locationName: '팜팜발리',
    price: 20000,
    capacity: 16,
    currentApplicants: 5,
    applicantCount: 5,
    status: 'OPEN',
    thumbnailUrl: '/home/home-2.png',
    moodTags: ['감성'],
    activityTags: [],
  },
  {
    id: MOCK_CLOSED_GATHERING_ID,
    title: '대학생 게더링',
    date: '2026-05-17',
    startTime: '15:00:00',
    endTime: '17:30:00',
    locationName: '서울대입구역',
    price: 15000,
    capacity: 20,
    currentApplicants: 20,
    applicantCount: 20,
    status: 'CLOSED',
    thumbnailUrl: '/home/home-3.png',
    moodTags: [],
    activityTags: [],
  },
]

// DB seed의 locations 테이블
export const mockLocations = [
  {
    id: 'a2000000-0000-0000-0000-000000000001',
    name: '팜팜발리',
    address: '서울 마포구 와우산로 21길 20',
    maxCapacity: 30,
    features: [],
    contractStatus: 'ACTIVE',
  },
  {
    id: 'a2000000-0000-0000-0000-000000000002',
    name: '서울대입구역',
    address: '서울 관악구 봉천로 559',
    maxCapacity: 40,
    features: [],
    contractStatus: 'ACTIVE',
  },
  {
    id: 'a2000000-0000-0000-0000-000000000003',
    name: '한강공원',
    address: '서울 영등포구 여의도동 85',
    maxCapacity: 50,
    features: [],
    contractStatus: 'ACTIVE',
  },
  {
    id: 'a2000000-0000-0000-0000-000000000004',
    name: '보라매공원',
    address: '서울 동작구 신대방동 395',
    maxCapacity: 50,
    features: [],
    contractStatus: 'ACTIVE',
  },
]

export const mockAdminApplications = [
  {
    id: 'app-101',
    bookingNumber: 'WH260514A1B2',
    name: '홍길동',
    phone: '01011112222',
    gender: 'MALE',
    age: 28,
    job: '개발자',
    mbti: 'INTJ',
    intro: '안녕하세요',
    referralSource: 'INSTAGRAM',
    status: 'PENDING',
    createdAt: '2026-05-10T10:00:00',
    isGuest: false,
  },
  {
    id: 'app-102',
    bookingNumber: null,
    name: '비회원유저',
    phone: '01033334444',
    gender: 'FEMALE',
    age: 25,
    job: null,
    mbti: null,
    intro: null,
    referralSource: null,
    status: 'CONFIRMED',
    createdAt: '2026-05-09T09:00:00',
    isGuest: true,
  },
]

// DB seed의 users 테이블 — 목록 형태 (user1)
export const mockAdminUsers = {
  content: [
    {
      id: 'b1000000-0000-0000-0000-000000000002',
      nickname: '지은이',
      name: '이지은',
      phone: '01011112222',
      email: 'user1@test.com',
      gender: 'FEMALE',
      age: 26,
      job: '그래픽 디자이너',
      mbti: 'INFP',
      createdAt: '2026-01-01T00:00:00',
      applicationCount: 3,
      mileage: 1500,
      accountStatus: 'ACTIVE',
    },
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 10,
}

export const mockAdminUserDetail = {
  ...mockAdminUsers.content[0],
  bio: '조용한 게 좋아요',
  animalType: null,
  interests: ['감성', '독서'],
  applicationHistory: [
    { id: 'app-001', gatheringTitle: '퇴근 게더링', status: 'CONFIRMED', createdAt: '2026-05-01', isGuest: false },
  ],
}

// /reviews 페이지용 mock (API 인터셉트 시 사용)
export const mockGatheringReviews = [
  {
    id: 'rev-001',
    authorNickname: '지은이',
    authorAnimalType: '',
    createdAt: '2026-05-01T12:00:00',
    gatheringId: MOCK_GATHERING_ID,
    gatheringTitle: '퇴근 게더링',
    type: 'TEXT',
    imageUrl: null,
    content: '퇴근하고 팜팜발리에서 처음 만난 분들인데 이렇게 편안할 줄 몰랐어요. 2시간이 어떻게 지나갔는지 모를 정도였어요.',
    likeCount: 5,
    isLikedByMe: false,
    isMyReview: true,
  },
  {
    id: 'rev-002',
    authorNickname: '준서',
    authorAnimalType: '',
    createdAt: '2026-04-20T10:00:00',
    gatheringId: MOCK_GATHERING_ID,
    gatheringTitle: '퇴근 게더링',
    type: 'TEXT',
    imageUrl: null,
    content: '분위기가 너무 좋았습니다.',
    likeCount: 2,
    isLikedByMe: true,
    isMyReview: false,
  },
]

export const mockAllReviewsPage = {
  content: mockGatheringReviews,
  page: 0,
  size: 6,
  totalElements: mockGatheringReviews.length,
  totalPages: 1,
}

export const mockDashboardGatherings = [
  {
    id: MOCK_GATHERING_ID,
    title: '퇴근 게더링',
    eventDate: '2026-05-14',
    startTime: '19:30:00',
    endTime: '21:30:00',
    locationName: '팜팜발리',
    price: 20000,
    maxAttendees: 16,
    applicantCount: 5,
    pendingCount: 3,
    confirmedCount: 2,
    attendedCount: 0,
    status: 'OPEN',
  },
]

// ─── API Route Interceptors ───────────────────────────────────────────────────

function apiRes<T>(data: T) {
  return { success: true, message: 'OK', data }
}

export async function setupGuestContext(page: Page) {
  await page.route('**/api/users/me', (route) =>
    route.fulfill({ status: 401, json: { success: false, message: '인증 필요', data: null } })
  )
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { success: false, message: '토큰 만료', data: null } })
  )
}

export async function setupUserContext(page: Page) {
  await page.route('**/api/users/me', (route) =>
    route.fulfill({ status: 200, json: apiRes(mockUserProfile) })
  )
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({ status: 200, json: apiRes(null) })
  )
}

export async function setupAdminContext(page: Page) {
  await page.route('**/api/users/me', (route) =>
    route.fulfill({ status: 200, json: apiRes(mockAdminProfile) })
  )
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({ status: 200, json: apiRes(null) })
  )
}

export async function mockGatheringApis(page: Page) {
  await page.route('**/api/gatherings', (route) =>
    route.fulfill({ json: apiRes([mockGathering, mockClosedGathering]) })
  )
  await page.route(`**/api/gatherings/${MOCK_GATHERING_ID}`, (route) =>
    route.fulfill({ json: apiRes(mockGathering) })
  )
  await page.route(`**/api/gatherings/${MOCK_CLOSED_GATHERING_ID}`, (route) =>
    route.fulfill({ json: apiRes(mockClosedGathering) })
  )
}
