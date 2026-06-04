import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupAdminContext, mockDashboardGatherings } from '../fixtures/mocks'

// ADMIN-01: 관리자 대시보드
test.describe('관리자 - 대시보드', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminContext(page)
    await page.route('**/api/admin/gatherings**', (route) => {
      route.fulfill({ json: { success: true, message: 'OK', data: mockDashboardGatherings } })
    })
  })

  test('대시보드 KPI 카드와 게더링 테이블을 확인한다', async ({ page }) => {
    await page.goto('/admin')
    await captureFullPage(page, 'e2e/screenshots/admin/dashboard-01-loaded.png')

    // KPI 요소 존재 여부
    await expect(page.getByText('퇴근 게더링')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/dashboard-02-gatherings.png')
  })

  test('새로고침 버튼을 클릭한다', async ({ page }) => {
    await page.goto('/admin')
    const refreshBtn = page.getByRole('button', { name: /마지막 갱신/ })
    await expect(refreshBtn).toBeVisible()
    await refreshBtn.click()
    await page.screenshot({ path: 'e2e/screenshots/admin/dashboard-03-refreshed.png' })
  })
})
