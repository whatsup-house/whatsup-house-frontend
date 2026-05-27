import type { Page } from '@playwright/test'
import type { AdminHeroCarouselSlide, AdminHomeReview } from '@/lib/api/types'

// ─── Admin Mock 데이터 (E2E 인터셉트용) ────────────────────────────────────────

export const MOCK_HERO_CAROUSEL_SLIDES: AdminHeroCarouselSlide[] = [
  { id: '1', type: 'CALENDAR',  imageUrl: '/home/home-1.png', title: '5월 게더링 일정',         content: null,           dateLabel: null,       gatheringId: null,                                     sortOrder: 1, isActive: true },
  { id: '2', type: 'GATHERING', imageUrl: '/home/home-2.png', title: '퇴근 게더링',             content: null,           dateLabel: '5월 14일 목', gatheringId: 'c2000000-0000-0000-0000-000000000001', sortOrder: 2, isActive: true },
  { id: '3', type: 'GATHERING', imageUrl: '/home/home-4.png', title: '대학생 게더링',           content: null,           dateLabel: '5월 17일 토', gatheringId: 'c2000000-0000-0000-0000-000000000002', sortOrder: 3, isActive: true },
  { id: '4', type: 'GATHERING', imageUrl: '/home/home-3.png', title: '경찰과 도둑',             content: null,           dateLabel: '5월 25일 일', gatheringId: 'c2000000-0000-0000-0000-000000000004', sortOrder: 4, isActive: true },
  { id: '5', type: 'GATHERING', imageUrl: '/home/home-6.png', title: '썬데이 러닝 클럽 (SRC)', content: null,           dateLabel: '5월 18일 일', gatheringId: 'c2000000-0000-0000-0000-000000000003', sortOrder: 5, isActive: true },
  { id: '6', type: 'STORY',     imageUrl: '/home/home-5.png', title: '우리 젊다',               content: 'Whatsup house', dateLabel: null,      gatheringId: null,                                     sortOrder: 6, isActive: true },
]

export const MOCK_ADMIN_HOME_REVIEWS: AdminHomeReview[] = [
  { id: 'r1', authorName: '예림',   avatarUrl: '/review/review1.JPG', gatheringTitle: '퇴근 게더링',            content: '퇴근하고 팜팜발리에서 처음 만난 분들인데 이렇게 편안할 줄 몰랐어요.',                   rating: 5, displayOrder: 1, isActive: true },
  { id: 'r2', authorName: '지은이', avatarUrl: '/review/review2.JPG', gatheringTitle: '퇴근 게더링',            content: '혼자 가기 망설였는데 다들 너무 자연스럽게 받아줘서 금방 친해졌어요.',                   rating: 5, displayOrder: 2, isActive: true },
  { id: 'r3', authorName: '수아',   avatarUrl: '/review/review3.JPG', gatheringTitle: '대학생 게더링',          content: '학교도 전공도 다른 사람들이랑 이렇게 이야기가 잘 통할 줄 몰랐어요.',                     rating: 5, displayOrder: 3, isActive: true },
  { id: 'r4', authorName: '민준정', avatarUrl: '/review/review4.JPG', gatheringTitle: '대학생 게더링',          content: '서울대입구역 근처에서 이런 모임이 있는 줄 몰랐어요.',                                    rating: 4, displayOrder: 4, isActive: true },
  { id: 'r5', authorName: '나연강', avatarUrl: '/review/review5.JPG', gatheringTitle: '썬데이 러닝 클럽 (SRC)', content: '혼자 달리기는 힘들었는데 함께 뛰니까 너무 즐거웠어요.',                                rating: 5, displayOrder: 5, isActive: true },
  { id: 'r6', authorName: '도현임', avatarUrl: '/review/review6.JPG', gatheringTitle: '썬데이 러닝 클럽 (SRC)', content: '페이스 맞춰주는 분위기가 너무 좋았어요.',                                            rating: 5, displayOrder: 6, isActive: true  },
  { id: 'r7', authorName: '태양오', avatarUrl: '/review/review1.JPG', gatheringTitle: '대학생 게더링',          content: '미공개 처리 테스트용 비활성 후기.',                                                  rating: 4, displayOrder: 7, isActive: false },
]

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
    reviewId: 'rev-001',
    userId: mockUserProfile.id,
    applicationId: 'app-001',
    gatheringId: MOCK_GATHERING_ID,
    reviewType: 'TEXT',
    images: [],
    reviewContent: '퇴근하고 팜팜발리에서 처음 만난 분들인데 이렇게 편안할 줄 몰랐어요. 2시간이 어떻게 지나갔는지 모를 정도였어요.',
    likeCount: 5,
    createdAt: '2026-05-01T12:00:00',
  },
  {
    reviewId: 'rev-002',
    userId: 'b1000000-0000-0000-0000-000000000003',
    applicationId: 'app-002',
    gatheringId: MOCK_GATHERING_ID,
    reviewType: 'PHOTO',
    images: [{ imageId: 'img-review-002', imageUrl: '/review/review1.JPG', displayOrder: 0 }],
    reviewContent: '분위기가 너무 좋았습니다.',
    likeCount: 2,
    createdAt: '2026-04-20T10:00:00',
  },
]

