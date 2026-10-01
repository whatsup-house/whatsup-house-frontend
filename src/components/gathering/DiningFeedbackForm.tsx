'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { CheckCircle2, Info, Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ApiErrorMessage, Button, Card, LoadingSpinner } from '@/components/ui'
import ErrorView from '@/components/layout/ErrorView'
import DiningReportCard from './DiningReportCard'
import { StarRating } from './ReviewWriteForm'
import { useDiningTableDetail, useSubmitDiningFeedback } from '@/lib/hooks/useApplications'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useAuthStore } from '@/lib/store/authStore'
import { useToastStore } from '@/lib/store/toastStore'
import { getApiErrorCode, getApiErrorMessage, getApiErrorStatus } from '@/lib/utils/apiError'
import { getSelectablePeers } from '@/lib/utils/diningStatus'
import type { DiningPeerPreferenceKind, DiningRejoinIntent } from '@/lib/api/types'

const SCORE_KEYS = ['tableScore', 'talkScore', 'venueScore'] as const
type ScoreKey = typeof SCORE_KEYS[number]
const REJOIN_INTENTS: DiningRejoinIntent[] = ['YES', 'MAYBE', 'NO']
const PEER_KINDS: DiningPeerPreferenceKind[] = ['AGAIN', 'AVOID']
const COMMENT_MAX = 2000

// 제출 뒤 또는 서버가 막았을 때 폼 대신 보여줄 화면
type ResultView = 'done' | 'alreadySubmitted' | 'notOpen'

const primaryLinkClass = 'flex min-h-[48px] w-full items-center justify-center rounded-button bg-primary px-4 text-sm font-bold text-white'
const secondaryLinkClass = 'flex min-h-[48px] w-full items-center justify-center rounded-button bg-tag-bg px-4 text-sm font-bold text-tag-text'

interface DiningFeedbackFormProps {
  tableId: string
}

