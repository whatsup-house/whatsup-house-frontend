import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import {
  setupGuestContext,
  mockGatheringApis,
  mockHomeApis,
  mockReviewApis,
  mockGathering,
  MOCK_GATHERING_ID,
} from '../fixtures/mocks'

// AUTH-G-03: 비회원 게더링 탐색
test.describe('비회원 - 게더링 탐색', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestContext(page)
    await mockGatheringApis(page)
    await mockHomeApis(page)
  })

  test('홈 화면을 탐색한다', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByText('이번 주 가장 많이 본 게더링')).toBeVisible()
    await expect(page.getByText('퇴근 게더링').first()).toBeVisible()
    await expect(page.getByText('다녀온 사람들의 후기')).toBeVisible()
    await expect(page.getByText('지은이')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/01-home.png')
  })

  test('게더링 목록을 조회하고 상세 페이지로 이동한다', async ({ page }) => {
    await page.route('**/api/gatherings**', (route) => {
      const url = route.request().url()
      if (url.includes(`/api/gatherings/${MOCK_GATHERING_ID}`)) {
        route.fulfill({ json: { success: true, message: 'OK', data: mockGathering } })
      } else if (url.includes('date=')) {
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
    await captureFullPage(page, 'e2e/screenshots/guest/02-gathering-list-calendar.png')

    // 날짜 셀 클릭 (현재 월에 dot 있는 날)
    const dayCells = page.locator('button').filter({ hasText: /^[0-9]+$/ })
    await dayCells.first().click()
    await page.waitForTimeout(300)
    await captureFullPage(page, 'e2e/screenshots/guest/03-gathering-list-selected-date.png')

    // 게더링 카드 클릭 → 상세
    const gatheringCard = page.getByText('퇴근 게더링').first()
    await gatheringCard.click()
    await expect(page).toHaveURL(new RegExp(`/gatherings/${MOCK_GATHERING_ID}`))
    await captureFullPage(page, 'e2e/screenshots/guest/04-gathering-detail.png')
  })

  test('후기 페이지를 탐색한다', async ({ page }) => {
    await mockReviewApis(page)

    await page.goto('/reviews')
    await expect(page.getByText('퇴근하고 팜팜발리에서 처음 만난 분들인데')).toBeVisible()
    await expect(page.getByText('분위기가 너무 좋았습니다.')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/05-reviews.png')
  })

  test('게더링 상세에서 신청하기 버튼이 노출된다', async ({ page }) => {
    await page.goto(`/gatherings/${MOCK_GATHERING_ID}`)
    await expect(page.getByRole('button', { name: '신청하기' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/guest/06-gathering-detail-apply-button.png' })
  })
})
