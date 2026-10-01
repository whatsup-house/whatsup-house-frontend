import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { mockUserProfile, setupUserContext } from '../fixtures/mocks'
import {
  DINING_TABLE_A_ID,
  TABLE_A_MEMBERS,
  VENUE_SOBAN,
  apiError,
  blockUnmockedApis,
  checkInOpenSession,
  diningTableDetail,
  finishedSession,
  mockDiningTableApis,
} from '../fixtures/dining-mocks'
import type { DiningFeedbackRequest, DiningReportRequest, DiningTableDetail } from '@/lib/api/types'

const TABLE_PATH = `/dining/tables/${DINING_TABLE_A_ID}`
const API_PATH = `/api/dining/tables/${DINING_TABLE_A_ID}`
const [, junseo, seoyeon] = TABLE_A_MEMBERS

const waitForPost = (page: Page, path: string) =>
  page.waitForRequest((req) => req.method() === 'POST' && new URL(req.url()).pathname === path)

async function setup(page: Page, detail: DiningTableDetail) {
  await blockUnmockedApis(page)
  await setupUserContext(page)
  await mockDiningTableApis(page, detail)
}

// DINING-U-03: 테이블 상세 · 체크인 · 신고 · 행사 후 피드백 · 참가 이력 (PRD 18장 10~12단계)
test.describe('회원 - 우연한 식탁 테이블', () => {
  test('테이블 상세에서 식당·구성원 제한 소개·단체방을 보고 체크인 창 안에서 체크인한다', async ({ page }) => {
    await setup(page, diningTableDetail({ session: checkInOpenSession() }))
    await page.goto(TABLE_PATH)

    // 식당 (지도·가격대)
    await expect(page.getByText(VENUE_SOBAN.name)).toBeVisible()
    await expect(page.getByText(VENUE_SOBAN.address)).toBeVisible()
    await expect(page.getByText(`가격대 ${VENUE_SOBAN.priceRange}`)).toBeVisible()
    // 구성원 제한 소개: 닉네임·MBTI·관심사만
    await expect(page.getByText(`함께하는 멤버 ${TABLE_A_MEMBERS.length}명`)).toBeVisible()
    const junseoRow = page.getByRole('listitem').filter({ hasText: junseo.nickname })
    await expect(junseoRow).toContainText(junseo.mbti)
    for (const interest of junseo.interests) await expect(junseoRow).toContainText(interest)
    await expect(page.getByText(String(junseo.birthYear))).toHaveCount(0)
    await expect(page.getByRole('button', { name: '단체방 입장' })).toBeEnabled()
    await expect(page.getByText('참석 예정')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/dining-table-01-detail.png')

    // 체크인 (회차 시작 ±2시간)
    const checkIn = page.getByRole('button', { name: '체크인하기' })
    await expect(checkIn).toBeEnabled()
    const checkInRequest = waitForPost(page, `${API_PATH}/check-in`)
    await checkIn.click()
    await checkInRequest
    await expect(page.getByText('체크인했어요. 즐거운 식사 되세요!')).toBeVisible()
    await expect(page.getByRole('button', { name: '체크인 완료' })).toBeDisabled()
    await expect(page.getByText('참석 완료')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/dining-table-02-checked-in.png')
  })

  test('체크인 창 밖이면 체크인 버튼이 비활성이고 가능 시간을 안내한다', async ({ page }) => {
    // 기본 회차: 7일 뒤 19:00 시작 → 17:00 ~ 21:00
    await setup(page, diningTableDetail())
    await page.goto(TABLE_PATH)

    await expect(page.getByRole('button', { name: '체크인하기' })).toBeDisabled()
    await expect(page.getByText('체크인은 17:00 ~ 21:00 사이에 할 수 있어요.')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/dining-table-03-checkin-closed.png')
  })

  test('같은 테이블 멤버를 사유와 함께 신고한다', async ({ page }) => {
    await setup(page, diningTableDetail())
    await page.goto(TABLE_PATH)

    const report = page.getByRole('button', { name: '신고', exact: true })
    await expect(report).toBeDisabled()
    // 나(로그인 회원)는 신고 대상에서 빠진다
    await expect(page.getByLabel('신고할 멤버').locator('option', { hasText: seoyeon.nickname })).toHaveCount(1)
    await expect(page.getByLabel('신고할 멤버').locator('option', { hasText: mockUserProfile.nickname })).toHaveCount(0)
    await page.getByLabel('신고할 멤버').selectOption(seoyeon.userId)
    await report.click()

    const dialog = page.getByRole('dialog', { name: `${seoyeon.nickname}님을 신고할까요?` })
    await expect(dialog).toBeVisible()
    const confirm = dialog.getByRole('button', { name: '신고하기' })
    await expect(confirm).toBeDisabled()
    await dialog.getByPlaceholder('어떤 일이 있었는지 적어 주세요.').fill('식사 중 불쾌한 농담을 반복했어요.')
    await page.screenshot({ path: 'e2e/screenshots/user/dining-table-04-report-modal.png' })

    const reportRequest = waitForPost(page, `${API_PATH}/reports`)
    await confirm.click()
    const body = (await reportRequest).postDataJSON() as DiningReportRequest
    expect(body).toEqual({ reportedUserId: seoyeon.userId, reason: '식사 중 불쾌한 농담을 반복했어요.' })
    await expect(page.getByText('신고가 접수됐어요.')).toBeVisible()
    await expect(dialog).toHaveCount(0)
  })

  test('행사 후 피드백(별점 3·재참여·사람별 피하고 싶어요)을 보내고 참가 이력에서 제출 완료를 확인한다', async ({ page }) => {
    await setup(page, diningTableDetail({ status: 'DONE', session: finishedSession(), myAttendance: { status: 'ATTENDED', checkedInAt: null } }))

    // 테이블 종료 뒤엔 상세에 피드백 진입점이 생긴다
    await page.goto(TABLE_PATH)
    await page.getByRole('link', { name: '피드백 남기기' }).click()
    await expect(page).toHaveURL(`${TABLE_PATH}/feedback`)

    const submit = page.getByRole('button', { name: '피드백 보내기' })
    await expect(submit).toBeDisabled()
    await expect(page.getByText('만족도 3항목과 재참여 의향을 선택해 주세요.')).toBeVisible()

    for (const score of ['테이블 전체', '대화', '식당']) {
      await page.getByRole('group', { name: score, exact: true }).getByRole('button', { name: '3점' }).click()
    }
    await page.getByRole('radio', { name: '네', exact: true }).click()
    const avoid = page.getByRole('group', { name: junseo.nickname, exact: true }).getByRole('button', { name: '피하고 싶어요' })
    await avoid.click()
    await expect(avoid).toHaveAttribute('aria-pressed', 'true')
    await expect(submit).toBeEnabled()
    await captureFullPage(page, 'e2e/screenshots/user/dining-feedback-01-form.png')

    const feedbackRequest = waitForPost(page, `${API_PATH}/feedback`)
    await submit.click()
    const body = (await feedbackRequest).postDataJSON() as DiningFeedbackRequest
    expect(body).toEqual({
      tableScore: 3,
      talkScore: 3,
      venueScore: 3,
      rejoinIntent: 'YES',
      peers: [{ userId: junseo.userId, kind: 'AVOID' }],
    })

    await expect(page.getByRole('heading', { name: '피드백을 보냈어요' })).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/dining-feedback-02-done.png')

    // 참가 이력
    await page.getByRole('link', { name: '참가 이력 보기' }).click()
    await expect(page).toHaveURL('/dining/history')
    await expect(page.getByRole('heading', { name: '우연한 식탁 참가 이력' })).toBeVisible()
    const latest = page.getByRole('listitem').filter({ hasText: VENUE_SOBAN.name })
    await expect(latest).toContainText('종료')
    await expect(latest).toContainText('참석 완료')
    await expect(latest).toContainText('피드백 제출 완료')
    await expect(page.getByText('을지로 한상')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/dining-history-01-list.png')
  })

  test('이미 피드백을 냈으면(409 FEEDBACK_ALREADY_SUBMITTED) 이미 제출됨 화면을 보여준다', async ({ page }) => {
    await setup(page, diningTableDetail({ status: 'DONE', session: finishedSession() }))
    await page.route((url) => url.pathname === `${API_PATH}/feedback`, (route) =>
      route.fulfill(apiError(409, 'FEEDBACK_ALREADY_SUBMITTED', '이미 피드백을 제출했어요.')))

    await page.goto(`${TABLE_PATH}/feedback`)
    for (const score of ['테이블 전체', '대화', '식당']) {
      await page.getByRole('group', { name: score, exact: true }).getByRole('button', { name: '4점' }).click()
    }
    await page.getByRole('radio', { name: '고민 중', exact: true }).click()
    await page.getByRole('button', { name: '피드백 보내기' }).click()

    await expect(page.getByRole('heading', { name: '이미 피드백을 제출했어요' })).toBeVisible()
    await expect(page.getByText('피드백은 테이블마다 한 번만 남길 수 있어요.')).toBeVisible()
    await expect(page.getByRole('button', { name: '피드백 보내기' })).toHaveCount(0)
    await captureFullPage(page, 'e2e/screenshots/user/dining-feedback-03-already-submitted.png')
  })
})
