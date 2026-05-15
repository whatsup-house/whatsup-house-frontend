import { test, expect } from '@playwright/test'
import { setupGuestContext, mockGatheringApis, MOCK_GATHERING_ID } from '../fixtures/mocks'

// AUTH-G-03: 비회원 게더링 탐색
test.describe('비회원 - 게더링 탐색', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestContext(page)
    await mockGatheringApis(page)
  })

  test('홈 화면을 탐색한다', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await page.screenshot({ path: 'e2e/screenshots/guest/01-home.png', fullPage: true })
  })

  test('게더링 목록을 조회하고 상세 페이지로 이동한다', async ({ page }) => {
    await page.route('**/api/gatherings**', (route) => {
      const url = route.request().url()
      if (url.includes('date=')) {
        route.fulfill({ json: { success: true, message: 'OK', data: [
          {
            id: MOCK_GATHERING_ID,
            title: '퇴근 게더링',
            description: '퇴근하고 모여요.',
            eventDate: '2026-05-14',
            startTime: '19:00:00',
            endTime: '22:00:00',
            price: 20000,
            maxAttendees: 12,
            status: 'OPEN',
            thumbnailUrl: null,
            location: { id: 'a2000000-0000-0000-0000-000000000001', name: '팜팜발리' },
          },
        ] } })
      } else {
        route.fulfill({ json: { success: true, message: 'OK', data: [
          { id: MOCK_GATHERING_ID, eventDate: '2026-05-14', status: 'OPEN', title: '퇴근 게더링', description: '', startTime: '19:00:00', endTime: '22:00:00', price: 20000, maxAttendees: 12, thumbnailUrl: null, location: null },
        ] } })
      }
    })

    await page.goto('/gatherings')
    await page.screenshot({ path: 'e2e/screenshots/guest/02-gathering-list-calendar.png', fullPage: true })

    // 날짜 셀 클릭 (현재 월에 dot 있는 날)
    const dayCells = page.locator('button').filter({ hasText: /^[0-9]+$/ })
    await dayCells.first().click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: 'e2e/screenshots/guest/03-gathering-list-selected-date.png', fullPage: true })

    // 게더링 카드 클릭 → 상세
    const gatheringCard = page.getByText('퇴근 게더링').first()
    await gatheringCard.click()
    await expect(page).toHaveURL(new RegExp(`/gatherings/${MOCK_GATHERING_ID}`))
    await page.screenshot({ path: 'e2e/screenshots/guest/04-gathering-detail.png', fullPage: true })
  })

  test('후기 페이지를 탐색한다', async ({ page }) => {
    await page.route('**/api/gatherings/**/reviews', (route) => {
      route.fulfill({ json: { success: true, message: 'OK', data: [] } })
    })

    await page.goto('/reviews')
    await page.screenshot({ path: 'e2e/screenshots/guest/05-reviews.png', fullPage: true })
  })

  test('게더링 상세에서 신청하기 버튼이 노출된다', async ({ page }) => {
    await page.goto(`/gatherings/${MOCK_GATHERING_ID}`)
    await expect(page.getByRole('button', { name: '신청하기' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/guest/06-gathering-detail-apply-button.png' })
  })
})
