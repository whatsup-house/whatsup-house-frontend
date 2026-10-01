import { test, expect } from '@playwright/test'
import type { Page, WebSocketRoute } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import {
  MOCK_GROUP_ROOM_ID,
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

// STOMP 브로커 흉내 (lib/chat/socket.ts 가 붙는 /ws-chat). CONNECT → CONNECTED, SUBSCRIBE 기록, SEND 는 onSend 로 넘긴다.
// close() 로 끊으면 클라이언트가 백오프(1s) 뒤 다시 붙고, 그때마다 새 연결로 바뀐다.
async function mockChatSocket(page: Page, onSend: (destination: string, body: string) => void = () => {}) {
  let connection: WebSocketRoute | null = null
  let subscriptions = new Map<string, string>()
  let messageSeq = 0
  await page.route('**/api/chat/socket-token', (route) => route.fulfill({ json: apiRes({ token: 'e2e', expiresIn: 120 }) }))
  await page.routeWebSocket(/\/ws-chat$/, (ws) => {
    connection = ws
    subscriptions = new Map()
    ws.onMessage((raw) => {
      const frame = String(raw).replace(/\0$/, '')
      const split = frame.indexOf('\n\n')
      const [command, ...lines] = frame.slice(0, split).split('\n')
      const headers = new Map(lines.map((line) => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1)]))
      if (command === 'CONNECT' || command === 'STOMP') ws.send('CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0')
      else if (command === 'SUBSCRIBE') subscriptions.set(headers.get('destination') ?? '', headers.get('id') ?? '')
      else if (command === 'SEND') onSend(headers.get('destination') ?? '', frame.slice(split + 2))
    })
  })
  return {
    publish: (destination: string, payload: unknown) => {
      const subscription = subscriptions.get(destination)
      if (!connection || !subscription) throw new Error(`${destination} 구독 없음`)
      connection.send(
        `MESSAGE\ndestination:${destination}\nsubscription:${subscription}\nmessage-id:${++messageSeq}\ncontent-type:application/json\n\n${JSON.stringify(payload)}\0`,
      )
    },
    close: () => connection?.close(),
  }
}

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

  // KAN-364: sender.nickname 은 조회 시점 스냅샷이라 옛 페이지와 새 메시지가 다를 수 있다 → 방 멤버의 현재 닉네임으로 그린다.
  // KAN-365: 재연결(재구독)하면 방 상세를 다시 받고, 같은 id 라도 읽음을 다시 보낸다.
  test('단체방 보낸 사람 이름은 멤버 현재 닉네임을 쓰고, 재연결하면 바뀐 닉네임·읽음을 다시 맞춘다', async ({ page }) => {
    const otherId = 'b1000000-0000-0000-0000-000000000003'
    const me = { id: mockUserProfile.id, nickname: mockUserProfile.nickname, admin: false }
    let otherNickname = '준서'
    let readSends = 0
    await page.route(`**/api/chat/rooms/${MOCK_GROUP_ROOM_ID}`, (route) =>
      route.fulfill({
        json: apiRes({
          ...mockInquiryRoomDetail,
          id: MOCK_GROUP_ROOM_ID,
          type: 'GROUP',
          name: '퇴근 게더링 3조',
          members: [
            { userId: me.id, nickname: me.nickname, admin: false },
            { userId: otherId, nickname: otherNickname, admin: false },
          ],
        }),
      })
    )
    const base = { ...mockInquiryWelcomeMessage, roomId: MOCK_GROUP_ROOM_ID }
    await page.route(`**/api/chat/rooms/${MOCK_GROUP_ROOM_ID}/messages**`, (route) =>
      route.fulfill({
        json: apiRes([
          // 상대가 닉네임을 바꾸기 전에 받은 옛 스냅샷
          { ...base, id: 'e4000000-0000-0000-0000-000000000001', sender: { id: otherId, nickname: '옛준서', admin: false }, content: '어제 잘 들어가셨어요?', createdAt: '2026-09-29T10:00:00' },
          { ...base, id: 'e4000000-0000-0000-0000-000000000002', sender: me, content: '네 덕분에요', createdAt: '2026-09-29T10:01:00' },
          { ...base, id: 'e4000000-0000-0000-0000-000000000003', sender: { id: otherId, nickname: '준서', admin: false }, content: '다음에 또 봬요', createdAt: '2026-09-29T10:02:00' },
        ]),
      })
    )
    const socket = await mockChatSocket(page, (destination) => {
      if (destination === `/app/rooms/${MOCK_GROUP_ROOM_ID}/read`) readSends += 1
    })
    await page.goto(`/chat/${MOCK_GROUP_ROOM_ID}`)

    await expect(page.getByText('다음에 또 봬요')).toBeVisible()
    await expect(page.getByText('준서', { exact: true })).toHaveCount(2)
    await expect(page.getByText('옛준서')).toHaveCount(0)
    await expect.poll(() => readSends).toBeGreaterThan(0)

    const sendsBeforeReconnect = readSends
    otherNickname = '새준서'
    socket.close()
    await expect(page.getByText('새준서', { exact: true })).toHaveCount(2)
    await expect.poll(() => readSends).toBeGreaterThan(sendsBeforeReconnect)
  })

  // KAN-365: 내 READ 는 로컬로 빼지 않고 최신 페이지를 다시 받아 서버 값으로 맞춘다. 문의방 관리자 이름은 멤버 실명 대신 "와썹하우스" 유지.
  test('문의방에서 내 읽음 이벤트가 오면 메시지를 다시 받아 안 읽은 수를 서버 값으로 맞춘다', async ({ page }) => {
    let isRead = false
    await page.route(`**/api/chat/rooms/${MOCK_INQUIRY_ROOM_ID}`, (route) =>
      route.fulfill({
        json: apiRes({
          ...mockInquiryRoomDetail,
          members: [mockInquiryRoomDetail.members[0], { ...mockInquiryRoomDetail.members[1], nickname: '김관리' }],
        }),
      })
    )
    await page.route(`**/api/chat/rooms/${MOCK_INQUIRY_ROOM_ID}/messages**`, (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      if (new URL(route.request().url()).searchParams.has('after')) return route.fulfill({ json: apiRes([]) })
      // 자리 비운 사이 온 관리자 메시지 2개: 읽기 전엔 1, 읽은 뒤 서버 값은 0
      const unreadCount = isRead ? 0 : 1
      return route.fulfill({
        json: apiRes([
          { ...mockInquiryWelcomeMessage, unreadCount },
          { ...mockInquiryWelcomeMessage, id: 'e5000000-0000-0000-0000-000000000002', content: '확인 후 다시 안내드릴게요', unreadCount, createdAt: '2026-09-29T10:01:00' },
        ]),
      })
    })
    const socket = await mockChatSocket(page, (destination, body) => {
      if (destination !== `/app/rooms/${MOCK_INQUIRY_ROOM_ID}/read`) return
      isRead = true
      const { messageId } = JSON.parse(body) as { messageId: string }
      socket.publish(`/topic/rooms/${MOCK_INQUIRY_ROOM_ID}`, {
        kind: 'READ',
        roomId: MOCK_INQUIRY_ROOM_ID,
        payload: { userId: mockUserProfile.id, messageId },
      })
    })
    const refetchAfterRead = page.waitForRequest((request) => {
      const url = new URL(request.url())
      return (
        isRead &&
        request.method() === 'GET' &&
        url.pathname.endsWith(`/api/chat/rooms/${MOCK_INQUIRY_ROOM_ID}/messages`) &&
        !url.searchParams.has('after') &&
        !url.searchParams.has('before')
      )
    })
    await page.goto(`/chat/${MOCK_INQUIRY_ROOM_ID}`)

    await expect(page.getByText('확인 후 다시 안내드릴게요')).toBeVisible()
    // 헤더 방 이름 + 보낸 사람 이름. 멤버 목록의 관리자 실명은 쓰지 않는다
    await expect(page.getByText('와썹하우스', { exact: true })).toHaveCount(2)
    await expect(page.getByText('김관리')).toHaveCount(0)
    await refetchAfterRead
    await expect(page.getByLabel(/안 읽은 사람/)).toHaveCount(0)
  })
})
