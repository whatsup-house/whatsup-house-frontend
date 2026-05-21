import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupGuestContext } from '../fixtures/mocks'

// AUTH-G-02: 비회원 신청 내역 조회
test.describe('비회원 - 신청 내역 조회', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestContext(page)
  })

  test('예약번호와 연락처로 신청 내역을 조회한다', async ({ page }) => {
    await page.route('**/api/applications/check**', (route) => {
      route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: {
            id: 'app-001',
            bookingNumber: 'WH260601Z9X8',
            status: 'CONFIRMED',
            gathering: {
              id: 'g-001',
              title: '봄날 감성 게더링',
              eventDate: '2026-06-01',
              thumbnailUrl: null,
            },
            createdAt: '2026-05-10T10:00:00',
          },
        },
      })
    })

    await page.goto('/applications/check')
    await expect(page.getByText('신청 내역 조회')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/check-01-form.png')

    await page.getByPlaceholder('WH260421A3F2').fill('WH260601Z9X8')
    await page.getByPlaceholder('01012345678').fill('01099998888')
    await page.screenshot({ path: 'e2e/screenshots/guest/check-02-filled.png' })

    await page.getByRole('button', { name: '조회하기' }).click()
    await expect(page.getByText('봄날 감성 게더링')).toBeVisible()
    await expect(page.getByText('확정')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/check-03-result.png')
  })

  test('잘못된 예약번호 입력 시 오류 메시지를 표시한다', async ({ page }) => {
    await page.route('**/api/applications/check**', (route) => {
      route.fulfill({ status: 404, json: { success: false, message: '신청 내역을 찾을 수 없습니다', data: null } })
    })

    await page.goto('/applications/check')
    await page.getByPlaceholder('WH260421A3F2').fill('WH000000XXXX')
    await page.getByPlaceholder('01012345678').fill('01000000000')
    await page.getByRole('button', { name: '조회하기' }).click()

    await expect(page.getByText('예약번호 또는 연락처를 확인해주세요')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/guest/check-error-notfound.png' })
  })
})
