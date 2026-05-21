import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import {
  setupGuestContext,
  mockGathering,
  mockClosedGathering,
  MOCK_GATHERING_ID,
  MOCK_CLOSED_GATHERING_ID,
} from '../fixtures/mocks'

function apiRes<T>(data: T) {
  return { success: true, message: 'OK', data }
}

test.describe('비회원 - 보조 화면', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestContext(page)
  })

  test('게더링 목록에서 지도 뷰로 전환한다', async ({ page }) => {
    await page.route('**/api/gatherings**', (route) => {
      route.fulfill({ json: apiRes([mockGathering]) })
    })

    await page.goto('/gatherings')
    await page.getByRole('button', { name: '지도' }).click()

    await expect(page.getByText('지도 연동 예정')).toBeVisible()
    await expect(page.getByText('이 지역 예정 게더링 1개')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/07-gathering-list-map.png')
  })

  test('소셜 준비 화면을 확인한다', async ({ page }) => {
    await page.goto('/social')

    await expect(page.getByRole('heading', { name: '소셜 스페이스' })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/08-social.png')
  })

  test('토큰 링크로 신청 내역을 조회한다', async ({ page }) => {
    await page.route('**/api/applications/check**', (route) => {
      route.fulfill({
        json: apiRes({
          id: 'app-token-001',
          bookingNumber: 'WH260514A1B2',
          applicantName: '홍길동',
          status: 'CONFIRMED',
          gathering: {
            id: MOCK_GATHERING_ID,
            title: '퇴근 게더링',
            eventDate: '2026-05-14',
            startTime: '19:30:00',
            locationName: '팜팜발리',
          },
        }),
      })
    })

    await page.goto('/applications/check?token=valid-token')
    await expect(page.getByRole('heading', { name: '신청 내역' })).toBeVisible()
    await expect(page.getByText('WH260514A1B2')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/check-token-01-result.png')
  })

  test('유효하지 않은 토큰 링크 오류를 확인한다', async ({ page }) => {
    await page.route('**/api/applications/check**', (route) => {
      route.fulfill({ status: 404, json: { success: false, message: '유효하지 않은 링크입니다', data: null } })
    })

    await page.goto('/applications/check?token=invalid-token')
    await expect(page.getByText('유효하지 않은 링크입니다')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/check-token-02-invalid.png')
  })

  test('마감 게더링에서 다른 날짜 보기 바텀 시트를 연다', async ({ page }) => {
    const futureSameTitle = {
      ...mockClosedGathering,
      id: 'c2000000-0000-0000-0000-000000000099',
      eventDate: '2026-06-10',
      status: 'OPEN',
    }

    await page.route(`**/api/gatherings/${MOCK_CLOSED_GATHERING_ID}`, (route) => {
      route.fulfill({ json: apiRes(mockClosedGathering) })
    })
    await page.route('**/api/gatherings', (route) => {
      route.fulfill({ json: apiRes([mockClosedGathering, futureSameTitle]) })
    })

    await page.goto(`/gatherings/${MOCK_CLOSED_GATHERING_ID}`)
    await page.getByRole('button', { name: '다른 날짜 보기' }).click()
    await expect(page.getByRole('button', { name: '닫기' })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/09-closed-other-dates.png')
  })

  test('마감 게더링에 미래 날짜가 없으면 운영 종료로 표시한다', async ({ page }) => {
    await page.route(`**/api/gatherings/${MOCK_CLOSED_GATHERING_ID}`, (route) => {
      route.fulfill({ json: apiRes(mockClosedGathering) })
    })
    await page.route('**/api/gatherings', (route) => {
      route.fulfill({ json: apiRes([mockClosedGathering]) })
    })

    await page.goto(`/gatherings/${MOCK_CLOSED_GATHERING_ID}`)
    await expect(page.getByRole('button', { name: '운영 종료' })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/09-closed-ended.png')
  })
})
