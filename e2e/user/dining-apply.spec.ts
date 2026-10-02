import { test, expect } from '@playwright/test'
import dayjs from 'dayjs'
import { captureFullPage } from '../fixtures/screenshot'
import { setupUserContext } from '../fixtures/mocks'
import {
  DINING_GATHERING_ID,
  DINING_SESSION_2_ID,
  DINING_SESSION_ID,
  DINING_TITLE,
  blockUnmockedApis,
  diningApplication,
  mockDiningApplyApis,
  mockDiningPrefill,
  mockMyDiningApplications,
} from '../fixtures/dining-mocks'
import type { ApplicationCreateRequest, DiningApplicationItem } from '@/lib/api/types'

const SELECTED = /(^|\s)bg-primary(\s|$)/

// DINING-U-01: 종류 페이지 → 희망 회차 2개 → 표준 폼(프리필) → 이용권 → 제출 → 마이페이지 "매칭 대기" (PRD 18장 1~3단계)
test.describe('회원 - 우연한 식탁 신청', () => {
  test('회차 2개를 우선순위대로 골라 프리필된 표준 폼으로 신청한다', async ({ page }) => {
    let applications: DiningApplicationItem[] = []
    await blockUnmockedApis(page)
    await setupUserContext(page)
    await mockDiningApplyApis(page)
    await mockMyDiningApplications(page, () => applications)

    // 1. 종류 페이지 → 신청하기 (우연한 식탁은 회차를 고르지 않아도 신청 흐름으로 간다)
    await page.goto(`/gatherings/${DINING_GATHERING_ID}`)
    await expect(page.getByText(DINING_TITLE).first()).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/dining-apply-01-detail.png')
    await page.getByRole('button', { name: '신청하기', exact: true }).click()
    await expect(page).toHaveURL(`/gatherings/${DINING_GATHERING_ID}/apply/dining`)

    // 2. 1단계 — 희망 회차 2개. 고른 순서가 우선순위다
    await expect(page.getByText('1/3')).toBeVisible()
    const next = page.getByRole('button', { name: '다음', exact: true })
    await expect(next).toBeDisabled()
    const first = page.getByRole('checkbox', { name: /19:00/ })
    const second = page.getByRole('checkbox', { name: /12:30/ })
    await first.click()
    await second.click()
    await expect(first).toHaveAttribute('aria-checked', 'true')
    await expect(second).toHaveAttribute('aria-checked', 'true')
    // 순위 배지는 버튼 안 첫 span
    await expect(first.locator('span').first()).toHaveText('1')
    await expect(second.locator('span').first()).toHaveText('2')
    await captureFullPage(page, 'e2e/screenshots/user/dining-apply-02-sessions.png')
    await next.click()

    // 3. 2단계 — 표준 폼은 지난 답변으로 채워져 있다 (출생연도·관심사는 프로필에 없는 프리필 전용 값)
    await expect(page.getByText('2/3')).toBeVisible()
    // 출생연도는 나이 질문과 같은 생년월일 UI. 생일을 모르는 프리필 연도(1999)는 'N년생'으로 보여준다 (KAN-387)
    await expect(page.getByPlaceholder('YYYY.MM.DD')).toBeVisible()
    await expect(page.getByText('1999년생', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '여성', exact: true })).toHaveClass(SELECTED)
    await expect(page.getByText('INFP 유형이군요!')).toBeVisible()
    await expect(page.getByRole('button', { name: '독서·글쓰기' })).toHaveClass(SELECTED)
    await expect(page.getByRole('button', { name: '전시·공연·아트' })).toHaveClass(SELECTED)
    await expect(page.getByRole('button', { name: '음악', exact: true })).not.toHaveClass(SELECTED)
    // 라벨 속 '(복수 선택)'은 떼고 복수 선택 질문 3개에 통일 문구만 붙는다 (KAN-387)
    await expect(page.getByText('(복수 선택 가능)', { exact: true })).toHaveCount(3)
    await expect(page.getByText('(복수 선택)')).toHaveCount(0)
    await captureFullPage(page, 'e2e/screenshots/user/dining-apply-03-form-prefilled.png')
    // 생년월일을 새로 넣으면 미리보기는 만 나이, 제출 값은 그 연도
    await page.getByPlaceholder('YYYY.MM.DD').fill('19960503')
    await expect(page.getByText(`만 ${dayjs().diff('1996-05-03', 'year')}세`)).toBeVisible()
    // 3단계에 갔다 되돌아오면 연도만 남으므로 다시 'N년생'
    await next.click()
    await expect(page.getByText('3/3')).toBeVisible()
    await page.getByRole('button', { name: '이전', exact: true }).click()
    await expect(page.getByText('1996년생', { exact: true })).toBeVisible()
    await next.click()

    // 4. 3단계 — 희망 날짜 요약 + 보유 이용권
    await expect(page.getByText('3/3')).toBeVisible()
    await expect(page.getByText('희망 날짜 (우선순위 순)')).toBeVisible()
    const ranked = page.locator('ol > li')
    await expect(ranked).toHaveCount(2)
    await expect(ranked.nth(0)).toContainText('19:00 · 성수')
    await expect(ranked.nth(1)).toContainText('12:30 · 을지로')
    await expect(page.getByText('남은 이용권')).toBeVisible()
    await expect(page.getByText('3회', { exact: true })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/dining-apply-04-ticket.png')

    // 5. 제출 — 본문: 종류 ID + 희망 회차(우선순위 순) + 프리필 답변
    applications = [diningApplication({ matchStatus: 'WAITING' })]
    const submitRequest = page.waitForRequest((req) => req.method() === 'POST' && new URL(req.url()).pathname === '/api/applications')
    await page.getByRole('button', { name: '신청하기', exact: true }).click()
    const body = (await submitRequest).postDataJSON() as ApplicationCreateRequest
    expect(body.gatheringId).toBe(DINING_GATHERING_ID)
    expect(body.candidateSessionIds).toEqual([DINING_SESSION_ID, DINING_SESSION_2_ID])
    const prefilled = Object.fromEntries(mockDiningPrefill.answers.map((a) => [a.questionKey, a.value]))
    expect(body.answers).toEqual(expect.arrayContaining([
      { questionId: 'q-birth-year', value: 1996 },
      { questionId: 'q-gender', value: prefilled.gender },
      { questionId: 'q-mbti', value: prefilled.mbti },
      { questionId: 'q-interests', value: prefilled.interests },
      { questionId: 'q-my-style', value: prefilled.my_style },
      { questionId: 'q-wanted-style', value: prefilled.wanted_style },
    ]))
    // 비워 둔 선택 항목(식이 제한)은 보내지 않는다
    expect(body.answers.find((a) => a.questionId === 'q-diet')).toBeUndefined()

    // 6. 마이페이지 신청 내역 — 상태 카드 "매칭 대기" + 실행 예정 시각
    await expect(page).toHaveURL('/mypage?tab=applications')
    await expect(page.getByText('매칭 대기', { exact: true })).toBeVisible()
    await expect(page.getByText(/에 매칭을 시작해요\./)).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/dining-apply-05-mypage-waiting.png')
  })
})
