import { test, expect } from '@playwright/test'
import { setupGuestContext } from '../fixtures/mocks'

// KAN-382: 릴스형 피드 — 목 데이터 첫 칸은 영상(릴스)
test.describe('피드 탭', () => {
  test('첫 릴스가 재생되고 가장자리 길게 누르면 2배속, 가운데 길게 누르면 일시정지된다', async ({ page }) => {
    await setupGuestContext(page)
    await page.goto('/feed')

    const first = page.locator('[data-feed-index="0"]')
    await expect(first.getByText('whatsup.house')).toBeVisible()
    await expect(page.locator('nav').getByRole('link', { name: '피드' })).toHaveClass(/text-primary/)

    // 캡션은 2줄로 잘리고 '더 보기'가 보인다
    const more = first.getByText('… 더 보기', { exact: true })
    await expect(more).toBeVisible()
    await more.click()
    await expect(more).toBeHidden()

    const video = first.locator('video')
    const state = () => video.evaluate((v: HTMLVideoElement) => ({ rate: v.playbackRate, paused: v.paused }))
    await expect.poll(async () => (await state()).paused, { timeout: 10_000 }).toBe(false)

    const box = (await first.getByTestId('feed-gesture-layer').boundingBox())!
    const y = box.y + box.height / 2

    // 왼쪽 가장자리 홀드 → 2배속, 떼면 1배속
    await page.mouse.move(box.x + 10, y)
    await page.mouse.down()
    await expect.poll(async () => (await state()).rate).toBe(2)
    await expect(page.getByText('2x')).toBeVisible()
    await page.mouse.up()
    await expect.poll(async () => (await state()).rate).toBe(1)

    // 가운데 홀드 → 일시정지, 떼면 다시 재생
    await page.mouse.move(box.x + box.width / 2, y)
    await page.mouse.down()
    await expect.poll(async () => (await state()).paused).toBe(true)
    await page.mouse.up()
    await expect.poll(async () => (await state()).paused).toBe(false)
  })

  test('엔드 카드에 도달하면 재생 중인 영상이 없다', async ({ page }) => {
    await setupGuestContext(page)
    await page.goto('/feed')
    const feed = page.getByTestId('feed')
    const end = page.getByTestId('feed-end')
    await expect(page.locator('[data-feed-index="0"]')).toBeVisible()

    // 다음 페이지가 다 붙을 때까지 맨 아래로 계속 스크롤
    await expect
      .poll(
        async () => {
          await feed.evaluate((el) => el.scrollTo(0, el.scrollHeight))
          return end.isVisible()
        },
        { timeout: 30_000, intervals: [500] },
      )
      .toBe(true)
    await feed.evaluate((el) => el.scrollTo(0, el.scrollHeight))
    await expect
      .poll(() => page.locator('video').evaluateAll((vs) => vs.filter((v) => !(v as HTMLVideoElement).paused).length))
      .toBe(0)
  })
})
