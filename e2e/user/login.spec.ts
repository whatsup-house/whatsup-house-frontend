import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupGuestContext, mockUserProfile } from '../fixtures/mocks'

test.describe('회원 - 로그인', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestContext(page)
  })

  test('로그인 화면을 확인한다', async ({ page }) => {
    await page.goto('/login')

    const title = page.getByRole('heading', { name: '로그인' })
    await expect(page.getByAltText('와썹하우스')).toBeVisible()
    await expect(page.getByText('해가 지는 선선한 저녁에 만나요')).toBeVisible()
    await expect(page.getByPlaceholder('이메일 주소')).toBeVisible()
    const password = page.getByPlaceholder('비밀번호 입력')
    await expect(password).toBeVisible()
    await expect(title).toBeVisible()
    await expect(title).toHaveCSS('text-align', 'left')

    await password.fill('Password1!')
    await page.getByRole('button', { name: '비밀번호 보기' }).click()
    await expect(password).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: '비밀번호 숨기기' }).click()
    await expect(password).toHaveAttribute('type', 'password')
    await captureFullPage(page, 'e2e/screenshots/user/login-01-form.png')
  })

  test('로그인 입력값 검증과 실패 메시지를 표시한다', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('button', { name: '로그인' }).click()
    await expect(page.getByText('올바른 이메일 형식을 입력해주세요')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/login-03-validation.png')

    await page.route('**/api/auth/login', (route) => {
      route.fulfill({
        status: 401,
        json: { success: false, message: '이메일 또는 비밀번호를 확인해주세요.', data: null },
      })
    })
    await page.getByPlaceholder('이메일 주소').fill('user1@test.com')
    await page.getByPlaceholder('비밀번호 입력').fill('wrong-password')
    await page.getByRole('button', { name: '로그인' }).click()
    await expect(page.getByText('아이디 또는 비밀번호를 확인해주세요.')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/login-04-failed.png' })
  })

  test('로그인 성공 시 returnUrl로 이동한다', async ({ page }) => {
    let loggedIn = false
    await page.route('**/api/auth/login', (route) => {
      loggedIn = true
      route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: {
            accessToken: 'mock-token',
            user: {
              id: mockUserProfile.id,
              email: mockUserProfile.email,
              nickname: mockUserProfile.nickname,
              admin: false,
              mileage: mockUserProfile.mileage,
              avatarUrl: null,
            },
          },
        },
      })
    })
    await page.route('**/api/users/me', (route) => {
      if (loggedIn) {
        route.fulfill({ json: { success: true, message: 'OK', data: mockUserProfile } })
      } else {
        route.fulfill({ status: 401, json: { success: false, message: '인증 필요', data: null } })
      }
    })

    await page.goto('/login?returnUrl=%2Fmypage')
    await page.getByPlaceholder('이메일 주소').fill('user1@test.com')
    await page.getByPlaceholder('비밀번호 입력').fill('Password1!')
    await page.getByRole('button', { name: '로그인' }).click()

    await expect(page).toHaveURL('/mypage')
    await captureFullPage(page, 'e2e/screenshots/user/login-05-success-return.png')
  })
})
