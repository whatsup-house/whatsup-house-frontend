'use client'

import AdminChatNav from './AdminChatNav'
import AdminUserSearch from './AdminUserSearch'
import { useMuteChatUser, useUnmuteChatUser } from '@/lib/hooks/useAdminChat'
import { useToastStore } from '@/lib/store/toastStore'

// ponytail: 백엔드에 채팅 금지 목록 조회 API(GET /api/admin/chat/mutes)가 없어 회원 검색 → 금지/해제만 한다.
// 목록 API 가 생기면 이 화면 상단에 목록(사유·해제)을 붙인다.
export default function AdminChatMutes() {
  const muteUser = useMuteChatUser()
  const unmuteUser = useUnmuteChatUser()
  const showToast = useToastStore((s) => s.show)

  const handleMute = (userId: string, nickname: string) => {
    const reason = prompt(`${nickname}님을 채팅 금지할까요? 사유를 입력해주세요.`)
    if (!reason?.trim()) return
    muteUser.mutate(
      { userId, reason: reason.trim().slice(0, 1000) },
      { onSuccess: () => showToast(`${nickname}님을 채팅 금지했어요`) },
    )
  }

  const handleUnmute = (userId: string, nickname: string) => {
    if (!confirm(`${nickname}님의 채팅 금지를 해제할까요?`)) return
    unmuteUser.mutate(userId, { onSuccess: () => showToast(`${nickname}님의 채팅 금지를 해제했어요`) })
  }

  return (
    <div className="max-w-3xl">
      <AdminChatNav title="채팅 관리" />
      <section className="rounded-card bg-card p-5 shadow-sm">
        <p className="mb-3 text-sm text-tag-text">
          채팅 금지된 회원은 모든 채팅방에서 메시지를 보낼 수 없어요. 계정 정지와는 별개예요.
        </p>
        <AdminUserSearch
          renderActions={(user) => (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleMute(user.id, user.nickname)}
                disabled={muteUser.isPending}
                className="rounded-input border border-primary px-2.5 py-1 text-xs font-medium text-primary disabled:opacity-50"
              >
                금지
              </button>
              <button
                type="button"
                onClick={() => handleUnmute(user.id, user.nickname)}
                disabled={unmuteUser.isPending}
                className="rounded-input border border-tag-bg px-2.5 py-1 text-xs font-medium text-tag-text disabled:opacity-50"
              >
                해제
              </button>
            </div>
          )}
        />
      </section>
    </div>
  )
}
