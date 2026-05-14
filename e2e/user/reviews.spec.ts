import { test, expect } from '@playwright/test'
import { setupUserContext, setupGuestContext, mockGatheringReviews, MOCK_HOME_REVIEWS } from '../fixtures/mocks'

// AUTH-U-07: 후기 관련 페이지 탐색
test.describe('후기 페이지', () => {
  test('홈 화면의 후기 섹션이 훅 mock 데이터로 표시된다', async ({ page }) => {
    // useHomeReviews 훅은 내부에서 Promise.resolve(MOCK_HOME_REVIEWS)로 동작 → page.route() 불필요
    // MOCK_HOME_REVIEWS를 직접 참조해 assertion → 훅 데이터 변경 시 테스트도 자동 반영
    await setupGuestContext(page)
    await page.goto('/')
    await expect(page.getByText(MOCK_HOME_REVIEWS.reviews[0].authorName)).toBeVisible()
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
