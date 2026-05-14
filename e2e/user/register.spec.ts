import { test, expect } from '@playwright/test'
import { setupGuestContext, mockUserProfile } from '../fixtures/mocks'

// AUTH-U-01: 회원가입 → 온보딩
test.describe('회원 - 회원가입 및 온보딩', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestContext(page)
  })

  test('회원가입 후 온보딩을 완료하고 홈으로 이동한다', async ({ page }) => {
    await page.route('**/api/users/check-nickname**', (route) => {
      route.fulfill({ json: { success: true, message: 'OK', data: { available: true } } })
    })
    await page.route('**/api/auth/register', (route) => {
      route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: { id: 'user-new', email: 'new@test.kr', nickname: '새유저', createdAt: '2026-05-12T00:00:00' },
        },
      })
    })
    await page.route('**/api/auth/login', (route) => {
      route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: {
            accessToken: 'mock-token',
            user: { id: 'user-new', email: 'new@test.kr', nickname: '새유저', admin: false, mileage: 0, avatarUrl: null },
          },
        },
      })
    })
    // 회원가입 완료 후 /api/users/me는 성공 반환
    let registered = false
    await page.route('**/api/users/me', (route) => {
      if (registered) {
        route.fulfill({ json: { success: true, message: 'OK', data: { ...mockUserProfile, id: 'user-new', nickname: '새유저' } } })
      } else {
        route.fulfill({ status: 401, json: { success: false, message: '인증 필요', data: null } })
      }
    })

    // 1. 회원가입 페이지
    await page.goto('/register')
    await expect(page.getByText('회원가입').first()).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/register-01-form.png', fullPage: true })

    // 2. 기본 정보 입력
    await page.getByPlaceholder('이름을 입력해주세요').fill('김새싹')
    await page.getByRole('button', { name: '여' }).click()
    await page.getByPlaceholder('나이를 입력해주세요').fill('25')
    await page.getByPlaceholder('2자 이상 입력해주세요').fill('새싹유저')

    // 닉네임 중복 확인 결과 대기
    await expect(page.getByText('사용 가능한 닉네임입니다')).toBeVisible({ timeout: 5000 })

    await page.getByPlaceholder('이메일 주소를 입력해주세요').fill('newuser@test.kr')
    await page.getByPlaceholder('영문+숫자 포함 8자 이상').fill('Password1!')
    await page.getByPlaceholder('비밀번호를 다시 입력해주세요').fill('Password1!')
    await page.getByPlaceholder('01012345678 (선택, 11자리)').fill('01087654321')

    await page.screenshot({ path: 'e2e/screenshots/user/register-02-filled.png', fullPage: true })

    // 3. 약관 전체 동의
    await page.getByText('전체 동의').click()
    await page.screenshot({ path: 'e2e/screenshots/user/register-03-terms.png', fullPage: true })

    // 4. 다음 → 온보딩
    await page.getByRole('button', { name: '다음' }).click()
    await expect(page).toHaveURL('/onboarding')
    await page.screenshot({ path: 'e2e/screenshots/user/register-04-onboarding.png', fullPage: true })

    // 5. 직업 선택
    const jobBtn = page.getByText('직장인').or(page.getByText('대학생')).first()
    await jobBtn.click()

    // 6. MBTI 선택 (INFP)
    await page.getByRole('button', { name: 'I' }).click()
    await page.getByRole('button', { name: 'N' }).click()
    await page.getByRole('button', { name: 'F' }).click()
    await page.getByRole('button', { name: 'P' }).click()

    // 7. 관심사 선택
    await page.getByText('감성').click()
    await page.getByText('독서').click()

    await page.screenshot({ path: 'e2e/screenshots/user/register-05-onboarding-filled.png', fullPage: true })

    registered = true
    // 8. 완료 버튼
    const completeBtn = page.getByRole('button', { name: '완료' }).or(page.getByRole('button', { name: '시작하기' })).first()
    await completeBtn.click()
    await page.screenshot({ path: 'e2e/screenshots/user/register-06-complete.png' })
  })

  test('닉네임 중복 시 오류를 표시한다', async ({ page }) => {
    await page.route('**/api/users/check-nickname**', (route) => {
      route.fulfill({ json: { success: true, message: 'OK', data: { available: false } } })
    })

    await page.goto('/register')
    await page.getByPlaceholder('2자 이상 입력해주세요').fill('중복닉네임')
    await expect(page.getByText('중복된 닉네임입니다')).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: 'e2e/screenshots/user/register-nickname-dup.png' })
  })
})
