import { test, expect } from '@playwright/test'
import { setupAdminContext, mockLocations } from '../fixtures/mocks'

// ADMIN-06: 장소 관리 CRUD
test.describe('관리자 - 장소 관리', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminContext(page)
    await page.route('**/api/admin/locations', (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        route.fulfill({ json: { success: true, message: 'OK', data: mockLocations } })
      } else if (method === 'POST') {
        route.fulfill({ json: { success: true, message: 'OK', data: { id: 'loc-new', name: '새 장소', address: '서울시 강남구', maxCapacity: 15, features: [], contractStatus: 'ACTIVE' } } })
      } else {
        route.continue()
      }
    })
    await page.route('**/api/admin/locations/**', (route) => {
      const method = route.request().method()
      if (method === 'PUT') {
        route.fulfill({ json: { success: true, message: 'OK', data: null } })
      } else if (method === 'DELETE') {
        route.fulfill({ status: 204, body: '' })
      } else {
        route.continue()
      }
    })
  })

  test('장소 목록을 조회한다', async ({ page }) => {
    await page.goto('/admin/locations')
    await expect(page.getByText('팜팜발리')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/admin/locations-01-list.png', fullPage: true })
  })

  test('새 장소를 추가한다', async ({ page }) => {
    await page.goto('/admin/locations')

    const addBtn = page.getByRole('button', { name: /장소 추가|추가/ })
    await addBtn.click()
    await page.screenshot({ path: 'e2e/screenshots/admin/locations-02-form.png', fullPage: true })

    // 폼 입력
    const nameInput = page.getByLabel('장소명').or(page.getByPlaceholder(/장소명|이름/)).first()
    if (await nameInput.isVisible()) {
      await nameInput.fill('와썹하우스 홍대점')
    }

    const addressInput = page.getByLabel('주소').or(page.getByPlaceholder(/주소/)).first()
    if (await addressInput.isVisible()) {
      await addressInput.fill('서울시 마포구 동교동')
    }

    const capacityInput = page.getByLabel(/수용|정원/).or(page.getByPlaceholder(/수용|정원/)).first()
    if (await capacityInput.isVisible()) {
      await capacityInput.fill('15')
    }

    await page.screenshot({ path: 'e2e/screenshots/admin/locations-03-filled.png', fullPage: true })

    const saveBtn = page.getByRole('button', { name: /저장|추가/ }).last()
    await saveBtn.click()
    await page.screenshot({ path: 'e2e/screenshots/admin/locations-04-created.png' })
  })

  test('장소를 수정한다', async ({ page }) => {
    await page.goto('/admin/locations')
    await expect(page.getByText('팜팜발리')).toBeVisible()

    // 수정 버튼
    const editBtn = page.getByRole('button', { name: /수정|편집/ }).first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await page.screenshot({ path: 'e2e/screenshots/admin/locations-05-edit-form.png', fullPage: true })

      const saveBtn = page.getByRole('button', { name: /저장|수정 완료/ }).last()
      await saveBtn.click()
      await page.screenshot({ path: 'e2e/screenshots/admin/locations-06-edited.png' })
    }
  })

  test('장소를 삭제한다', async ({ page }) => {
    await page.goto('/admin/locations')
    await expect(page.getByText('팜팜발리')).toBeVisible()

    const deleteBtn = page.getByRole('button', { name: '삭제' }).first()
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click()
      await page.screenshot({ path: 'e2e/screenshots/admin/locations-07-deleted.png' })
    }
  })
})
