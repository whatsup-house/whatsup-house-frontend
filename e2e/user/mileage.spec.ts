import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupUserContext } from '../fixtures/mocks'

function apiRes<T>(data: T) {
  return { success: true, message: 'OK', data }
}

const mileageHistory = {
  content: [
    {
      id: 'mileage-001',
      type: 'ATTENDANCE',
      amount: 500,
      balanceAfter: 1500,
      createdAt: '2026-05-14T22:00:00',
      adjustReason: null,
    },
    {
      id: 'mileage-002',
      type: 'REVIEW_REWARD',
      amount: 300,
      balanceAfter: 1000,
      createdAt: '2026-05-15T10:00:00',
      adjustReason: null,
    },
    {
      id: 'mileage-003',
      type: 'ADMIN_ADJUST',
      amount: -200,
      balanceAfter: 800,
      createdAt: '2026-05-16T10:00:00',
      adjustReason: '이벤트 참가비 차감',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 3,
  totalPages: 1,
}

test.describe('회원 - 마일리지', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserContext(page)
    await page.route('**/api/mileage/me', (route) => {
      route.fulfill({ json: apiRes({ mileage: 1500 }) })
    })
    await page.route('**/api/mileage/me/history**', (route) => {
      route.fulfill({ json: apiRes(mileageHistory) })
    })
  })

  test('마일리지 잔액과 내역을 확인한다', async ({ page }) => {
    await page.goto('/mypage/mileage')

    await expect(page.getByText('1,500', { exact: true })).toBeVisible()
    await expect(page.getByText('마일리지 내역')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/mileage-01-list.png')
  })

  test('적립 방법 아코디언과 필터, 정렬을 사용한다', async ({ page }) => {
    await page.goto('/mypage/mileage')

    await page.getByRole('button', { name: /어떻게 쌓나요/ }).click()
    await expect(page.getByText('게더링 참석 완료')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/mileage-02-earn-open.png')

    await page.getByRole('button', { name: '전체' }).click()
    await page.getByRole('button', { name: '사용 내역' }).click()
    await expect(page.getByText('관리자 차감')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/mileage-03-filter-use.png')

    await page.getByRole('button', { name: /최신순/ }).click()
    await expect(page.getByRole('button', { name: /오래된 순/ })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/mileage-04-sort-asc.png' })
  })
})
