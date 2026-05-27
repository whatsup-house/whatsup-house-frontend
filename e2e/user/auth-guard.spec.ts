import { test, expect } from '@playwright/test'
import { setupGuestContext, mockGatheringApis, MOCK_GATHERING_ID } from '../fixtures/mocks'

// AUTH-U-06: 인증 가드 및 리다이렉트
test.describe('인증 가드', () => {
  test('비로그인 상태에서 마이페이지 접근 시 로그인으로 리다이렉트된다', async ({ page }) => {
    await setupGuestContext(page)
    await page.goto('/mypage')
    await expect(page).toHaveURL(/\/login/)
    await page.screenshot({ path: 'e2e/screenshots/user/auth-guard-mypage.png' })
  })

  test('비로그인 상태에서 신청하기 클릭 시 로그인 유도 모달이 표시된다', async ({ page }) => {
    await setupGuestContext(page)
    await mockGatheringApis(page)

    await page.goto(`/gatherings/${MOCK_GATHERING_ID}`)
    await page.getByRole('button', { name: '신청하기' }).click()
    await expect(page.getByText('신청 방법을 선택해주세요')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/auth-guard-apply-modal.png' })

    // 로그인하고 신청하기 선택 → 로그인 페이지로 이동
    await page.getByRole('button', { name: '로그인하고 신청하기' }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.screenshot({ path: 'e2e/screenshots/user/auth-guard-login-redirect.png' })
  })

  test('로그인 후 returnUrl로 복귀한다', async ({ page }) => {
    await setupGuestContext(page)

    await page.route('**/api/auth/login', (route) => {
      route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: {
            accessToken: 'mock-token',
            user: { id: 'user-001', email: 'test@test.kr', nickname: '잔잔한사람', admin: false, mileage: 0, avatarUrl: null },
          },
        },
      })
    })
    // 로그인 성공 후 /api/users/me 성공 반환
    let loggedIn = false
    await page.route('**/api/users/me', (route) => {
      if (loggedIn) {
        route.fulfill({ json: { success: true, message: 'OK', data: { id: 'user-001', email: 'test@test.kr', nickname: '잔잔한사람', name: null, phone: null, bio: null, gender: null, age: null, job: null, mbti: null, animalType: null, animalColor: '', animalPose: '', interests: null, mileage: 0, avatarUrl: null, admin: false } } })
      } else {
        route.fulfill({ status: 401, json: { success: false, message: '인증 필요', data: null } })
      }
    })

    // returnUrl이 포함된 로그인 페이지
    await page.goto('/login?returnUrl=%2Fmypage')
    await page.getByPlaceholder('이메일 주소').fill('test@test.kr')
    await page.getByPlaceholder('비밀번호 입력').fill('Password1!')

    loggedIn = true
    await page.getByRole('button', { name: '로그인' }).click()

    await expect(page).toHaveURL('/mypage')
    await page.screenshot({ path: 'e2e/screenshots/user/auth-guard-return-url.png' })
  })

  test('로그인 페이지 뒤로가기는 이전 페이지로 돌아간다', async ({ page }) => {
    await setupGuestContext(page)
    await mockGatheringApis(page)

    await page.goto('/gatherings')
    await page.goto('/login?returnUrl=%2Fgatherings')
    await page.getByLabel('뒤로가기').click()

    await expect(page).toHaveURL('/gatherings')
  })

  test('만료된 refresh token은 로그인 페이지로 이동시킨다', async ({ page }) => {
    await page.route('**/api/users/me', (route) =>
      route.fulfill({ status: 401, json: { success: false, message: '인증 필요', data: null } })
    )
    await page.route('**/api/auth/refresh', (route) =>
      route.fulfill({ status: 401, json: { success: false, message: 'refresh 만료', data: null } })
    )

    await page.goto('/mypage')

    await expect(page).toHaveURL('/login?returnUrl=%2Fmypage')
  })
})
