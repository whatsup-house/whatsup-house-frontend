import { test, expect } from '@playwright/test'
import dayjs from 'dayjs'
import { captureFullPage } from '../fixtures/screenshot'
import { setupUserContext } from '../fixtures/mocks'
import {
  DINING_APPLICATION_ID,
  DINING_RESOLUTION_ID,
  DINING_SESSION_2_ID,
  DINING_SESSION_INFOS,
  DINING_TABLE_A_ID,
  DINING_TITLE,
  VENUE_SOBAN,
  blockUnmockedApis,
  diningApplication,
  diningTableDetail,
  mockDiningTableApis,
  mockMyDiningApplications,
} from '../fixtures/dining-mocks'
import type { DiningApplicationItem } from '@/lib/api/types'

const [session1, session2] = DINING_SESSION_INFOS

// DINING-U-02: 마이페이지 우연한 식탁 상태 카드 — 단계 전환 · 매칭 실패 해결 선택 · 사전 취소 (PRD 18장 7·10단계)
test.describe('회원 - 우연한 식탁 상태 카드', () => {
  let applications: DiningApplicationItem[] = []

  test.beforeEach(async ({ page }) => {
    applications = []
    await blockUnmockedApis(page)
    await setupUserContext(page)
    await mockMyDiningApplications(page, () => applications)
  })

  test('매칭 대기 → 매칭 중 → 확정으로 바뀌고 확정 카드에서 테이블 상세로 간다', async ({ page }) => {
    await mockDiningTableApis(page, diningTableDetail())
    const card = page.locator('.rounded-card', { hasText: DINING_TITLE })

    applications = [diningApplication({ matchStatus: 'WAITING' })]
    await page.goto('/mypage?tab=applications')
    await expect(card.getByText('매칭 대기', { exact: true })).toBeVisible()
    await expect(card.getByText(/에 매칭을 시작해요\./)).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/dining-status-01-waiting.png')

    // 관리자가 매칭 실행 → 제안(확정 유예 중)
    const confirmAt = dayjs().add(30, 'minute').format('YYYY-MM-DDTHH:mm:ss')
    applications = [diningApplication({
      matchStatus: 'MATCHING',
      assignedSession: session1,
      table: { id: DINING_TABLE_A_ID, status: 'PROPOSED', confirmAt },
    })]
    await page.reload()
    await expect(card.getByText('매칭 중', { exact: true })).toBeVisible()
    await expect(card.getByText(/에 확정될 예정이에요\./)).toBeVisible()
    await expect(card.getByRole('link', { name: '테이블 보기' })).toHaveCount(0)
    await captureFullPage(page, 'e2e/screenshots/user/dining-status-02-matching.png')

    // 즉시 확정 → 테이블 보기 링크
    applications = [diningApplication({
      matchStatus: 'CONFIRMED',
      assignedSession: session1,
      table: { id: DINING_TABLE_A_ID, status: 'CONFIRMED', confirmAt: null },
    })]
    await page.reload()
    await expect(card.getByText('확정', { exact: true })).toBeVisible()
    await expect(card.getByText('테이블이 확정됐어요. 함께할 사람과 식당을 확인해보세요.')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/dining-status-03-confirmed.png')

    await card.getByRole('link', { name: '테이블 보기' }).click()
    await expect(page).toHaveURL(`/dining/tables/${DINING_TABLE_A_ID}`)
    await expect(page.getByText(VENUE_SOBAN.name)).toBeVisible()
  })

  test('대체 회차 제안 카드에서 다른 날짜로 옮긴다 (TRANSFER)', async ({ page }) => {
    applications = [diningApplication({
      matchStatus: 'ALTERNATIVE_OFFERED',
      candidateSessions: [session1],
      resolutionId: DINING_RESOLUTION_ID,
    })]
    await page.goto('/mypage?tab=applications')
    await expect(page.getByText('대체 날짜 제안', { exact: true })).toBeVisible()
    await expect(page.getByText('어떻게 할까요?')).toBeVisible()

    // 날짜를 고르기 전엔 옮기기 비활성
    const transfer = page.getByRole('button', { name: '이 날짜로 옮기기' })
    await expect(transfer).toBeDisabled()
    await page.getByRole('radio', { name: /을지로/ }).check()
    await expect(transfer).toBeEnabled()
    await captureFullPage(page, 'e2e/screenshots/user/dining-status-04-alternative.png')

    await transfer.click()
    const dialog = page.getByRole('dialog', { name: '선택한 날짜로 신청을 옮길까요?' })
    await expect(dialog).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/dining-status-05-transfer-confirm.png' })

    // 옮긴 뒤엔 새 회차로 다시 매칭 대기
    applications = [diningApplication({ matchStatus: 'TRANSFERRED', candidateSessions: [session2] })]
    const chooseRequest = page.waitForRequest((req) =>
      req.method() === 'POST' && new URL(req.url()).pathname === `/api/dining/resolutions/${DINING_RESOLUTION_ID}/choose`)
    await dialog.getByRole('button', { name: '이 날짜로 옮기기' }).click()
    expect((await chooseRequest).postDataJSON()).toEqual({ choice: 'TRANSFER', sessionId: DINING_SESSION_2_ID })

    await expect(page.getByText('선택이 반영됐어요.')).toBeVisible()
    await expect(page.getByText('매칭 대기', { exact: true })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/dining-status-06-transferred.png')
  })

  test('회차 시작 2일 전까지만 사전 취소할 수 있다', async ({ page }) => {
    const tomorrow = { ...session1, eventDate: dayjs().add(1, 'day').format('YYYY-MM-DD') }
    const lateId = 'd3000000-0000-0000-0000-000000000002'
    applications = [
      // 7일 뒤 회차 → 취소 가능
      diningApplication({ matchStatus: 'WAITING' }),
      // 내일 회차에 확정 → 취소 기한 지남
      diningApplication({
        id: lateId,
        matchStatus: 'CONFIRMED',
        assignedSession: tomorrow,
        candidateSessions: [tomorrow],
        table: { id: DINING_TABLE_A_ID, status: 'CONFIRMED', confirmAt: null },
      }),
    ]
    await page.goto('/mypage?tab=applications')

    const cancelButtons = page.getByRole('button', { name: '신청 취소', exact: true })
    await expect(cancelButtons).toHaveCount(2)
    await expect(cancelButtons.nth(0)).toBeEnabled()
    await expect(cancelButtons.nth(1)).toBeDisabled()
    await expect(page.getByText('회차 시작 2일 전이 지나 취소할 수 없어요.')).toHaveCount(1)
    await captureFullPage(page, 'e2e/screenshots/user/dining-status-07-cancel-window.png')

    await cancelButtons.nth(0).click()
    const dialog = page.getByRole('dialog', { name: '신청을 취소할까요?' })
    await expect(dialog).toBeVisible()
    const cancelRequest = page.waitForRequest((req) =>
      req.method() === 'POST' && new URL(req.url()).pathname === `/api/dining/applications/${DINING_APPLICATION_ID}/cancel`)
    await dialog.getByRole('button', { name: '신청 취소하기' }).click()
    await cancelRequest
    await expect(page.getByText('신청을 취소했어요.')).toBeVisible()
  })
})