export const mockAllReviewsPage = {
  content: mockGatheringReviews,
  page: 0,
  size: 6,
  totalElements: mockGatheringReviews.length,
  totalPages: 1,
}

export const mockHeroCarouselSlides = MOCK_HERO_CAROUSEL_SLIDES
  .filter((slide) => slide.isActive)
  .map(({ isActive: _, ...slide }) => slide)

export const mockCuratedGatherings = mockAdminGatherings.map((gathering, index) => ({
  id: gathering.id,
  title: gathering.title,
  thumbnailUrl: gathering.thumbnailUrl,
  eventDate: gathering.date,
  locationName: gathering.locationName,
  price: gathering.price,
  status: gathering.status,
  curatedRank: index,
}))

export const mockHomeReviews = [
  {
    reviewId: 'home-review-001',
    nickname: '지은이',
    gatheringId: MOCK_GATHERING_ID,
    gatheringTitle: '퇴근 게더링',
    reviewContent: '퇴근하고 처음 만난 분들과 편안하게 이야기했어요.',
    likeCount: 5,
    thumbnailImageUrl: '/review/review1.JPG',
    homeDisplayOrder: 1,
  },
  {
    reviewId: 'home-review-002',
    nickname: '준서',
    gatheringId: 'c2000000-0000-0000-0000-000000000003',
    gatheringTitle: '썬데이 러닝 클럽',
    reviewContent: '가볍게 뛰고 커피까지 마시는 흐름이 좋았습니다.',
    likeCount: 2,
    thumbnailImageUrl: '/review/review2.JPG',
    homeDisplayOrder: 2,
  },
]

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
  await page.addInitScript(() => {
    localStorage.setItem('whatsup-has-seen-welcome', 'true')
  })
  await page.route('**/api/users/me', (route) =>
    route.fulfill({ status: 401, json: { success: false, message: '인증 필요', data: null } })
  )
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({ status: 200, json: apiRes(null) })
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

export async function mockHomeApis(page: Page) {
  await page.route('**/api/home/carousel', (route) =>
    route.fulfill({ json: apiRes(mockHeroCarouselSlides) })
  )
  await page.route('**/api/home/curated', (route) =>
    route.fulfill({ json: apiRes(mockCuratedGatherings) })
  )
  await page.route('**/api/home/reviews', (route) =>
    route.fulfill({ json: apiRes(mockHomeReviews) })
  )
}

export async function mockReviewApis(page: Page) {
  await page.route('**/api/reviews**', (route) =>
    route.fulfill({ json: apiRes(mockAllReviewsPage) })
  )
}

export async function mockAdminHomeApis(page: Page) {
  // 히어로 캐러셀 — 컬렉션
  await page.route('**/api/admin/hero-carousel', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: apiRes({ slides: MOCK_HERO_CAROUSEL_SLIDES }) })
    }
    return route.fulfill({ json: apiRes(MOCK_HERO_CAROUSEL_SLIDES[0]) })
  })
  // 히어로 캐러셀 — 개별 항목(수정/삭제/토글)
  await page.route('**/api/admin/hero-carousel/**', (route) =>
    route.fulfill({ json: apiRes(MOCK_HERO_CAROUSEL_SLIDES[0]) })
  )

  // 홈 후기 — 컬렉션
  await page.route('**/api/admin/home-reviews', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: apiRes({ reviews: MOCK_ADMIN_HOME_REVIEWS }) })
    }
    return route.fulfill({ json: apiRes(MOCK_ADMIN_HOME_REVIEWS[0]) })
  })
  // 홈 후기 — 개별 항목(수정/삭제/토글)
  await page.route('**/api/admin/home-reviews/**', (route) =>
    route.fulfill({ json: apiRes(MOCK_ADMIN_HOME_REVIEWS[0]) })
  )
}
