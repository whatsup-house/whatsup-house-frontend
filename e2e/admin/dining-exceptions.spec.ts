import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { setupAdminContext } from '../fixtures/mocks'
import {
  DINING_TABLE_B_ID,
  DINING_VENUE_CASE_ID,
  VENUE_OVEN,
  blockUnmockedApis,
  mockAdminDiningApis,
  mockMatchingRules,
  mockVenueException,
} from '../fixtures/dining-mocks'
import type { DiningExceptionStatusRequest, DiningMatchingRules } from '@/lib/api/types'

const waitForApi = (page: Page, method: string, path: string) =>
  page.waitForRequest((req) => req.method() === method && new URL(req.url()).pathname === path)

// DINING-A-02: 예외함 VENUE 처리 · 매칭 규칙 기본값 저장 (PRD 18장 운영 예외)
test.describe('관리자 - 우연한 식탁 예외함·설정', () => {
  test.beforeEach(async ({ page }) => {
    await blockUnmockedApis(page)
    await setupAdminContext(page)
    await mockAdminDiningApis(page, { matched: true })
  })

  test('식당 미배정(VENUE) 예외에 식당을 고르고 메모를 남겨 처리한다', async ({ page }) => {
    await page.goto('/admin/dining/exceptions')
    await expect(page.getByRole('heading', { name: '예외함' })).toBeVisible()
    await expect(page.getByText(mockVenueException.reason)).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/dining-exceptions-01-open.png')

    // 식당 선택 → 버튼 문구가 바뀌지만 메모 없이는 비활성
    await page.getByLabel(/배정할 식당/).selectOption(VENUE_OVEN.id)
    const resolve = page.getByRole('button', { name: '식당 배정 후 처리' })
    await expect(resolve).toBeDisabled()
    await page.getByLabel('처리 메모').fill('   ')
    await expect(resolve).toBeDisabled()
    await page.getByLabel('처리 메모').fill('뚝섬 오븐 사장님과 통화해 6인석 확보')
    await expect(resolve).toBeEnabled()
    await captureFullPage(page, 'e2e/screenshots/admin/dining-exceptions-02-filled.png')

    // 식당 배정(PUT) 뒤 처리 완료(PATCH)
    const venueRequest = waitForApi(page, 'PUT', `/api/admin/dining/tables/${DINING_TABLE_B_ID}/venue`)
    const patchRequest = waitForApi(page, 'PATCH', `/api/admin/dining/exceptions/${DINING_VENUE_CASE_ID}`)
    await resolve.click()
    expect((await venueRequest).postDataJSON()).toEqual({ venueId: VENUE_OVEN.id })
    const body = (await patchRequest).postDataJSON() as DiningExceptionStatusRequest
    expect(body).toEqual({ status: 'RESOLVED', note: '뚝섬 오븐 사장님과 통화해 6인석 확보' })

    await expect(page.getByText('예외를 처리했어요.')).toBeVisible()
    await expect(page.getByText('처리할 예외가 없어요.')).toBeVisible()

    // 해결 탭에 메모와 함께 남는다
    await page.getByRole('button', { name: '해결', exact: true }).click()
    await expect(page.getByText('뚝섬 오븐 사장님과 통화해 6인석 확보')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/dining-exceptions-03-resolved.png')
  })

  test('설정 페이지에서 매칭 규칙 기본값을 저장한다', async ({ page }) => {
    await page.goto('/admin/dining/settings')
    await expect(page.getByRole('heading', { name: '매칭 규칙 기본값' })).toBeVisible()
    const maxAgeGap = page.locator('input[name="maxAgeGap"]')
    await expect(maxAgeGap).toHaveValue(String(mockMatchingRules.maxAgeGap))
    await expect(page.getByText(VENUE_OVEN.name)).toBeVisible()

    await maxAgeGap.fill('6')
    await page.locator('input[name="tableSizeMax"]').fill('5')
    await page.locator('input[name="weights.mbti"]').fill('1.5')
    await captureFullPage(page, 'e2e/screenshots/admin/dining-settings-01-rules.png')

    const putRequest = waitForApi(page, 'PUT', '/api/admin/dining/settings/matching-rules')
    await page.getByRole('button', { name: '매칭 규칙 저장' }).click()
    const body = (await putRequest).postDataJSON() as DiningMatchingRules
    // PUT 은 전체 교체 — 안 바꾼 값도 그대로 보낸다
    expect(body).toEqual({
      ...mockMatchingRules,
      maxAgeGap: 6,
      tableSizeMax: 5,
      weights: { ...mockMatchingRules.weights, mbti: 1.5 },
    })
    await expect(page.getByText('매칭 규칙을 저장했어요.')).toBeVisible()
  })
})
