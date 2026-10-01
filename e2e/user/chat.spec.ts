import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import {
  MOCK_INQUIRY_ROOM_ID,
  apiRes,
  mockChatApis,
  mockInquiryRoomDetail,
  mockInquiryWelcomeMessage,
  mockJoinedSystemMessage,
  mockSystemNoticeMessage,
  mockUserProfile,
  setupUserContext,
} from '../fixtures/mocks'

// CHAT-U-01: 채팅 목록 → 문의방 열기 → 텍스트 전송 → 내 말풍선 표시 (KAN-332)
test.describe('회원 - 채팅', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserContext(page)
    await mockChatApis(page)
  })

  test('문의방에서 보낸 메시지가 말풍선으로 보인다', async ({ page }) => {
    await page.goto('/chat')
    await expect(page.getByText('퇴근 게더링 3조')).toBeVisible()
    await captureFullPage(page, 'e2e/screenshots/user/chat-01-room-list.png')

    await page.getByRole('button', { name: /와썹하우스에 문의하기/ }).click()
    await expect(page).toHaveURL(new RegExp(`/chat/${MOCK_INQUIRY_ROOM_ID}$`))
    await expect(page.getByText('안녕하세요, 와썹하우스입니다. 무엇을 도와드릴까요?')).toBeVisible()

    const input = page.getByRole('textbox', { name: '메시지 입력' })
    await input.fill('다음 주 게더링 일정 문의드려요')
    await input.press('Enter')

    await expect(input).toHaveValue('')
    await expect(page.getByText('다음 주 게더링 일정 문의드려요')).toBeVisible()
    // 서버 응답으로 교체된 말풍선에만 안 읽은 수(1)가 붙는다
    await expect(page.getByLabel('안 읽은 사람 1명')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/user/chat-02-inquiry-sent.png' })
  })

  // KAN-361: 메시지는 sender.id / imageUrl / edited / deleted / reactions[].mine 으로 내려온다
  test('서버 메시지 키로 내 메시지·사진·수정됨·삭제됨·내 리액션을 그린다', async ({ page }) => {
    const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    await page.route(`**/api/chat/rooms/${MOCK_INQUIRY_ROOM_ID}/messages**`, (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      return route.fulfill({
        json: apiRes([
          {
            ...mockInquiryWelcomeMessage,
            id: 'e3000000-0000-0000-0000-000000000001',
            sender: { id: mockUserProfile.id, nickname: mockUserProfile.nickname, admin: false },
            content: '지난번 문의 감사해요',
            edited: true,
            reactions: [{ emoji: '👍', count: 1, mine: true }],
            createdAt: '2026-09-29T10:01:00',
          },
          {
            ...mockInquiryWelcomeMessage,
            id: 'e3000000-0000-0000-0000-000000000002',
            type: 'IMAGE',
            content: null,
            imageUrl: pixel,
            createdAt: '2026-09-29T10:02:00',
          },
          {
            ...mockInquiryWelcomeMessage,
            id: 'e3000000-0000-0000-0000-000000000003',
            content: null,
            deleted: true,
            createdAt: '2026-09-29T10:03:00',
          },
        ]),
      })
    })
    await page.goto(`/chat/${MOCK_INQUIRY_ROOM_ID}`)

    await expect(page.getByText('지난번 문의 감사해요')).toBeVisible()
    // 내 메시지(sender.id === 내 id)에는 보낸 사람 이름이 붙지 않는다
    await expect(page.getByText(mockUserProfile.nickname, { exact: true })).toHaveCount(0)
    await expect(page.getByText('(수정됨)')).toBeVisible()
    await expect(page.getByRole('button', { name: /👍/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('img', { name: '채팅 이미지' })).toHaveAttribute('src', pixel)
    await expect(page.getByText('삭제된 메시지입니다')).toBeVisible()
  })

  // KAN-362: JOINED 는 nicknames 배열을 이어 붙이고, SYSTEM_NOTICE 는 text 를 그대로 보여준다
  test('시스템 메시지(JOINED 2명·SYSTEM_NOTICE)를 가운데 안내로 그린다', async ({ page }) => {
    await page.route(`**/api/chat/rooms/${MOCK_INQUIRY_ROOM_ID}/messages**`, (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      return route.fulfill({ json: apiRes([mockInquiryWelcomeMessage, mockJoinedSystemMessage, mockSystemNoticeMessage]) })
    })
    await page.goto(`/chat/${MOCK_INQUIRY_ROOM_ID}`)

    await expect(page.getByText('준서, 민지님이 들어왔습니다')).toBeVisible()
    await expect(page.getByText('우연한 식탁 테이블이 확정되었어요.')).toBeVisible()
    await expect(page.getByText('일시: 2026.10.03 19:00~21:00')).toBeVisible()
  })

  // KAN-360: 방 상세는 permissions.canSend / permissions.muted / notice 로 내려온다
  for (const { muted, reason } of [
    { muted: true, reason: '채팅이 제한되어 메시지를 보낼 수 없어요' },
    { muted: false, reason: '현재 계정 상태로는 메시지를 보낼 수 없어요' },
  ]) {
    test(`전송 불가(muted=${muted})면 사유 문구로 입력창이 막히고 공지가 보인다`, async ({ page }) => {
      await page.route(`**/api/chat/rooms/${MOCK_INQUIRY_ROOM_ID}`, (route) =>
        route.fulfill({
          json: apiRes({
            ...mockInquiryRoomDetail,
            notice: { ...mockInquiryWelcomeMessage, id: 'e1000000-0000-0000-0000-000000000099', content: '운영 시간은 평일 10시~19시예요' },
            permissions: { ...mockInquiryRoomDetail.permissions, canSend: false, muted },
          }),
        })
      )
      await page.goto(`/chat/${MOCK_INQUIRY_ROOM_ID}`)

      await expect(page.getByText('운영 시간은 평일 10시~19시예요')).toBeVisible()
      const input = page.getByRole('textbox', { name: '메시지 입력' })
      await expect(input).toBeDisabled()
      await expect(input).toHaveAttribute('placeholder', reason)
    })
  }
})
