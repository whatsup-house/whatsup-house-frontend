import { test, expect } from '@playwright/test'
import { mockHomeApis } from '../fixtures/mocks'

test.describe('비회원 - 랜딩 페이지', () => {
  test('랜딩 페이지는 처음 한 번만 표시된다', async ({ page }) => {
    await page.route('**/api/users/me', (route) =>
      route.fulfill({ status: 401, json: { success: false, message: '인증 필요', data: null } })
    )
    await page.route('**/api/auth/refresh', (route) =>
      route.fulfill({ status: 200, json: { success: true, message: 'OK', data: null } })
    )
    await mockHomeApis(page)

    await page.goto('/')
    await expect(page).toHaveURL('/welcome?returnUrl=%2F')
    await expect(page.getByRole('heading', { name: '와썹하우스' })).toBeVisible()
    await expect
      .poll(async () => {
        const cookie = (await page.context().cookies()).find(({ name }) => name === 'wh_seen_welcome')
        return cookie?.value
      })
      .toBe('1')

    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByText('이번 주 가장 많이 본 게더링')).toBeVisible()
  })

  test('기존 localStorage 방문 기록은 쿠키로 승격하고 홈으로 복귀한다', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('whatsup-has-seen-welcome', 'true')
    })
    await page.route('**/api/users/me', (route) =>
      route.fulfill({ status: 401, json: { success: false, message: '인증 필요', data: null } })
    )
    await page.route('**/api/auth/refresh', (route) =>
      route.fulfill({ status: 200, json: { success: true, message: 'OK', data: null } })
    )
    await mockHomeApis(page)

    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByText('이번 주 가장 많이 본 게더링')).toBeVisible()
    await expect
      .poll(async () => {
        const cookie = (await page.context().cookies()).find(({ name }) => name === 'wh_seen_welcome')
        return cookie?.value
      })
      .toBe('1')
  })
})
