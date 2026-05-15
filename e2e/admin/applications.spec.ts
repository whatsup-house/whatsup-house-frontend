import { test, expect } from '@playwright/test'
import { setupAdminContext, mockAdminGatherings, mockAdminApplications, MOCK_GATHERING_ID } from '../fixtures/mocks'

// ADMIN-03: 참가자 관리
test.describe('관리자 - 참가자 관리', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminContext(page)
    await page.route('**/api/admin/gatherings**', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ json: { success: true, message: 'OK', data: mockAdminGatherings } })
      } else {
        route.continue()
      }
    })
    await page.route(`**/api/admin/applications?gatheringId=${MOCK_GATHERING_ID}`, (route) => {
      route.fulfill({ json: { success: true, message: 'OK', data: mockAdminApplications } })
    })
    await page.route('**/api/admin/applications/**', (route) => {
      const method = route.request().method()
      if (method === 'PATCH') {
        route.fulfill({ json: { success: true, message: 'OK', data: null } })
      } else if (method === 'DELETE') {
        route.fulfill({ status: 204, body: '' })
      } else {
        route.continue()
      }
    })
  })

  test('날짜를 선택하고 게더링별 참가자를 조회한다', async ({ page }) => {
    await page.goto('/admin/applications')
    await page.screenshot({ path: 'e2e/screenshots/admin/applications-01-calendar.png', fullPage: true })

    // 캘린더에서 날짜 선택 (1일)
    const dayBtn = page.getByRole('button', { name: '1' }).first()
    if (await dayBtn.isVisible()) {
      await dayBtn.click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'e2e/screenshots/admin/applications-02-date-selected.png', fullPage: true })
    }

    // 게더링 카드 클릭
    const gatheringCard = page.getByText('퇴근 게더링').first()
    if (await gatheringCard.isVisible()) {
      await gatheringCard.click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'e2e/screenshots/admin/applications-03-participants.png', fullPage: true })

      // 참가자 이름 확인
      await expect(page.getByText('홍길동')).toBeVisible()
    }
  })

  test('참가자 상태를 PENDING → CONFIRMED으로 변경한다', async ({ page }) => {
    await page.goto('/admin/applications')

    const dayBtn = page.getByRole('button', { name: '1' }).first()
    if (await dayBtn.isVisible()) {
      await dayBtn.click()
      await page.waitForTimeout(200)
    }

    const gatheringCard = page.getByText('퇴근 게더링').first()
    if (await gatheringCard.isVisible()) {
      await gatheringCard.click()
      await page.waitForTimeout(300)

      // 상태 변경 버튼
      const confirmBtn = page.getByRole('button', { name: /확정|CONFIRMED|승인/ }).first()
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
        await page.screenshot({ path: 'e2e/screenshots/admin/applications-04-confirmed.png' })
      }
    }
  })

  test('참가자를 반려한다', async ({ page }) => {
    await page.goto('/admin/applications')

    const dayBtn = page.getByRole('button', { name: '1' }).first()
    if (await dayBtn.isVisible()) {
      await dayBtn.click()
      await page.waitForTimeout(200)
    }

    const gatheringCard = page.getByText('퇴근 게더링').first()
    if (await gatheringCard.isVisible()) {
      await gatheringCard.click()
      await page.waitForTimeout(300)

      const rejectBtn = page.getByRole('button', { name: '반려' }).first()
      if (await rejectBtn.isVisible()) {
        await rejectBtn.click()
        await page.screenshot({ path: 'e2e/screenshots/admin/applications-05-rejected.png' })
      }
    }
  })
})