// 행사 후 피드백: 만족도 3항목·재참여 의향·사람별 선호(비공개)·자유 의견 + 멤버 신고 (KAN-356)
export default function DiningFeedbackForm({ tableId }: DiningFeedbackFormProps) {
  const t = useTranslations('gathering.diningFeedback')
  const tTable = useTranslations('gathering.diningTable')
  const router = useRouter()
  const { isLoggedIn, isInitialized } = useRequireAuth()
  const myUserId = useAuthStore((s) => s.userId)
  const showToast = useToastStore((s) => s.show)
  const tableQuery = useDiningTableDetail(tableId, isLoggedIn)
  const submit = useSubmitDiningFeedback(tableId)
  const [scores, setScores] = useState<Partial<Record<ScoreKey, number>>>({})
  const [rejoinIntent, setRejoinIntent] = useState<DiningRejoinIntent | null>(null)
  const [peerKinds, setPeerKinds] = useState<Record<string, DiningPeerPreferenceKind>>({})
  const [comment, setComment] = useState('')
  const [result, setResult] = useState<ResultView | null>(null)
  const [isNotMember, setIsNotMember] = useState(false)

  // 회원 전용. 비로그인은 로그인 후 이 화면으로 돌아오게 한다.
  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      router.replace(`/login?returnUrl=${encodeURIComponent(`/dining/tables/${tableId}/feedback`)}`)
    }
  }, [isInitialized, isLoggedIn, router, tableId])

  if (!isInitialized || !isLoggedIn || tableQuery.isPending) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isNotMember || (tableQuery.isError && getApiErrorStatus(tableQuery.error) === 403)) {
    return <ErrorView code="403" title={tTable('notMemberTitle')} description={tTable('notMemberDescription')} showBack />
  }

  if (tableQuery.isError) {
    if (getApiErrorStatus(tableQuery.error) === 404) notFound()
    return (
      <div className="min-h-screen bg-background px-4 pt-20">
        <ApiErrorMessage message={tTable('loadFailed')} onRetry={() => { tableQuery.refetch() }} />
      </div>
    )
  }

  const tablePath = `/dining/tables/${tableId}`

  if (result) {
    return (
      <div className="min-h-screen bg-background px-5 py-10">
        <Card className="p-6 text-center">
          {result === 'notOpen'
            ? <Info size={40} className="mx-auto text-tag-text" />
            : <CheckCircle2 size={40} className="mx-auto text-primary" />}
          <h1 className="mt-4 text-lg font-bold text-foreground">{t(`result.${result}.title`)}</h1>
          <p className="mt-2 text-sm leading-relaxed text-tag-text break-keep">{t(`result.${result}.description`)}</p>
          <div className="mt-6 flex flex-col gap-2">
            {result === 'notOpen' ? (
              <Link href={tablePath} className={primaryLinkClass}>{t('backToTable')}</Link>
            ) : (
              <>
                <Link href="/dining/history" className={primaryLinkClass}>{t('viewHistory')}</Link>
                <Link href={tablePath} className={secondaryLinkClass}>{t('backToTable')}</Link>
              </>
            )}
          </div>
        </Card>
      </div>
    )
  }

  const { peers, hasUnselectable } = getSelectablePeers(tableQuery.data.members ?? [], myUserId)
  const canSubmit = SCORE_KEYS.every((key) => !!scores[key]) && !!rejoinIntent

  const togglePeer = (userId: string, kind: DiningPeerPreferenceKind) => {
    setPeerKinds((prev) => {
      const next = { ...prev }
      if (next[userId] === kind) delete next[userId]
      else next[userId] = kind
      return next
    })
  }

  const handleSubmit = () => {
    const { tableScore, talkScore, venueScore } = scores
    if (!tableScore || !talkScore || !venueScore || !rejoinIntent) return
    const trimmed = comment.trim()
    submit.mutate(
      {
        tableScore,
        talkScore,
        venueScore,
        rejoinIntent,
        comment: trimmed || undefined,
        peers: Object.entries(peerKinds).map(([userId, kind]) => ({ userId, kind })),
      },
      {
        onSuccess: () => setResult('done'),
        onError: (error) => {
          const status = getApiErrorStatus(error)
          if (status === 409) setResult('alreadySubmitted')
          else if (getApiErrorCode(error) === 'FEEDBACK_NOT_OPEN') setResult('notOpen')
          else if (status === 403) setIsNotMember(true)
          else showToast(getApiErrorMessage(error, t('submitFailed')), 'error')
        },
      },
    )
  }

  return (
    <div className="min-h-screen bg-background px-5 py-7 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-tag-text break-keep">{t('subtitle')}</p>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-bold text-foreground">{t('scoresTitle')}</h2>
        <div className="space-y-1">
          {SCORE_KEYS.map((key) => (
            <div key={key} role="group" aria-label={t(`scores.${key}`)} className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{t(`scores.${key}`)}</span>
              {/* StarRating 은 후기 폼용 mb-3 를 달고 있어 여기서 상쇄한다 */}
              <div className="-mb-3">
                <StarRating rating={scores[key] ?? 0} onChange={(value) => setScores((prev) => ({ ...prev, [key]: value }))} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-bold text-foreground">{t('rejoinTitle')}</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('rejoinTitle')}>
          {REJOIN_INTENTS.map((intent) => (
            <button
              key={intent}
              type="button"
              role="radio"
              aria-checked={rejoinIntent === intent}
              onClick={() => setRejoinIntent(intent)}
              className={`min-h-[44px] rounded-input border px-2 text-sm font-medium ${
                rejoinIntent === intent ? 'border-primary bg-primary-light text-primary' : 'border-tag-bg bg-card text-tag-text'
              }`}
            >
              {t(`rejoin.${intent}`)}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold text-foreground">{t('peersTitle')}</h2>
        <p className="mt-2 flex items-start gap-1.5 rounded-input bg-primary-light p-3 text-xs leading-relaxed text-primary break-keep">
          <Lock size={14} className="mt-0.5 shrink-0" />
          {t('peersPrivacy')}
        </p>
        {peers.length > 0 ? (
          <ul className="mt-3 divide-y divide-tag-bg">
            {peers.map((peer) => (
              <li key={peer.userId} className="flex items-center justify-between gap-2 py-3 last:pb-0">
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">{peer.nickname}</span>
                <div className="flex shrink-0 gap-1.5" role="group" aria-label={peer.nickname}>
                  {PEER_KINDS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={peerKinds[peer.userId] === kind}
                      onClick={() => togglePeer(peer.userId, kind)}
                      className={`min-h-[36px] rounded-full border px-3 text-xs font-medium ${
                        peerKinds[peer.userId] === kind ? 'border-primary bg-primary-light text-primary' : 'border-tag-bg bg-card text-tag-text'
                      }`}
                    >
                      {t(`peerKinds.${kind}`)}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-tag-text">{t('noPeers')}</p>
        )}
        {hasUnselectable && peers.length > 0 && <p className="mt-2 text-xs text-tag-text break-keep">{t('unselectableNotice')}</p>}
      </Card>

      <Card className="p-5">
        <label htmlFor="dining-feedback-comment" className="font-bold text-foreground">{t('commentTitle')}</label>
        <textarea
          id="dining-feedback-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('commentPlaceholder')}
          maxLength={COMMENT_MAX}
          rows={4}
          className="mt-3 w-full resize-none rounded-input border border-tag-bg bg-card px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-tag-text/70 focus:border-primary"
        />
        <p className="mt-1 text-right text-xs text-tag-text">{comment.length}/{COMMENT_MAX}</p>
      </Card>

      <Button className="w-full" size="lg" disabled={!canSubmit} isLoading={submit.isPending} onClick={handleSubmit}>
        {t('submit')}
      </Button>
      {!canSubmit && <p className="text-center text-xs text-tag-text">{t('requiredNotice')}</p>}

      <DiningReportCard tableId={tableId} peers={peers} hasUnselectable={hasUnselectable} />
    </div>
  )
}
