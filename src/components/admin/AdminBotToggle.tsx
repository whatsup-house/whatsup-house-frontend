'use client'

import { useBotSettings, useUpdateBotSettings } from '@/lib/hooks/useAdminChat'

// 채팅 관리 상단 AI 자동응답 전체 ON/OFF (KAN-412). 설정을 못 불러오면 숨긴다.
export default function AdminBotToggle() {
  const { data } = useBotSettings()
  const update = useUpdateBotSettings()
  if (!data) return null

  const next = !data.enabled
  const handleToggle = () => {
    const message = next
      ? 'AI 자동응답을 전체 켤까요? 대상 고객의 새 문의부터 봇이 먼저 답해요.'
      : 'AI 자동응답을 전체 끌까요? 모든 문의방에서 봇이 답하지 않아요.'
    if (confirm(message)) update.mutate(next)
  }

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-card bg-card px-4 py-3 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-foreground">AI 자동응답 전체</p>
        <p className="text-xs text-tag-text">{data.enabled ? '켜짐 — 대상 고객 문의에 봇이 먼저 답해요' : '꺼짐 — 모든 문의는 사람이 답해요'}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={data.enabled}
        aria-label="AI 자동응답 전체 ON/OFF"
        disabled={update.isPending}
        onClick={handleToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${data.enabled ? 'bg-primary' : 'bg-tag-bg'}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${data.enabled ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}
