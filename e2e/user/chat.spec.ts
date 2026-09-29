import { test, expect } from '@playwright/test'
import { captureFullPage } from '../fixtures/screenshot'
import { MOCK_INQUIRY_ROOM_ID, mockChatApis, setupUserContext } from '../fixtures/mocks'

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
})
