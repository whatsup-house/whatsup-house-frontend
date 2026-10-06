import { test, expect, type Page } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupUserContext, mockApplications, mockGathering, mockGatheringAccount, MOCK_CONFIRMED_DATE } from '../fixtures/mocks'

// mockApplications[1]의 CONFIRMED 신청이 속한 게더링
const CONFIRMED_GATHERING_ID = 'c2000000-0000-0000-0000-000000000003'

const mockConfirmedGathering = {
  ...mockGathering,
  id: CONFIRMED_GATHERING_ID,
  title: '썬데이 러닝 클럽 (SRC)',
  eventDate: MOCK_CONFIRMED_DATE,
  startTime: '08:00:00',
  endTime: '10:00:00',
  price: 5000,
  location: { id: 'a2000000-0000-0000-0000-000000000003', name: '한강공원' },
  locationAddress: '서울 영등포구 여의도동 85',
  gatheringType: 'REGULAR',
  basePrice: 5000,
  sessions: [],
}

test.describe('회원 - 예약 확정 화면', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await setupUserContext(page)
    await page.route('**/api/applications', (route) => {
      route.fulfill({ json: { success: true, message: 'OK', data: mockApplications } })
    })
    await page.route(`**/api/gatherings/${CONFIRMED_GATHERING_ID}`, (route) =>
      route.fulfill({ json: { success: true, message: 'OK', data: mockConfirmedGathering } }),
    )
  })

  test('마이페이지 CONFIRMED 카드 클릭 시 예약 확정 페이지로 이동한다', async ({ page }) => {
    await page.goto('/mypage')
    await page.getByRole('button', { name: '신청 내역' }).click()

    // CONFIRMED 카드만 role=button 으로 노출되어야 한다
    const confirmedCard = page.getByRole('button', { name: /썬데이 러닝 클럽/ })
    await expect(confirmedCard).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/confirmed-01-mypage.png')

    await confirmedCard.click()

    // 예약 확정 페이지 진입 + 안내 카피 확인
    await expect(page).toHaveURL(new RegExp(`/gatherings/${CONFIRMED_GATHERING_ID}/apply/confirmed`))
    await expect(page.getByText('예약이 확정되었어요!')).toBeVisible()
    await expect(page.getByText('게더링 당일에 뵙겠습니다')).toBeVisible()

    // 입금 계좌 정보 노출
    await expect(page.getByText('우리은행 1002-157-849052')).toBeVisible()
    await expect(page.locator('main').getByText('와썹하우스')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/confirmed-02-page.png')

    // 계좌번호 클릭 → 클립보드 복사 + "복사됨" 피드백
    await page.getByText('우리은행 1002-157-849052').click()
    await expect(page.getByText('복사됨')).toBeVisible()

    const clipText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipText).toBe('우리은행 1002-157-849052')
    await captureFullPage(page, 'e2e/screenshots/user/confirmed-03-copied.png')
  })

  // 확정 화면 입금 계좌: 게더링 계좌 우선, 없으면 폴백 (KAN-391)
  const openConfirmed = async (page: Page, account: Partial<typeof mockGatheringAccount>) => {
    await page.route(`**/api/gatherings/${CONFIRMED_GATHERING_ID}`, (route) =>
      route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: { ...mockConfirmedGathering, ...account },
        },
      }),
    )
    await page.goto(`/gatherings/${CONFIRMED_GATHERING_ID}/apply/confirmed`)
  }

  test('게더링에 계좌가 있으면 그 계좌를 안내·복사한다 (KAN-391)', async ({ page }) => {
    await openConfirmed(page, mockGatheringAccount)

    const accountText = '국민은행 123-45-678901 (홍길동)'
    await expect(page.getByText(accountText)).toBeVisible()
    await expect(page.getByText('1002-157-849052')).toHaveCount(0)

    await page.getByText(accountText).click()
    await expect(page.getByText('복사됨')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(accountText)
  })

  test('게더링에 계좌가 없으면 폴백 계좌를 안내한다 (KAN-391)', async ({ page }) => {
    await openConfirmed(page, {})

    await expect(page.getByText('우리은행 1002-157-849052')).toBeVisible()
    await expect(page.locator('main').getByText('와썹하우스')).toBeVisible()
  })
})
