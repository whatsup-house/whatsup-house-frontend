import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupAdminContext, mockAdminUsers, mockAdminUserDetail } from '../fixtures/mocks'

// ADMIN-07: 회원 관리
test.describe('관리자 - 회원 관리', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminContext(page)
    await page.route('**/api/admin/users?**', (route) => {
      route.fulfill({ json: { success: true, message: 'OK', data: mockAdminUsers } })
    })
    await page.route('**/api/admin/users/b1000000-0000-0000-0000-000000000002', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ json: { success: true, message: 'OK', data: mockAdminUserDetail } })
      } else if (route.request().method() === 'PATCH') {
        route.fulfill({ json: { success: true, message: 'OK', data: null } })
      } else {
        route.continue()
      }
    })
  })

  test('회원 목록을 조회한다', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.getByText('지은이')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/users-01-list.png')
  })

  test('닉네임으로 회원을 검색한다', async ({ page }) => {
    await page.route('**/api/admin/users?**', (route) => {
      const url = route.request().url()
      const keyword = new URL(url).searchParams.get('keyword')
      if (!keyword || keyword === '지은') {
        route.fulfill({ json: { success: true, message: 'OK', data: mockAdminUsers } })
      } else {
        route.fulfill({ json: { success: true, message: 'OK', data: { ...mockAdminUsers, content: [] } } })
      }
    })

    await page.goto('/admin/users')

    const searchInput = page.getByPlaceholder(/검색|닉네임|이메일/).first()
    await expect(searchInput).toBeVisible()
    await searchInput.fill('지은')
    await page.screenshot({ path: 'e2e/screenshots/admin/users-02-search-input.png' })

    const searchBtn = page.getByRole('button', { name: '검색' })
    await searchBtn.click()
    await page.waitForTimeout(300)
    await expect(page.getByText('지은이')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/users-03-search-result.png')

    // 초기화
    const resetBtn = page.getByRole('button', { name: '초기화' })
    await expect(resetBtn).toBeVisible()
    await resetBtn.click()
    await page.screenshot({ path: 'e2e/screenshots/admin/users-04-reset.png' })
  })

  test('회원 상세 정보를 조회하고 계정 상태를 변경한다', async ({ page }) => {
    await page.goto('/admin/users')

    const detailBtn = page.getByRole('button', { name: '상세보기' }).first()
    await expect(detailBtn).toBeVisible()
    await detailBtn.click()
    await captureFullPage(page, 'e2e/screenshots/admin/users-05-detail-panel.png')

    // 계정 정지 버튼
    const suspendBtn = page.getByRole('button', { name: /정지|비활성/ })
    await expect(suspendBtn).toBeVisible()
    await suspendBtn.click()
    await page.screenshot({ path: 'e2e/screenshots/admin/users-06-suspended.png' })
  })

  test('페이지네이션이 표시된다', async ({ page }) => {
    await page.route('**/api/admin/users?**', (route) => {
      route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: {
            ...mockAdminUsers,
            totalElements: 25,
            totalPages: 3,
          },
        },
      })
    })

    await page.goto('/admin/users')
    await expect(page.getByRole('button', { name: '다음 페이지' })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/users-07-pagination.png')
  })
})
