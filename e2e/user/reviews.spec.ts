import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import {
  setupUserContext,
  setupGuestContext,
  mockGatheringReviews,
  mockAllReviewsPage,
  mockHomeReviews,
  mockGathering,
  MOCK_GATHERING_ID,
  mockApplications,
} from '../fixtures/mocks'

function apiRes<T>(data: T) {
  return { success: true, message: 'OK', data }
}

// AUTH-U-07: 후기 관련 페이지 탐색
test.describe('후기 페이지', () => {
  test('홈 화면의 후기 섹션이 API 데이터로 표시된다', async ({ page }) => {
    await setupGuestContext(page)
    await page.route('**/api/home/reviews', (route) =>
      route.fulfill({ json: apiRes(mockHomeReviews) })
    )
    await page.goto('/')
    await expect(page.getByText(mockHomeReviews[0].nickname).first()).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/reviews-01-home-section.png')
  })

  test('비로그인 상태에서 /reviews 목록을 조회한다', async ({ page }) => {
    await setupGuestContext(page)
    await page.route('**/api/reviews**', (route) => {
      route.fulfill({ json: apiRes(mockAllReviewsPage) })
    })
    await page.route('**/api/gatherings**', (route) => {
      route.fulfill({ json: apiRes([mockGathering]) })
    })

    await page.goto('/reviews')
    await expect(page.getByText(mockGatheringReviews[0].reviewContent)).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/reviews-02-list.png')
  })

  test('로그인 상태에서 /reviews에서 후기 내용이 표시된다', async ({ page }) => {
    await setupUserContext(page)
    await page.route('**/api/reviews**', (route) => {
      route.fulfill({ json: apiRes(mockAllReviewsPage) })
    })
    await page.route('**/api/gatherings**', (route) => {
      route.fulfill({ json: apiRes([mockGathering]) })
    })

    await page.goto('/reviews')
    await expect(page.getByText(mockGatheringReviews[0].reviewContent)).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/reviews-03-loaded.png')
  })

  test('로그인 상태에서 게더링·정렬 필터를 사용한다', async ({ page }) => {
    await setupUserContext(page)
    await page.route('**/api/reviews**', (route) => {
      route.fulfill({ json: apiRes(mockAllReviewsPage) })
    })
    await page.route('**/api/gatherings**', (route) => {
      route.fulfill({ json: apiRes([mockGathering]) })
    })

    await page.goto('/reviews')
    await page.getByRole('button', { name: '전체 게더링' }).click()
    await expect(page.getByRole('button', { name: '퇴근 게더링' })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/reviews-04-gathering-filter-open.png')

    await page.getByRole('button', { name: '퇴근 게더링' }).click()
    await page.getByRole('button', { name: '최신순' }).click()
    await expect(page.getByText(mockGatheringReviews[0].reviewContent)).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/reviews-05-filtered.png')
  })

  test('참석 완료 회원은 게더링 상세에서 후기를 작성한다', async ({ page }) => {
    await setupUserContext(page)
    await page.route(`**/api/gatherings/${MOCK_GATHERING_ID}`, (route) => {
      route.fulfill({ json: apiRes(mockGathering) })
    })
    await page.route('**/api/gatherings', (route) => {
      route.fulfill({ json: apiRes([mockGathering]) })
    })
    await page.route('**/api/applications/me**', (route) => {
      route.fulfill({
        json: apiRes([
          {
            ...mockApplications[0],
            status: 'ATTENDED',
            gathering: { ...mockApplications[0].gathering, id: MOCK_GATHERING_ID },
          },
        ]),
      })
    })
    // 게더링별 후기 GET 페이지
    await page.route(`**/api/gatherings/${MOCK_GATHERING_ID}/reviews**`, (route) => {
      route.fulfill({
        json: apiRes({
          content: [mockGatheringReviews[1]],
          page: 0,
          size: 10,
          totalElements: 1,
          totalPages: 1,
        }),
      })
    })
    // 후기 등록은 /api/reviews POST 로 변경됨 (applicationId 기반)
    await page.route('**/api/reviews', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          json: apiRes({
            reviewId: 'rev-new',
            userId: 'b1000000-0000-0000-0000-000000000002',
            nickname: '지은이',
            applicationId: mockApplications[0].id,
            gatheringId: MOCK_GATHERING_ID,
            gatheringTitle: '퇴근 게더링',
            reviewType: 'PHOTO',
            reviewContent: '편안하고 좋은 시간이었어요.',
            likeCount: 0,
            images: [],
            createdAt: '2026-05-20T10:00:00',
          }),
        })
      } else {
        route.continue()
      }
    })

    await page.goto(`/gatherings/${MOCK_GATHERING_ID}`)
    await expect(page.getByText('후기 남기기')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/reviews-06-write-form.png')

    await page.getByRole('button', { name: '사진' }).click()
    await page.getByPlaceholder('게더링에서의 경험을 자유롭게 작성해주세요').fill('편안하고 좋은 시간이었어요.')
    await captureFullPage(page, 'e2e/screenshots/user/reviews-07-write-photo-tab.png')

    await page.getByRole('button', { name: '후기 등록' }).click()
    // 마일리지 적립 메시지는 mockGathering.mileageReward(500) 기준으로 노출됨
    await expect(page.getByText('후기가 등록됐어요! +500M 적립')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/reviews-08-write-complete.png' })
  })
})
