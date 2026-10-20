'use client'

import { useBotSettings, useResumeChatBot } from '@/lib/hooks/useAdminChat'
import { useToastStore } from '@/lib/store/toastStore'
import type { ChatRoomDetail } from '@/lib/api/types'

interface AdminChatBotBarProps {
  roomId: string
  room: ChatRoomDetail
}

// 문의방 헤더 아래 봇 상태 띠 — 일시정지 또는 담당자 필요일 때만 재개 버튼을 보인다 (KAN-412)
export default function AdminChatBotBar({ roomId, room }: AdminChatBotBarProps) {
  const showToast = useToastStore((s) => s.show)
  const resume = useResumeChatBot()
  const { data: settings } = useBotSettings()
  const serverOff = !!settings && settings.enabled && !settings.active
  const paused = !!room.botPaused
  const needsHuman = !!room.needsHuman

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-tag-bg bg-background px-3 py-2 text-xs">
      <div className="min-w-0 flex-1">
        <p className="text-foreground">
          <span className="font-semibold">AI 자동응답</span>{' '}
          <span className={paused || serverOff ? 'text-tag-text' : 'text-primary'}>{serverOff ? '서버 설정 꺼짐' : paused ? '일시정지' : '동작 중'}</span>
          {needsHuman && (
            <span className="ml-1.5 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">담당자 필요</span>
          )}
        </p>
        {room.handoffReason && <p className="mt-0.5 break-words text-tag-text">이관 사유: {room.handoffReason}</p>}
      </div>
      {(paused || needsHuman) && (
        <button
          type="button"
          disabled={resume.isPending}
          onClick={() => resume.mutate(roomId, { onSuccess: () => showToast('봇을 재개했어요') })}
          className="shrink-0 rounded-input border border-primary px-2.5 py-1 font-medium text-primary disabled:opacity-50"
        >
          봇 재개
        </button>
      )}
    </div>
  )
}
