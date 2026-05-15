import { test, expect } from '@playwright/test'
import { setupUserContext, setupGuestContext, mockGatheringReviews, mockAllReviewsPage } from '../fixtures/mocks'

function apiRes<T>(data: T) {
  return { success: true, message: 'OK', data }
}

// AUTH-U-07: 후기 관련 페이지 탐색
test.describe('후기 페이지', () => {
  test('홈 화면의 후기 섹션이 API 데이터로 표시된다', async ({ page }) => {
    await setupGuestContext(page)
    await page.route('**/api/reviews**', (route) =>
      route.fulfill({ json: apiRes(mockAllReviewsPage) })
    )
    await page.goto('/')
    await expect(page.getByText(mockGatheringReviews[0].authorNickname)).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/reviews-01-home-section.png', fullPage: true })
  })

  test('비로그인 상태에서 /reviews 목록을 조회한다', async ({ page }) => {
    await setupGuestContext(page)
    await page.route('**/api/gatherings/**/reviews**', (route) => {
      route.fulfill({ json: { success: true, message: 'OK', data: mockGatheringReviews } })
    })

    await page.goto('/reviews')
    await page.screenshot({ path: 'e2e/screenshots/user/reviews-02-list.png', fullPage: true })
  })

  test('로그인 상태에서 /reviews에서 후기 내용이 표시된다', async ({ page }) => {
    await setupUserContext(page)

    await page.goto('/reviews')
    // AllReviewList는 컴포넌트 내부 mock 데이터를 사용 (API 미호출)
    await expect(page.getByText('퇴근 게더링').first()).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/reviews-03-loaded.png', fullPage: true })
  })
})
