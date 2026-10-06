import { test, expect } from '@playwright/test'
import { mockFeedApis, setupGuestContext } from '../fixtures/mocks'

// KAN-382: 릴스형 피드 — /api/feed 를 route 목으로 응답. 첫 칸은 영상(릴스)
test.describe('피드 탭', () => {
  test('첫 릴스가 재생되고 가장자리 길게 누르면 2배속, 가운데 길게 누르면 일시정지된다', async ({ page }) => {
    await setupGuestContext(page)
    await mockFeedApis(page)
    await page.goto('/feed')

    const first = page.locator('[data-feed-index="0"]')
    await expect(first.getByText('whatsup.house')).toBeVisible()
    await expect(page.locator('nav').getByRole('link', { name: '피드' })).toHaveClass(/text-primary/)

    // 캡션은 2줄로 잘리고(브라우저 기본 말줄임) 탭하면 펼쳐진다. 별도 '더 보기' 라벨은 없다
    const caption = first.getByTestId('feed-caption')
    const clamp = () => caption.evaluate((el) => ({ clamp: getComputedStyle(el).webkitLineClamp, cut: el.scrollHeight > el.clientHeight + 1 }))
    await expect(caption).toBeVisible()
    expect(await clamp()).toEqual({ clamp: '2', cut: true })
    await expect(first.getByText('더 보기')).toHaveCount(0)
    await caption.click()
    expect(await clamp()).toEqual({ clamp: 'none', cut: false })

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

  test('2배속 홀드 중 아래로 밀고 떼면 2배속이 고정되고, 다시 밀고 떼면 풀린다', async ({ page }) => {
    await page.addInitScript(() => {
      const calls: unknown[] = []
      ;(window as unknown as { __vibrations: unknown[] }).__vibrations = calls
      navigator.vibrate = (pattern) => (calls.push(pattern), true)
    })
    await setupGuestContext(page)
    await mockFeedApis(page)
    await page.goto('/feed')

    const feed = page.getByTestId('feed')
    const first = page.locator('[data-feed-index="0"]')
    const video = first.locator('video')
    const rate = () => video.evaluate((v: HTMLVideoElement) => v.playbackRate)
    const pill = first.getByTestId('feed-speed-pill')
    const lock = pill.locator('.lucide-lock')
    const vibrations = () => page.evaluate(() => (window as unknown as { __vibrations: unknown[] }).__vibrations)
    const scrolled = () => feed.evaluate((el) => el.scrollTop)
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused), { timeout: 10_000 }).toBe(false)

    // 실제 터치 입력 (안드로이드 크롬처럼 스크롤·pointercancel 판정을 거친다)
    const cdp = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
    const box = (await first.getByTestId('feed-gesture-layer').boundingBox())!
    const x = box.x + box.width - 10
    const y = box.y + box.height / 3
    const dragDown = async () => {
      for (let d = 10; d <= 100; d += 10) await touch('touchMove', x, y + d)
    }

    // 진동은 사용자 활성화 뒤에만 — 먼저 캡션을 한 번 탭한다
    const tapBox = (await first.getByTestId('feed-caption').boundingBox())!
    await touch('touchStart', tapBox.x + 5, tapBox.y + 5)
    await touch('touchEnd', 0, 0)
    const scrollTop = await scrolled()

    // 홀드 → 2배속, 아래로 밀면 '떼세요' 안내만 나오고 아직 고정되지 않는다
    await touch('touchStart', x, y)
    await expect.poll(rate).toBe(2)
    await expect(page.getByText('2배속을 고정하려면 아래로 미세요')).toBeVisible()
    await dragDown()
    await expect(page.getByText('2배속으로 고정하려면 손가락을 떼세요')).toBeVisible()
    expect(await rate()).toBe(2)
    await expect(lock).toHaveCount(0)
    expect(await scrolled()).toBe(scrollTop)
    // 대기(armed)되는 순간 진동 — 손가락이 닿아 있을 때
    expect(await vibrations()).toEqual([15, 30])
    // 떼는 순간 고정, 진동은 없다
    await touch('touchEnd', 0, 0)
    await expect(lock).toBeVisible()
    expect(await rate()).toBe(2)
    await expect(first.getByText('whatsup.house')).toBeVisible()
    expect(await scrolled()).toBe(scrollTop)
    expect(await vibrations()).toEqual([15, 30])

    // 고정은 다음 릴스(4번째 칸)에도 이어진다
    const next = page.locator('[data-feed-index="3"]')
    await next.scrollIntoViewIfNeeded()
    await expect.poll(() => next.locator('video').evaluate((v: HTMLVideoElement) => v.playbackRate)).toBe(2)
    await expect(next.getByTestId('feed-speed-pill').locator('.lucide-lock')).toBeVisible()
    await first.scrollIntoViewIfNeeded()
    await expect.poll(rate).toBe(2)

    // 다시 홀드 → 해제 안내, 아래로 밀면 '떼세요', 떼면 1배속. 해제 대기·해제에는 진동이 없다
    await touch('touchStart', x, y)
    await expect(page.getByText('보통 속도로 돌아가려면 아래로 미세요')).toBeVisible()
    expect(await vibrations()).toEqual([15, 30, 15])
    await dragDown()
    await expect(page.getByText('보통 속도로 돌아가려면 손가락을 떼세요')).toBeVisible()
    await expect(lock).toBeVisible()
    expect(await vibrations()).toEqual([15, 30, 15])
    await touch('touchEnd', 0, 0)
    await expect.poll(rate).toBe(1)
    expect(await vibrations()).toEqual([15, 30, 15])
    await expect(pill).toBeHidden()
    expect(await scrolled()).toBe(scrollTop)
  })

  test('아래로 밀었다가 다시 올리고 떼면 고정되지 않는다', async ({ page }) => {
    await page.addInitScript(() => {
      const calls: unknown[] = []
      ;(window as unknown as { __vibrations: unknown[] }).__vibrations = calls
      navigator.vibrate = (pattern) => (calls.push(pattern), true)
    })
    await setupGuestContext(page)
    await mockFeedApis(page)
    await page.goto('/feed')

    const feed = page.getByTestId('feed')
    const first = page.locator('[data-feed-index="0"]')
    const video = first.locator('video')
    const rate = () => video.evaluate((v: HTMLVideoElement) => v.playbackRate)
    const pill = first.getByTestId('feed-speed-pill')
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused), { timeout: 10_000 }).toBe(false)

    const cdp = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
    const box = (await first.getByTestId('feed-gesture-layer').boundingBox())!
    const x = box.x + box.width - 10
    const y = box.y + box.height / 3
    const tapBox = (await first.getByTestId('feed-caption').boundingBox())!
    await touch('touchStart', tapBox.x + 5, tapBox.y + 5)
    await touch('touchEnd', 0, 0)
    const scrollTop = await feed.evaluate((el) => el.scrollTop)

    await touch('touchStart', x, y)
    await expect.poll(rate).toBe(2)
    for (let d = 10; d <= 100; d += 10) await touch('touchMove', x, y + d)
    await expect(page.getByText('2배속으로 고정하려면 손가락을 떼세요')).toBeVisible()
    const vibrations = () => page.evaluate(() => (window as unknown as { __vibrations: unknown[] }).__vibrations)
    expect(await vibrations()).toEqual([15, 30])
    for (let d = 90; d >= 0; d -= 10) await touch('touchMove', x, y + d)
    await expect(page.getByText('2배속을 고정하려면 아래로 미세요')).toBeVisible()
    expect(await vibrations()).toEqual([15, 30])
    // 같은 홀드에서 다시 밀면 다시 진동, 올리면 진동 없음
    for (let d = 10; d <= 100; d += 10) await touch('touchMove', x, y + d)
    await expect(page.getByText('2배속으로 고정하려면 손가락을 떼세요')).toBeVisible()
    expect(await vibrations()).toEqual([15, 30, 30])
    for (let d = 90; d >= 0; d -= 10) await touch('touchMove', x, y + d)
    await expect(page.getByText('2배속을 고정하려면 아래로 미세요')).toBeVisible()
    await touch('touchEnd', 0, 0)
    await expect.poll(rate).toBe(1)
    await expect(pill).toBeHidden()
    expect(await feed.evaluate((el) => el.scrollTop)).toBe(scrollTop)
    expect(await vibrations()).toEqual([15, 30, 30])
  })

  test('엔드 카드에 도달하면 재생 중인 영상이 없다', async ({ page }) => {
    await setupGuestContext(page)
    await mockFeedApis(page)
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
