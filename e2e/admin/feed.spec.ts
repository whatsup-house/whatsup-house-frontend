import { test, expect, type Page, type Request } from '@playwright/test'
import { setupAdminContext, apiRes, MOCK_GATHERING_ID } from '../fixtures/mocks'
import type { AdminFeedPost, AdminFeedPostPage } from '@/lib/api/types'

// KAN-383: 어드민 피드 관리 — 목록·필터·노출 토글·등록. /api/admin/feed 는 route 목.
const POSTS: AdminFeedPost[] = [
  {
    id: 'feed-post-1',
    media: [{ type: 'VIDEO', url: 'https://cdn.example.com/reel-1.mp4', posterUrl: '/feed/reel-1-poster.jpg' }],
    caption: '퇴근하고 바로 와도 괜찮아요',
    instagramUrl: 'https://www.instagram.com/whatsup_house/',
    postedAt: '2026-09-30T20:00:00',
    gathering: { id: MOCK_GATHERING_ID, title: '퇴근 게더링' },
    visible: true,
    createdAt: '2026-09-30T20:00:00',
    updatedAt: '2026-09-30T20:00:00',
  },
  {
    id: 'feed-post-2',
    media: [{ type: 'IMAGE', url: '/feed/home-1.jpg' }, { type: 'IMAGE', url: '/feed/review-1.jpg' }],
    caption: '숨겨둔 게시물',
    instagramUrl: null,
    postedAt: '2026-09-20T12:00:00',
    gathering: null,
    visible: false,
    createdAt: '2026-09-20T12:00:00',
    updatedAt: '2026-09-20T12:00:00',
  },
]

const pageOf = (content: AdminFeedPost[]): AdminFeedPostPage => ({
  content, page: 0, size: 20, totalElements: content.length, totalPages: 1,
})

async function mockAdminFeedApis(page: Page) {
  const writes: Request[] = []
  await page.route('**/api/admin/gatherings', (route) =>
    route.fulfill({ json: apiRes([{ id: 's-1', gatheringId: MOCK_GATHERING_ID, title: '퇴근 게더링', eventDate: '2026-10-10', status: 'OPEN', maxAttendees: 16 }]) }),
  )
  await page.route('**/api/admin/feed**', (route) => {
    const req = route.request()
    if (req.method() === 'GET') {
      const visible = new URL(req.url()).searchParams.get('visible')
      const content = visible === null ? POSTS : POSTS.filter((p) => String(p.visible) === visible)
      return route.fulfill({ json: apiRes(pageOf(content)) })
    }
    writes.push(req)
    return route.fulfill({ json: apiRes(POSTS[0]) })
  })
  return writes
}

test.describe('관리자 - 피드 관리', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminContext(page)
  })

  test('목록을 보여주고 노출/숨김 필터로 다시 조회한다', async ({ page }) => {
    await mockAdminFeedApis(page)
    await page.goto('/admin/feed')

    await expect(page.getByRole('link', { name: '피드 관리' })).toBeVisible()
    const cards = page.getByTestId('admin-feed-card')
    await expect(cards).toHaveCount(2)
    await expect(cards.first().getByText('퇴근 게더링')).toBeVisible()
    await expect(cards.first().getByText('2026.09.30 20:00')).toBeVisible()

    const hidden = page.waitForRequest((r) => r.url().includes('/api/admin/feed') && r.url().includes('visible=false'))
    await page.getByRole('button', { name: '숨김', exact: true }).click()
    await hidden
    await expect(cards).toHaveCount(1)
    await expect(cards.first().getByText('숨겨둔 게시물')).toBeVisible()
  })

  test('노출 토글을 누르면 바로 visibility PATCH 를 보낸다', async ({ page }) => {
    const writes = await mockAdminFeedApis(page)
    await page.goto('/admin/feed')

    const card = page.getByTestId('admin-feed-card').first()
    const patch = page.waitForRequest((r) => r.method() === 'PATCH')
    await card.getByRole('switch', { name: '피드 노출' }).click()
    const req = await patch
    expect(new URL(req.url()).pathname).toBe('/api/admin/feed/feed-post-1/visibility')
    expect(req.postDataJSON()).toEqual({ visible: false })
    // route 핸들러가 writes 에 기록하는 시점은 요청 발신보다 늦을 수 있어 poll 로 기다린다
    await expect.poll(() => writes.length).toBe(1)
  })

  test('등록 패널에서 영상 URL·캡션·게시일을 넣고 저장한다', async ({ page }) => {
    await mockAdminFeedApis(page)
    await page.goto('/admin/feed')

    await page.getByRole('button', { name: '피드 등록' }).click()
    await page.getByRole('button', { name: '+ 영상 URL 추가' }).click()
    await expect(page.getByText('mp4 공개 URL. R2 직접 업로드는 추후 지원')).toBeVisible()
    await page.getByLabel('영상 URL *').fill('https://cdn.example.com/new-reel.mp4')
    await page.getByLabel('포스터 이미지 URL').fill('https://cdn.example.com/new-reel.jpg')
    await page.getByRole('button', { name: '영상 추가' }).click()

    await page.getByLabel('캡션').fill('새 릴스 캡션')
    await page.getByLabel('게시일시').fill('2026-10-01T19:30')
    await page.getByLabel('연결 게더링').selectOption(MOCK_GATHERING_ID)

    const post = page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/api/admin/feed'))
    await page.getByRole('button', { name: '저장하기' }).click()
    expect((await post).postDataJSON()).toEqual({
      media: [{ type: 'VIDEO', url: 'https://cdn.example.com/new-reel.mp4', posterUrl: 'https://cdn.example.com/new-reel.jpg' }],
      caption: '새 릴스 캡션',
      postedAt: '2026-10-01T19:30:00',
      gatheringId: MOCK_GATHERING_ID,
      visible: true,
    })
    await expect(page.getByRole('heading', { name: '피드 등록' })).toHaveCount(0)
  })
})
