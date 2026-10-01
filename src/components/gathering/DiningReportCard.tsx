'use client'

import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button, Card } from '@/components/ui'
import ChatDialog from '@/components/chat/ChatDialog'
import { useReportDiningMember } from '@/lib/hooks/useApplications'
import { useToastStore } from '@/lib/store/toastStore'
import { getApiErrorMessage } from '@/lib/utils/apiError'

const REASON_MAX = 2000

interface DiningReportCardProps {
  tableId: string
  peers: { userId: string; nickname: string }[]
  hasUnselectable: boolean
}

// 같은 테이블 멤버 신고: 대상 선택 → 확인 모달에서 사유 입력 → 접수 토스트 (KAN-356)
export default function DiningReportCard({ tableId, peers, hasUnselectable }: DiningReportCardProps) {
  const t = useTranslations('gathering.diningReport')
  const showToast = useToastStore((s) => s.show)
  const report = useReportDiningMember(tableId)
  const [targetId, setTargetId] = useState('')
  const [confirming, setConfirming] = useState(false)
  const target = peers.find((peer) => peer.userId === targetId)

  const handleReport = (reason: string) => {
    if (!target) return
    report.mutate(
      { reportedUserId: target.userId, reason },
      {
        onSuccess: () => {
          showToast(t('done'))
          setTargetId('')
          setConfirming(false)
        },
        onError: (error) => showToast(getApiErrorMessage(error, t('failed')), 'error'),
      },
    )
  }

  return (
    <Card className="p-5">
      <h2 className="mb-2 flex items-center gap-2 font-bold text-foreground">
        <ShieldAlert size={18} className="text-primary" />
        {t('title')}
      </h2>
      <p className="text-xs leading-relaxed text-tag-text break-keep">{t('description')}</p>
      {peers.length > 0 ? (
        <div className="mt-3 flex gap-2">
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            aria-label={t('selectLabel')}
            className="min-h-[44px] min-w-0 flex-1 rounded-input border border-tag-bg bg-card px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">{t('selectPlaceholder')}</option>
            {peers.map((peer) => (
              <option key={peer.userId} value={peer.userId}>{peer.nickname}</option>
            ))}
          </select>
          <Button variant="outlined" size="sm" disabled={!target} onClick={() => setConfirming(true)}>
            {t('button')}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-tag-text">{t('noTargets')}</p>
      )}
      {hasUnselectable && peers.length > 0 && <p className="mt-2 text-xs text-tag-text break-keep">{t('unselectableNotice')}</p>}

      {confirming && target && (
        <ChatDialog
          title={t('confirmTitle', { nickname: target.nickname })}
          description={t('confirmDescription')}
          input={{ initialValue: '', placeholder: t('reasonPlaceholder'), maxLength: REASON_MAX }}
          confirmLabel={t('confirm')}
          isPending={report.isPending}
          onConfirm={handleReport}
          onClose={() => setConfirming(false)}
        />
      )}
    </Card>
  )
}
