import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupAdminContext, mockAdminGatherings, mockLocations } from '../fixtures/mocks'

// ADMIN-02: 게더링 관리 CRUD + 상태 변경
test.describe('관리자 - 게더링 관리', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminContext(page)
    await page.route('**/api/admin/gatherings', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ json: { success: true, message: 'OK', data: mockAdminGatherings } })
      } else if (route.request().method() === 'POST') {
        route.fulfill({ json: { success: true, message: 'OK', data: { ...mockAdminGatherings[0], id: 'g-new', title: '새 게더링' } } })
      } else {
        route.continue()
      }
    })
    await page.route('**/api/admin/gatherings/**', (route) => {
      const method = route.request().method()
      if (method === 'PUT') {
        route.fulfill({ json: { success: true, message: 'OK', data: null } })
      } else if (method === 'PATCH') {
        route.fulfill({ json: { success: true, message: 'OK', data: null } })
      } else if (method === 'DELETE') {
        route.fulfill({ status: 204, body: '' })
      } else {
        route.continue()
      }
    })
    await page.route('**/api/admin/locations', (route) => {
      route.fulfill({ json: { success: true, message: 'OK', data: mockLocations } })
    })
  })

  test('게더링 목록을 조회하고 상태 필터를 사용한다', async ({ page }) => {
    await page.goto('/admin/gatherings')
    await expect(page.getByText('퇴근 게더링')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/gatherings-01-list.png')

    // 상태 필터 - 마감 (id로 정확히 타겟팅)
    const closedFilter = page.locator('#filter-status-CLOSED')
    if (await closedFilter.isVisible()) {
      await closedFilter.click()
      await captureFullPage(page, 'e2e/screenshots/admin/gatherings-02-filter-closed.png')
    }
  })

  test('새 게더링을 생성한다', async ({ page }) => {
    await page.goto('/admin/gatherings')

    // 게더링 추가 버튼
    const addBtn = page.getByRole('button', { name: /게더링 추가|추가/ })
    await addBtn.click()
    await captureFullPage(page, 'e2e/screenshots/admin/gatherings-03-form-panel.png')

    // 폼 입력
    await page.getByPlaceholder('게더링 이름을 입력해주세요').fill('새 게더링')
    await page.getByPlaceholder('게더링에 대해 소개해주세요').fill('새로운 게더링입니다.')

    await captureFullPage(page, 'e2e/screenshots/admin/gatherings-04-form-filled.png')

    // 저장
    const saveBtn = page.getByRole('button', { name: '저장하기' }).last()
    await saveBtn.click()
    await page.screenshot({ path: 'e2e/screenshots/admin/gatherings-05-created.png' })
  })

  test('기존 게더링을 수정한다', async ({ page }) => {
    await page.goto('/admin/gatherings')
    await expect(page.getByText('퇴근 게더링')).toBeVisible()

    // 게더링 제목 클릭 → 수정 패널
    await page.getByText('퇴근 게더링').first().click()
    await captureFullPage(page, 'e2e/screenshots/admin/gatherings-06-edit-panel.png')
  })

  test('게더링 상태를 변경한다', async ({ page }) => {
    await page.goto('/admin/gatherings')
    await expect(page.getByText('퇴근 게더링')).toBeVisible()

    // 상태 변경 드롭다운
    const statusBtn = page.getByRole('button', { name: /모집중|OPEN/ }).or(page.getByRole('combobox')).first()
    if (await statusBtn.isVisible()) {
      await statusBtn.click()
      await page.screenshot({ path: 'e2e/screenshots/admin/gatherings-07-status-dropdown.png' })

      const closeOption = page.getByText('마감').or(page.getByRole('option', { name: '마감' }))
      if (await closeOption.isVisible()) {
        await closeOption.click()
        await page.screenshot({ path: 'e2e/screenshots/admin/gatherings-08-status-changed.png' })
      }
    }
  })
})
