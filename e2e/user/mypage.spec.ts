import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupUserContext, mockApplications, mockUserProfile } from '../fixtures/mocks'

// AUTH-U-03: 마이페이지 신청 내역 조회 & 취소
// AUTH-U-04: 마이페이지 프로필 수정
test.describe('회원 - 마이페이지', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserContext(page)
    await page.route('**/api/applications/me**', (route) => {
      route.fulfill({ json: { success: true, message: 'OK', data: mockApplications } })
    })
  })

  test('신청 내역 탭 - 상태 필터를 사용한다', async ({ page }) => {
    await page.goto('/mypage')
    await expect(page.getByRole('button', { name: '신청 내역' })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/mypage-01-profile-tab.png')

    // 신청 내역 탭 이동
    await page.getByRole('button', { name: '신청 내역' }).click()
    await expect(page.getByText('퇴근 게더링')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/mypage-02-applications-all.png')

    // 대기중 필터
    await page.route('**/api/applications/me**', (route) => {
      route.fulfill({
        json: { success: true, message: 'OK', data: [mockApplications[0]] },
      })
    })
    await page.getByRole('button', { name: '대기중' }).click()
    await page.waitForTimeout(300)
    await captureFullPage(page, 'e2e/screenshots/user/mypage-03-applications-pending.png')

    // 확정 필터
    await page.route('**/api/applications/me**', (route) => {
      route.fulfill({
        json: { success: true, message: 'OK', data: [mockApplications[1]] },
      })
    })
    await page.getByRole('button', { name: '확정' }).click()
    await page.waitForTimeout(300)
    await captureFullPage(page, 'e2e/screenshots/user/mypage-04-applications-confirmed.png')
  })

  test('신청 내역 탭 - 신청을 취소한다', async ({ page }) => {
    await page.route('**/api/applications/app-001', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 204, body: '' })
      } else {
        route.continue()
      }
    })

    await page.goto('/mypage')
    await page.getByRole('button', { name: '신청 내역' }).click()
    await expect(page.getByText('퇴근 게더링')).toBeVisible()

    // "신청 취소" 버튼 클릭 (PENDING 상태)
    await page.getByText('신청 취소').first().click()
    await expect(page.getByText('정말 취소할까요?')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/mypage-05-cancel-confirm.png' })

    // 취소 확인
    await page.getByRole('button', { name: '취소 확인' }).click()
    await page.screenshot({ path: 'e2e/screenshots/user/mypage-06-cancel-done.png' })
  })

  test('신청 내역 탭 - 취소를 철회한다', async ({ page }) => {
    await page.goto('/mypage')
    await page.getByRole('button', { name: '신청 내역' }).click()
    await page.getByText('신청 취소').first().click()
    await expect(page.getByText('정말 취소할까요?')).toBeVisible()

    // 돌아가기
    await page.getByRole('button', { name: '돌아가기' }).click()
    await expect(page.getByText('정말 취소할까요?')).not.toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/mypage-07-cancel-revoked.png' })
  })

  test('프로필 탭 - 프로필 정보를 수정한다', async ({ page }) => {
    await page.route('**/api/users/me', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({ json: { success: true, message: 'OK', data: { ...mockUserProfile, nickname: '수정된닉네임' } } })
      } else {
        route.fulfill({ json: { success: true, message: 'OK', data: mockUserProfile } })
      }
    })

    await page.goto('/mypage')
    // 기본 탭은 프로필
    await expect(page.getByText('지은이')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/mypage-08-profile.png')

    // 프로필 수정 버튼 (aria-label로 접근)
    await page.getByRole('button', { name: '프로필 수정' }).click()
    await captureFullPage(page, 'e2e/screenshots/user/mypage-09-edit-overlay.png')

    // 닉네임 변경
    const nicknameInput = page.locator('input[value="잔잔한사람"]').or(page.getByRole('textbox').filter({ hasText: '' }).first())
    await nicknameInput.clear()
    await nicknameInput.fill('수정된닉네임')

    await captureFullPage(page, 'e2e/screenshots/user/mypage-10-edit-filled.png')

    // 저장
    const saveBtn = page.getByRole('button', { name: '저장' }).or(page.getByRole('button', { name: '수정 완료' })).first()
    await saveBtn.click()
    await page.screenshot({ path: 'e2e/screenshots/user/mypage-11-edit-saved.png' })
  })

  test('후기 탭 - 작성한 후기 목록을 확인한다', async ({ page }) => {
    await page.route('**/api/gatherings/**/reviews**', (route) => {
      route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: [
            {
              id: 'rev-001',
              authorNickname: '잔잔한사람',
              authorAnimalType: '',
              createdAt: '2026-05-01T12:00:00',
              gatheringId: 'g-001',
              gatheringTitle: '퇴근 게더링',
              type: 'TEXT',
              imageUrl: null,
              content: '정말 즐거운 시간이었어요!',
              likeCount: 3,
              isLikedByMe: false,
              isMyReview: true,
            },
          ],
        },
      })
    })

    await page.goto('/mypage')
    await page.getByRole('button', { name: '후기' }).click()
    await captureFullPage(page, 'e2e/screenshots/user/mypage-12-reviews.png')
  })
})
