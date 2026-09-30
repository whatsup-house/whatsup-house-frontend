import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupAdminContext } from '../fixtures/mocks'
import {
  DINING_SESSION_ID,
  DINING_TABLE_A_ID,
  DINING_TABLE_B_ID,
  DINING_TITLE,
  TABLE_A_MEMBERS,
  UNASSIGNED_PARTICIPANT,
  VENUE_SOBAN,
  apiError,
  blockUnmockedApis,
  mockAdminDiningApis,
} from '../fixtures/dining-mocks'
import { tableLabel } from '@/lib/utils/diningStatus'

const CONSOLE_PATH = `/admin/dining/sessions/${DINING_SESSION_ID}`
const LABEL_A = tableLabel(DINING_TABLE_A_ID)
const LABEL_B = tableLabel(DINING_TABLE_B_ID)
const haeun = TABLE_A_MEMBERS[4]

const pathOf = (url: string) => new URL(url).pathname
const waitForApi = (page: Page, method: string, path: string) =>
  page.waitForRequest((req) => req.method() === method && pathOf(req.url()) === path)

// 대시보드 타일 값(라벨 바로 다음 줄)
const tileValue = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).first().locator('xpath=following-sibling::p[1]')

// 테이블 탭의 카드. 카드 제목(굵은 라벨)으로 찾는다 — 다른 카드의 '이동' 옵션에도 라벨이 있어서 텍스트만으로는 못 가른다
const tableCard = (page: Page, label: string) =>
  page.locator('ul.grid > li').filter({ has: page.locator('span.font-bold', { hasText: label }) })

async function setup(page: Page, matched = false) {
  await blockUnmockedApis(page)
  await setupAdminContext(page)
  await mockAdminDiningApis(page, { matched })
  // 매칭 실행·전체 확정·해체 등은 window.confirm 으로 한 번 더 묻는다
  page.on('dialog', (dialog) => dialog.accept())
}

