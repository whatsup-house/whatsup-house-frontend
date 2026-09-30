'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'
import AdminChatNav from './AdminChatNav'
import {
  useChatReports,
  useDeleteReportedMessage,
  useMuteChatUser,
  useResolveChatReport,
} from '@/lib/hooks/useAdminChat'
import { useToastStore } from '@/lib/store/toastStore'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import type { AdminChatReport, ChatReportStatus } from '@/lib/api/types'

const STATUS_TABS: { status: ChatReportStatus; label: string }[] = [
  { status: 'OPEN', label: '미처리' },
  { status: 'RESOLVED', label: '처리 완료' },
]

const ACTION_CLASS =
  'rounded-input border px-3 py-1.5 text-xs font-medium disabled:border-tag-bg disabled:text-tag-text disabled:opacity-60'

function getMessageText(report: AdminChatReport): string {
  if (report.messageType === 'IMAGE') return '(사진)'
  if (report.messageType === 'SYSTEM') return '(시스템 메시지)'
  return report.messageContent ?? ''
}

export default function AdminChatReports() {
  const [status, setStatus] = useState<ChatReportStatus>('OPEN')
  const reportsQuery = useChatReports(status)
  const resolveReport = useResolveChatReport()
  const deleteMessage = useDeleteReportedMessage()
  const muteUser = useMuteChatUser()
  const showToast = useToastStore((s) => s.show)

  const reports = reportsQuery.data ?? []

  const handleDelete = (report: AdminChatReport) => {
    if (!confirm('이 메시지를 삭제할까요? 모든 멤버에게 "삭제된 메시지입니다"로 보여요.')) return
    deleteMessage.mutate(
      { messageId: report.messageId, roomId: report.roomId },
      { onSuccess: () => showToast('메시지를 삭제했어요') },
    )
  }

  const handleMute = (report: AdminChatReport) => {
    if (!report.messageSenderId) return
    const reason = prompt(`${report.messageSenderNickname ?? '작성자'}님을 채팅 금지할까요? 사유를 입력해주세요.`, `신고: ${report.reason}`)
    if (!reason?.trim()) return
    muteUser.mutate(
      { userId: report.messageSenderId, reason: reason.trim().slice(0, 1000) },
      { onSuccess: () => showToast('작성자를 채팅 금지했어요') },
    )
  }

  let content: ReactNode
  if (reportsQuery.isLoading) {
    content = (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  } else if (reportsQuery.isError) {
    content = (
      <ApiErrorMessage
        message={getAdminApiErrorMessage(reportsQuery.error, '신고 목록을 불러오지 못했어요.')}
        onRetry={() => reportsQuery.refetch()}
      />
    )
  } else if (reports.length === 0) {
    content = <p className="p-10 text-center text-sm text-tag-text">신고가 없어요.</p>
  } else {
    content = (
      <ul className="divide-y divide-tag-bg">
        {reports.map((report) => (
          <li key={report.id} className="flex flex-col gap-2 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">{report.reason}</p>
              <span className="shrink-0 text-[11px] text-tag-text">{dayjs(report.createdAt).format('YY.MM.DD HH:mm')}</span>
            </div>
            <div className="rounded-input bg-background px-3 py-2 text-sm text-foreground">
              <p className="whitespace-pre-wrap break-words">{getMessageText(report)}</p>
              {report.messageDeleted && <p className="mt-1 text-[11px] text-primary">삭제된 메시지</p>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tag-text">
              <span>신고자 {report.reporterNickname ?? '(탈퇴한 회원)'}</span>
              <span>작성자 {report.messageSenderNickname ?? '(탈퇴한 회원)'}</span>
              <Link href={`/admin/chat/${report.roomId}`} className="text-primary hover:underline">
                채팅방 보기
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.status === 'OPEN' && (
                <button
                  type="button"
                  onClick={() => resolveReport.mutate(report.id)}
                  disabled={resolveReport.isPending}
                  className={`${ACTION_CLASS} border-foreground bg-foreground text-white`}
                >
                  처리 완료
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(report)}
                disabled={report.messageDeleted || report.messageType === 'SYSTEM' || deleteMessage.isPending}
                className={`${ACTION_CLASS} border-primary text-primary`}
              >
                메시지 삭제
              </button>
              <button
                type="button"
                onClick={() => handleMute(report)}
                disabled={!report.messageSenderId || muteUser.isPending}
                className={`${ACTION_CLASS} border-primary text-primary`}
              >
                작성자 채팅 금지
              </button>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="max-w-3xl">
      <AdminChatNav title="채팅 관리" />
      <div className="mb-3 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.status}
            type="button"
            onClick={() => setStatus(tab.status)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              status === tab.status ? 'bg-foreground font-semibold text-white' : 'bg-tag-bg text-tag-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <section className="overflow-hidden rounded-card bg-card shadow-sm">{content}</section>
    </div>
  )
}
