'use client'

import dayjs from 'dayjs'
import type { DiningNoticeChannel, DiningNoticeKind } from '@/lib/api/types'
import { useDiningSessionNotices } from '@/lib/hooks/useAdminDining'
import { tableLabel } from '@/lib/utils/diningStatus'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'

const KIND_LABEL: Record<DiningNoticeKind, string> = {
  CONFIRM_MESSAGE: '확정 안내',
  REMINDER: '리마인드',
  CONTENTS: '대화 콘텐츠',
  NOTIFICATION: '알림',
}

const CHANNEL_LABEL: Record<DiningNoticeChannel, string> = {
  CHAT: '채팅',
  IN_APP: '인앱',
  PUSH: '푸시',
}

const TH_CLASS = 'px-3 py-2 text-left text-xs font-medium text-tag-text whitespace-nowrap'
const TD_CLASS = 'px-3 py-2 text-sm text-foreground whitespace-nowrap'

interface DiningNoticeLogTabProps {
  sessionId: string
}

// 안내 이력 탭: 확정 안내·리마인드·콘텐츠·알림 발송 시도 기록, 최신순 (KAN-440)
export default function DiningNoticeLogTab({ sessionId }: DiningNoticeLogTabProps) {
  const { data: notices, isLoading, isError, error, refetch } = useDiningSessionNotices(sessionId)

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
  if (isError || !notices) {
    return <ApiErrorMessage message={getAdminApiErrorMessage(error, '안내 이력을 불러오지 못했어요.')} onRetry={() => refetch()} />
  }
  if (notices.length === 0) {
    return <div className="bg-card rounded-card shadow-sm py-12 text-center text-sm text-tag-text">안내 이력이 없어요.</div>
  }

  return (
    <div className="bg-card rounded-card shadow-sm overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-tag-bg">
          <tr>
            {['시각', '테이블', '종류', '채널', '결과', '시도', '오류'].map((h) => (
              <th key={h} className={TH_CLASS}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-tag-bg">
          {notices.map((n, i) => (
            <tr key={`${n.at}-${i}`} className={n.status === 'FAILED' ? 'bg-primary-light' : undefined}>
              <td className={TD_CLASS}>{dayjs(n.at).format('M/D HH:mm:ss')}</td>
              <td className={TD_CLASS}>{n.tableId ? tableLabel(n.tableId) : n.tableLabel ?? '-'}</td>
              <td className={TD_CLASS}>{KIND_LABEL[n.kind] ?? n.kind}</td>
              <td className={TD_CLASS}>{CHANNEL_LABEL[n.channel] ?? n.channel}</td>
              <td className={`${TD_CLASS} ${n.status === 'FAILED' ? 'font-bold text-primary' : ''}`}>
                {n.status === 'FAILED' ? '실패' : '성공'}
              </td>
              <td className={TD_CLASS}>{n.attempt}회</td>
              <td className="px-3 py-2 text-sm text-tag-text break-all min-w-40">{n.error ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