// DINING-A-01: 대시보드 → 회차 콘솔 → 지금 매칭 실행 → 테이블 조정 → 전체 즉시 확정 → 식당 배정 → 참석·피드백 (PRD 18장 4~9·12단계)
test.describe('관리자 - 우연한 식탁 회차 콘솔', () => {
  test('시드 참가자 12명으로 매칭을 실행하고 조정·확정·식당 배정 후 참석·피드백 요약을 본다', async ({ page }) => {
    await setup(page)

    // 1. 대시보드 타일 · 회차 카드
    await page.goto('/admin/dining')
    await expect(tileValue(page, '다가오는 회차')).toHaveText('2개')
    await expect(tileValue(page, '대기 신청자')).toHaveText('12명')
    await expect(tileValue(page, '결제 완료')).toHaveText('12명')
    await expect(tileValue(page, '열린 예외')).toHaveText('1건')
    await expect(page.getByRole('heading', { name: '다가오는 회차 2개' })).toBeVisible()
    const sessionCard = page.getByRole('link', { name: new RegExp(`성수 · ${DINING_TITLE}`) })
    await expect(sessionCard).toContainText('12/12명')
    await expect(sessionCard).toContainText('실행 예정')
    await captureFullPage(page, 'e2e/screenshots/admin/dining-01-dashboard.png')

    // 2. 회차 콘솔 — 신청자 12명
    await sessionCard.click()
    await expect(page).toHaveURL(CONSOLE_PATH)
    await expect(page.getByRole('heading', { name: DINING_TITLE })).toBeVisible()
    await expect(page.getByText('신청 12명 · 결제 미완료 0명')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/dining-02-console-applicants.png')

    // 3. 지금 매칭 실행 (confirm 수락) → 결과 토스트
    const runRequest = waitForApi(page, 'POST', `/api/admin/dining/sessions/${DINING_SESSION_ID}/match-runs`)
    await page.getByRole('button', { name: '지금 매칭 실행' }).click()
    await runRequest
    await expect(page.getByText('매칭 완료: 후보 12명 → 테이블 2개, 미배정 1명')).toBeVisible()
    await expect(page.getByRole('button', { name: '다시 실행' })).toBeVisible()

    // 4. 테이블 탭 — 제안 카드 2개 + 미배정 1명(사유)
    await page.getByRole('button', { name: '테이블', exact: true }).click()
    await expect(page.getByText('테이블 2개 · 미배정 1명')).toBeVisible()
    const cardA = tableCard(page, LABEL_A)
    const cardB = tableCard(page, LABEL_B)
    await expect(cardA.getByText('제안', { exact: true })).toBeVisible()
    await expect(cardB.getByText('제안', { exact: true })).toBeVisible()
    await expect(cardA).toContainText('분 후 확정')
    await expect(cardA).toContainText('78%')
    await expect(page.getByRole('heading', { name: '미배정 1명' })).toBeVisible()
    await expect(page.getByText(`${UNASSIGNED_PARTICIPANT.nickname} · 나이 차 초과`)).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/dining-03-tables-proposed.png')

    // 5. 멤버 이동 셀렉트 → move 요청 (A → B)
    const moveRequest = waitForApi(page, 'POST', `/api/admin/dining/tables/${DINING_TABLE_A_ID}/members/${haeun.memberId}/move`)
    await page.getByLabel(`${haeun.nickname} 다른 테이블로 이동`).selectOption(DINING_TABLE_B_ID)
    expect((await moveRequest).postDataJSON()).toEqual({ targetTableId: DINING_TABLE_B_ID })
    await expect(page.getByText('테이블을 조정했어요.')).toBeVisible()
    await expect(cardB).toContainText(haeun.nickname)
    await expect(cardA).not.toContainText(haeun.nickname)
    await expect(cardB.getByText('수동', { exact: true })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/dining-04-member-moved.png')

    // 6. 전체 즉시 확정 → 제안 테이블마다 confirm-now
    const confirmedIds: string[] = []
    page.on('request', (req) => {
      const match = pathOf(req.url()).match(/^\/api\/admin\/dining\/tables\/([^/]+)\/confirm-now$/)
      if (req.method() === 'POST' && match) confirmedIds.push(match[1])
    })
    await page.getByRole('button', { name: '전체 즉시 확정 (2)' }).click()
    await expect.poll(() => confirmedIds.slice().sort()).toEqual([DINING_TABLE_A_ID, DINING_TABLE_B_ID])
    await expect(page.getByText('확정 2개', { exact: true })).toBeVisible()
    await expect(cardA.getByText('확정', { exact: true })).toBeVisible()
    await expect(cardB.getByText('확정', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '전체 즉시 확정 (0)' })).toBeDisabled()
    expect(confirmedIds).toHaveLength(2)
    await captureFullPage(page, 'e2e/screenshots/admin/dining-05-tables-confirmed.png')

    // 7. 식당·단체방 탭 — 테이블 A 에 식당 배정
    await page.getByRole('button', { name: '식당·단체방' }).click()
    const venueSelect = page.getByLabel(`${LABEL_A} 배정 식당`)
    await expect(venueSelect).toHaveValue('')
    await expect(page.getByText('채팅방 생성됨')).toHaveCount(2)
    const venueRequest = waitForApi(page, 'PUT', `/api/admin/dining/tables/${DINING_TABLE_A_ID}/venue`)
    await venueSelect.selectOption(VENUE_SOBAN.id)
    expect((await venueRequest).postDataJSON()).toEqual({ venueId: VENUE_SOBAN.id })
    await expect(page.getByText(`${VENUE_SOBAN.name}을(를) 배정했어요.`)).toBeVisible()
    await expect(venueSelect).toHaveValue(VENUE_SOBAN.id)
    await captureFullPage(page, 'e2e/screenshots/admin/dining-06-venue-assigned.png')

    // 8. 참석·피드백 탭 — 체크인 현황 · 피드백 요약
    await page.getByRole('button', { name: '참석·피드백' }).click()
    await expect(page.getByText('체크인 10/11명')).toBeVisible()
    await expect(page.getByRole('button', { name: '노쇼 확정' })).toHaveCount(1)
    await expect(page.getByText('82% (9/11)')).toBeVisible()
    await expect(page.getByText('예 6 · 글쎄 2 · 아니오 1')).toBeVisible()
    await expect(page.getByText('1건', { exact: true })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/dining-07-attendance-feedback.png')
  })

  test('규칙 위반으로 이동이 거절되면(400 TABLE_RULE_VIOLATION) 토스트를 띄우고 멤버를 원래 테이블로 되돌린다', async ({ page }) => {
    await setup(page, true)
    const violation = { tableId: DINING_TABLE_B_ID, rule: 'AGE_GAP', message: `${LABEL_B} 테이블 나이 차가 7살을 넘어요` }
    await page.route(/\/api\/admin\/dining\/tables\/[^/]+\/members\/[^/]+\/move$/, (route) =>
      route.fulfill(apiError(400, 'TABLE_RULE_VIOLATION', '테이블 규칙을 어기는 조정이에요.', { violations: [violation] })))

    await page.goto(CONSOLE_PATH)
    await page.getByRole('button', { name: '테이블', exact: true }).click()
    const cardA = tableCard(page, LABEL_A)
    const cardB = tableCard(page, LABEL_B)
    await expect(cardA).toContainText(haeun.nickname)

    const moveRequest = waitForApi(page, 'POST', `/api/admin/dining/tables/${DINING_TABLE_A_ID}/members/${haeun.memberId}/move`)
    await page.getByLabel(`${haeun.nickname} 다른 테이블로 이동`).selectOption(DINING_TABLE_B_ID)
    await moveRequest

    await expect(page.getByText(`테이블 규칙을 어기는 조정이에요. (${violation.message})`)).toBeVisible()
    await expect(cardB.getByText(`규칙 위반: ${violation.message}`)).toBeVisible()
    await expect(cardA).toContainText(haeun.nickname)
    await expect(cardB).not.toContainText(haeun.nickname)
    await captureFullPage(page, 'e2e/screenshots/admin/dining-08-move-violation.png')
  })
})
