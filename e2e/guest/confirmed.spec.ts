import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupGuestContext, mockGathering, MOCK_GATHERING_ID, MOCK_OPEN_DATE } from '../fixtures/mocks'

test.describe('비회원 - 예약 확정 화면', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await setupGuestContext(page)
    await page.route(`**/api/gatherings/${MOCK_GATHERING_ID}`, (route) =>
      route.fulfill({ json: { success: true, message: 'OK', data: mockGathering } }),
    )
    await page.route('**/api/applications/check**', (route) => {
      route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: {
            id: 'app-confirmed',
            bookingNumber: 'WH260514CONF',
            status: 'CONFIRMED',
            gathering: {
              id: MOCK_GATHERING_ID,
              title: '퇴근 게더링',
              eventDate: MOCK_OPEN_DATE,
              thumbnailUrl: '/home/home-2.png',
            },
            createdAt: '2026-05-10T10:00:00',
          },
        },
      })
    })
  })

  test('CONFIRMED 결과 카드 클릭 시 예약 확정 페이지로 이동한다', async ({ page }) => {
    await page.goto('/applications/check')
    await page.getByPlaceholder('WH260421A3F2').fill('WH260514CONF')
    await page.getByPlaceholder('01012345678').fill('01099998888')
    await page.getByRole('button', { name: '조회하기' }).click()

    await expect(page.getByText('퇴근 게더링')).toBeVisible()
    await expect(page.getByText('카드를 누르면 예약 확정 페이지로 이동해요')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/confirmed-01-result.png')

    const confirmedCard = page.getByRole('button', { name: /퇴근 게더링/ })
    await confirmedCard.click()

    await expect(page).toHaveURL(
      `/gatherings/${MOCK_GATHERING_ID}/apply/confirmed?bookingNumber=WH260514CONF`,
    )
    await expect(page.getByText('예약이 확정되었어요!')).toBeVisible()
    await expect(page.getByText('우리은행 1002-157-849052')).toBeVisible()
    await expect(page.locator('main').getByText('와썹하우스')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/confirmed-02-page.png')

    await page.getByText('우리은행 1002-157-849052').click()
    await expect(page.getByText('복사됨')).toBeVisible()

    const clipText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipText).toBe('우리은행 1002-157-849052')
  })
})
