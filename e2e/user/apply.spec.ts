import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupUserContext, mockGatheringApis, mockUserProfile, MOCK_GATHERING_ID } from '../fixtures/mocks'

// AUTH-U-02: 로그인 회원 게더링 신청
test.describe('회원 - 게더링 신청', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserContext(page)
    await mockGatheringApis(page)
  })

  test('로그인 상태에서 게더링에 신청하고 완료 페이지로 이동한다', async ({ page }) => {
    await page.route(`**/api/gatherings/${MOCK_GATHERING_ID}/applications/user`, (route) => {
      route.fulfill({ json: { success: true, message: 'OK', data: null } })
    })
    await page.route('**/api/users/me', (route) => {
      route.fulfill({ json: { success: true, message: 'OK', data: mockUserProfile } })
    })

    // 1. 게더링 상세
    await page.goto(`/gatherings/${MOCK_GATHERING_ID}`)
    await expect(page.getByText('퇴근 게더링')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/apply-01-detail.png' })

    // 2. 신청하기 → 모달
    await page.getByRole('button', { name: '신청하기' }).click()
    await expect(page.getByText('신청 방법을 선택해주세요')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/apply-02-modal.png' })

    // 3. 로그인하고 신청하기
    await page.getByRole('button', { name: '로그인하고 신청하기' }).click()
    await expect(page).toHaveURL(`/gatherings/${MOCK_GATHERING_ID}/apply`)
    await captureFullPage(page, 'e2e/screenshots/user/apply-03-form.png')

    // 4. 폼 입력 (로그인 유저는 이름/연락처 없음)
    await page.getByRole('button', { name: '여성' }).click()
    await page.getByPlaceholder('나이를 입력해주세요').fill('27')

    // MBTI는 프로필(INFP)에서 자동 선택되므로 바로 메시지 확인
    await expect(page.getByText('INFP 유형이군요!')).toBeVisible()

    // 유입 경로 선택
    await page.getByRole('button', { name: '인스타그램' }).click()

    await captureFullPage(page, 'e2e/screenshots/user/apply-04-form-filled.png')

    // 5. 신청 완료
    await page.getByRole('button', { name: '신청 완료하기' }).click()
    await expect(page).toHaveURL(`/gatherings/${MOCK_GATHERING_ID}/apply/complete`)
    await expect(page.getByText('신청이 완료됐어요!')).toBeVisible()

    // 회원 신청은 예약번호 없이 "내 신청 내역 확인하기" 버튼
    await expect(page.getByRole('button', { name: '내 신청 내역 확인하기' })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/apply-05-complete.png')

    // 6. 내 신청 내역으로 이동
    await page.getByRole('button', { name: '내 신청 내역 확인하기' }).click()
    await expect(page).toHaveURL('/mypage')
  })

  test('로그인 상태여도 type=guest 신청은 비회원 신청 폼으로 동작한다', async ({ page }) => {
    await page.route(`**/api/gatherings/${MOCK_GATHERING_ID}/applications/guest`, (route) => {
      route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: {
            id: 'guest-app-while-logged-in',
            bookingNumber: 'WH260602GUEST',
            gatheringId: MOCK_GATHERING_ID,
            status: 'PENDING',
            createdAt: '2026-05-12T10:00:00',
          },
        },
      })
    })

    await page.goto(`/gatherings/${MOCK_GATHERING_ID}/apply?type=guest`)

    await expect(page.getByText('비로그인 신청은 마일리지가 적립되지 않아요.')).toBeVisible()
    await expect(page.getByPlaceholder('실명을 입력해주세요')).toBeVisible()
    await expect(page.getByPlaceholder('01012345678')).toBeVisible()
    await expect(page.getByText(/마일리지가 적립돼요/)).toHaveCount(0)

    await page.getByPlaceholder('실명을 입력해주세요').fill('로그인비회원')
    await page.getByPlaceholder('01012345678').fill('01022223333')
    await page.getByRole('button', { name: '여성' }).click()
    await page.getByPlaceholder('나이를 입력해주세요').fill('29')
    await page.getByRole('button', { name: '신청 완료하기' }).click()

    await expect(page).toHaveURL(`/gatherings/${MOCK_GATHERING_ID}/apply/complete?bookingNumber=WH260602GUEST`)
    await expect(page.getByText('WH260602GUEST')).toBeVisible()
  })
})
