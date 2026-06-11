import { test, expect } from '@playwright/test'
import { setupGuestContext, mockGatheringApis, mockHomeApis } from '../fixtures/mocks'

test.describe('공개 페이지 SEO', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestContext(page)
    await mockGatheringApis(page)
    await mockHomeApis(page)
  })

  test('홈 화면 메타 정보가 노출된다', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle('와썹하우스')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      '잔잔한 게 좋은 사람들의 공간',
    )
  })

  test('게더링 목록 메타 정보가 노출된다', async ({ page }) => {
    await page.goto('/gatherings')

    await expect(page).toHaveTitle('게더링 | 와썹하우스')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      '날짜별 소셜 게더링 일정을 확인하고 신청하세요.',
    )
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', '게더링 | 와썹하우스')
  })
})
