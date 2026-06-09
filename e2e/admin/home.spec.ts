import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import {
  setupAdminContext,
  mockAdminHomeApis,
  MOCK_HERO_CAROUSEL_SLIDES,
  MOCK_ADMIN_HOME_REVIEWS,
} from '../fixtures/mocks'

// ADMIN-04: 홈화면 관리 - 히어로 캐러셀
// ADMIN-05: 홈화면 관리 - 홈 후기
// 참고: 두 훅(useAdminCarouselSlides / useAdminHomeReviews)은 실제 API를 호출하므로
//       /api/admin/hero-carousel, /api/admin/home-reviews 를 page.route()로 인터셉트한다.
//       assertion은 mocks.ts에서 export한 원본 데이터를 직접 참조한다.
test.describe('관리자 - 홈화면 관리', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminContext(page)
    await mockAdminHomeApis(page)
  })

  // ── 히어로 캐러셀 ──────────────────────────────────────────────────────────

  test('히어로 캐러셀 슬라이드 목록이 표시된다', async ({ page }) => {
    await page.goto('/admin/home')
    // 훅의 MOCK_HERO_CAROUSEL_SLIDES[0].title을 직접 참조 → 데이터 변경 시 자동 반영
    await expect(page.getByText(MOCK_HERO_CAROUSEL_SLIDES[0].title)).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/home-01-carousel-list.png')
  })

  test('슬라이드를 추가한다', async ({ page }) => {
    await page.goto('/admin/home')

    const addBtn = page.getByRole('button', { name: /슬라이드 추가/ })
    await addBtn.click()
    await captureFullPage(page, 'e2e/screenshots/admin/home-02-carousel-add-panel.png')

    const labelInput = page.getByPlaceholder('슬라이드에 표시될 제목')
    await labelInput.fill('신규 슬라이드')

    await captureFullPage(page, 'e2e/screenshots/admin/home-03-carousel-add-filled.png')

    await page.getByRole('button', { name: '저장하기' }).last().click()
    await page.screenshot({ path: 'e2e/screenshots/admin/home-04-carousel-added.png' })
  })

  test('슬라이드 노출/비노출을 토글한다', async ({ page }) => {
    await page.goto('/admin/home')
    await expect(page.getByText(MOCK_HERO_CAROUSEL_SLIDES[0].title)).toBeVisible()

    await page.getByText(MOCK_HERO_CAROUSEL_SLIDES[0].title).first().click({ force: true })
    const toggleBtn = page.getByRole('button', { name: /노출|비노출|활성|비활성/ }).first()
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.click()
    await page.screenshot({ path: 'e2e/screenshots/admin/home-05-carousel-toggled.png' })
  })

  test('슬라이드를 삭제한다', async ({ page }) => {
    await page.goto('/admin/home')

    await page.getByText(MOCK_HERO_CAROUSEL_SLIDES[0].title).first().click({ force: true })
    const deleteBtn = page.getByRole('button', { name: /삭제/ }).first()
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()
    await page.screenshot({ path: 'e2e/screenshots/admin/home-06-carousel-deleted.png' })
  })

  // ── 홈 후기 ───────────────────────────────────────────────────────────────

  test('홈 후기 목록이 표시된다', async ({ page }) => {
    await page.goto('/admin/home')
    await expect(page.getByText(MOCK_ADMIN_HOME_REVIEWS[0].nickname)).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/admin/home-07-review-list.png')
  })

  test('홈 노출 후기의 게더링명이 표시된다', async ({ page }) => {
    await page.goto('/admin/home')
    await expect(page.getByText(MOCK_ADMIN_HOME_REVIEWS[0].gatheringTitle).first()).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/admin/home-08-review-gathering-title.png' })
  })

  test('홈 후기를 추가한다', async ({ page }) => {
    await page.goto('/admin/home')

    const addBtn = page.getByRole('button', { name: /후기 추가/ })
    await addBtn.click()
    await captureFullPage(page, 'e2e/screenshots/admin/home-09-review-add-panel.png')

    const authorInput = page.getByPlaceholder('닉네임 또는 이름')
    await authorInput.fill('테스트유저')

    const contentInput = page.getByPlaceholder('홈 화면에 노출될 후기 내용을 입력해주세요')
    await contentInput.fill('정말 좋았어요!')

    await captureFullPage(page, 'e2e/screenshots/admin/home-10-review-add-filled.png')

    await page.getByRole('button', { name: '저장하기' }).last().click()
    await page.screenshot({ path: 'e2e/screenshots/admin/home-11-review-added.png' })
  })

  test('홈 후기를 수정한다', async ({ page }) => {
    await page.goto('/admin/home')
    // hover 오버레이가 클릭을 가로막으므로 force 옵션 사용
    await page.getByText(MOCK_ADMIN_HOME_REVIEWS[0].nickname).first().click({ force: true })
    await captureFullPage(page, 'e2e/screenshots/admin/home-12-review-edit-panel.png')
  })

  test('홈 후기 노출/비노출을 토글한다', async ({ page }) => {
    await page.goto('/admin/home')

    await page.getByText(MOCK_ADMIN_HOME_REVIEWS[0].nickname).first().click({ force: true })
    const toggleBtn = page.getByRole('button', { name: /노출|비노출/ }).first()
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.click()
    await page.screenshot({ path: 'e2e/screenshots/admin/home-13-review-toggled.png' })
  })
})
