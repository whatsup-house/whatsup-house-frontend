import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupGuestContext, mockGatheringApis, MOCK_GATHERING_ID } from '../fixtures/mocks'

// AUTH-G-01: 비회원 게더링 신청
test.describe('비회원 - 게더링 신청', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestContext(page)
    await mockGatheringApis(page)
  })

  test('비회원으로 게더링을 신청하고 예약번호를 받는다', async ({ page }) => {
    await page.route(`**/api/gatherings/${MOCK_GATHERING_ID}/applications/guest`, (route) => {
      route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: {
            id: 'app-new',
            bookingNumber: 'WH260601Z9X8',
            gatheringId: MOCK_GATHERING_ID,
            status: 'PENDING',
            createdAt: '2026-05-12T10:00:00',
          },
        },
      })
    })

    // 1. 게더링 상세 진입
    await page.goto(`/gatherings/${MOCK_GATHERING_ID}`)
    await expect(page.getByText('퇴근 게더링')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/guest/apply-01-detail.png' })

    // 2. 신청하기 버튼 → 신청 방법 모달
    await page.getByRole('button', { name: '신청하기' }).click()
    await expect(page.getByText('신청 방법을 선택해주세요')).toBeVisible()
    await expect(page.getByRole('button', { name: /로그인 없이 신청하기/ })).toBeVisible()
    await page.waitForTimeout(350)
    await page.screenshot({ path: 'e2e/screenshots/guest/apply-02-modal.png', animations: 'disabled' })

    // 3. 로그인 없이 신청하기
    await page.getByRole('button', { name: '로그인 없이 신청하기' }).click()
    await expect(page).toHaveURL(`/gatherings/${MOCK_GATHERING_ID}/apply?type=guest`)
    await captureFullPage(page, 'e2e/screenshots/guest/apply-03-form.png')

    // 4. 신청 폼 작성
    await page.getByPlaceholder('실명을 입력해주세요').fill('홍길동')
    await page.getByPlaceholder('01012345678').fill('01099998888')
    await page.getByRole('button', { name: '남성' }).click()
    await page.getByPlaceholder('나이를 입력해주세요').fill('28')

    await captureFullPage(page, 'e2e/screenshots/guest/apply-04-form-filled.png')

    // 5. 신청 완료하기
    await page.getByRole('button', { name: '신청 완료하기' }).click()

    // 6. 완료 페이지 확인 (호스트 승인 단계 안내)
    await expect(page).toHaveURL(`/gatherings/${MOCK_GATHERING_ID}/apply/complete?bookingNumber=WH260601Z9X8`)
    await expect(page.getByText('신청이 완료됐어요!')).toBeVisible()
    await expect(page.getByText('호스트가 확인 후 예약 확정을 알려드릴게요')).toBeVisible()
    await expect(page.getByText('WH260601Z9X8')).toBeVisible()
    // 현장 결제 안내 멘트는 완료 화면에서 노출되지 않아야 한다
    await expect(page.getByText('참가비는 당일 현장에서 결제해주세요')).toHaveCount(0)
    // 입금 계좌 안내는 확정 페이지에서만 노출되어야 한다
    await expect(page.getByText('우리은행 1002-157-849052')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '예약번호로 신청 상태 조회하기' })).toBeVisible()
    await expect(page.getByText('홈으로 돌아가기')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/apply-05-complete.png')

    // 7. 예약번호 복사 버튼 존재 확인 (clipboard API는 테스트 환경에서 제한될 수 있음)
    await expect(page.getByRole('button', { name: '복사' })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/guest/apply-06-copied.png')
  })

  test('필수 항목 미입력 시 제출이 막힌다', async ({ page }) => {
    await page.goto(`/gatherings/${MOCK_GATHERING_ID}/apply?type=guest`)

    // 성별 선택 없이 바로 제출
    await page.getByPlaceholder('실명을 입력해주세요').fill('홍길동')
    await page.getByPlaceholder('01012345678').fill('01099998888')
    await page.getByPlaceholder('나이를 입력해주세요').fill('28')
    await page.getByRole('button', { name: '신청 완료하기' }).click()

    await expect(page.getByText('성별을 선택해주세요.')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/guest/apply-error-gender.png' })
  })
})
