'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ChatDialog from '@/components/chat/ChatDialog'
import ChatRoom from '@/components/chat/ChatRoom'
import AdminUserSearch from './AdminUserSearch'
import {
  useAddChatMembers,
  useDeleteChatRoom,
  useKickChatMember,
  useMuteChatUser,
  useUnmuteChatUser,
} from '@/lib/hooks/useAdminChat'
import { useChatRoom } from '@/lib/hooks/useChat'
import { useAuthStore } from '@/lib/store/authStore'
import { useToastStore } from '@/lib/store/toastStore'
import type { ChatMember } from '@/lib/api/types'

const LIST_HREF = '/admin/chat'
const MUTE_REASON_MAX_LENGTH = 1000

type DialogState =
  | { kind: 'kick' | 'mute' | 'unmute'; member: ChatMember }
  | { kind: 'deleteRoom' }

interface AdminChatRoomProps {
  roomId: string
}

// 사용자용 채팅방에 관리자 액션(멤버 추가·내보내기·뮤트, 방 삭제)만 얹는다.
// 공지 등록/해제·타인 메시지 삭제는 ChatRoom 이 isAdmin 으로 이미 보여준다.
export default function AdminChatRoom({ roomId }: AdminChatRoomProps) {
  const router = useRouter()
  const myUserId = useAuthStore((s) => s.userId)
  const showToast = useToastStore((s) => s.show)
  const { data: room } = useChatRoom(roomId)
  const addMembers = useAddChatMembers()
  const kickMember = useKickChatMember()
  const deleteRoom = useDeleteChatRoom()
  const muteUser = useMuteChatUser()
  const unmuteUser = useUnmuteChatUser()
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const isGroup = room?.type === 'GROUP'
  const close = () => setDialog(null)

  const handleConfirm = (value: string) => {
    if (!dialog) return
    if (dialog.kind === 'deleteRoom') {
      deleteRoom.mutate(roomId, {
        onSuccess: () => {
          showToast('채팅방을 삭제했어요')
          router.replace(LIST_HREF)
        },
      })
      return
    }
    const { userId } = dialog.member
    if (dialog.kind === 'kick') {
      kickMember.mutate({ roomId, userId }, { onSuccess: close })
    } else if (dialog.kind === 'mute') {
      muteUser.mutate(
        { userId, reason: value },
        {
          onSuccess: () => {
            close()
            showToast('채팅을 금지했어요')
          },
        },
      )
    } else {
      unmuteUser.mutate(userId, {
        onSuccess: () => {
          close()
          showToast('채팅 금지를 해제했어요')
        },
      })
    }
  }

  const dialogProps = dialog
    ? {
        kick: { title: '멤버를 내보낼까요?', description: '방에 내보내기 기록이 남아요.', confirmLabel: '내보내기' },
        mute: {
          title: '채팅 금지',
          description: '모든 채팅방에서 메시지를 보낼 수 없게 돼요.',
          input: { initialValue: '', placeholder: '사유를 입력해주세요', maxLength: MUTE_REASON_MAX_LENGTH },
          confirmLabel: '금지하기',
        },
        unmute: { title: '채팅 금지를 해제할까요?', confirmLabel: '해제' },
        deleteRoom: {
          title: '채팅방을 삭제할까요?',
          description: '모든 멤버의 목록에서 사라지고 되돌릴 수 없어요.',
          confirmLabel: '삭제',
        },
      }[dialog.kind]
    : null

  // 멤버별 채팅 금지 여부는 응답에 없어 금지·해제를 둘 다 둔다
  const renderMemberActions = (member: ChatMember) =>
    member.userId === myUserId ? null : (
      <div className="flex gap-2 text-[11px] font-medium">
        {!member.admin && (
          <>
            <button type="button" onClick={() => setDialog({ kind: 'mute', member })} className="text-tag-text">
              금지
            </button>
            <button type="button" onClick={() => setDialog({ kind: 'unmute', member })} className="text-tag-text">
              해제
            </button>
          </>
        )}
        {isGroup && (
          <button type="button" onClick={() => setDialog({ kind: 'kick', member })} className="text-primary">
            내보내기
          </button>
        )}
      </div>
    )

  const memberIds = new Set(room?.members.map((m) => m.userId))
  const drawerFooter = isGroup ? (
    <div className="flex flex-col gap-4 border-t border-tag-bg px-4 py-4">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-foreground">멤버 추가</p>
        <AdminUserSearch
          renderActions={(user) => (
            <button
              type="button"
              disabled={memberIds.has(user.id) || addMembers.isPending}
              onClick={() =>
                addMembers.mutate(
                  { roomId, userIds: [user.id] },
                  { onSuccess: () => showToast(`${user.nickname}님을 초대했어요`) },
                )
              }
              className="rounded-input border border-primary px-2.5 py-1 text-xs font-medium text-primary disabled:border-tag-bg disabled:text-tag-text"
            >
              {memberIds.has(user.id) ? '참여 중' : '초대'}
            </button>
          )}
        />
      </section>
      <button
        type="button"
        onClick={() => setDialog({ kind: 'deleteRoom' })}
        className="rounded-input border border-primary py-2.5 text-sm font-medium text-primary"
      >
        채팅방 삭제
      </button>
    </div>
  ) : null

  return (
    // 모바일은 사용자 채팅방처럼 전체 화면, 데스크톱은 관리자 본문 안의 폰 폭 프레임
    <div className="fixed inset-0 z-40 lg:relative lg:inset-auto lg:z-auto lg:mx-auto lg:h-[calc(100dvh-4rem)] lg:max-w-[430px] lg:overflow-hidden lg:rounded-card lg:border lg:border-tag-bg">
      <ChatRoom
        roomId={roomId}
        listHref={LIST_HREF}
        memberActions={renderMemberActions}
        drawerFooter={drawerFooter}
      />
      {dialog && dialogProps && (
        <ChatDialog
          key={dialog.kind === 'deleteRoom' ? dialog.kind : `${dialog.kind}-${dialog.member.userId}`}
          {...dialogProps}
          isPending={kickMember.isPending || muteUser.isPending || unmuteUser.isPending || deleteRoom.isPending}
          onConfirm={handleConfirm}
          onClose={close}
        />
      )}
    </div>
  )
}
