'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ClipboardList, Clock, Hash } from 'lucide-react'
import { useLocale } from 'next-intl'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import { useMyApplicationDetail } from '@/lib/hooks/useApplications'
import { formatLocalizedFullDate, formatTime } from '@/lib/utils/date'
import type { AnswerView, ApplicationStatus } from '@/lib/api/types'

const STATUS_TEXT: Partial<Record<ApplicationStatus, { label: string; title: string; description: string }>> = {
  PENDING: {
    label: '심사중',
    title: '신청 내용을 검토하고 있어요',
    description: '호스트가 제출한 신청서를 확인하고 있어요. 심사 결과는 안내를 통해 알려드릴게요.',
  },
  REJECTED: {
    label: '승인 거절',
    title: '아쉽지만 이번 신청은 승인되지 않았어요',
    description: '자세한 내용은 안내받은 메시지나 이메일을 확인해 주세요.',
  },
  CANCELLED: {
    label: '취소',
    title: '취소된 신청이에요',
    description: '이미 취소된 신청 내역입니다.',
  },
}

function formatAnswerValue(value: AnswerView['value']) {
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || value === undefined || value === '') return '미입력'
  return String(value)
}

function MyApplicationDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const locale = useLocale()
  const { data: detail, isLoading, isError, refetch } = useMyApplicationDetail(id)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isError || !detail) {
    return (
      <main className="min-h-screen bg-background px-5 py-8">
        <Card className="p-5">
          <p className="text-sm text-tag-text">신청 내역을 불러오지 못했어요.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="outlined" onClick={() => router.push('/mypage?tab=applications')}>
              목록으로
            </Button>
            <Button onClick={() => refetch()}>
              다시 시도
            </Button>
          </div>
        </Card>
      </main>
    )
  }

  const status = STATUS_TEXT[detail.status] ?? {
    label: '신청 상세',
    title: '신청 내역을 확인해 주세요',
    description: '제출한 신청서 답변과 게더링 정보를 확인할 수 있어요.',
  }
  const eventDate = formatLocalizedFullDate(detail.gathering.eventDate, locale)
  const startTime = formatTime(detail.gathering.startTime)

  return (
    <main className="min-h-screen bg-background px-5 py-7">
      <section className="space-y-4">
        <Card className="border border-primary/20 bg-primary-light p-5">
          <p className="text-xs font-bold text-primary">{status.label}</p>
          <h1 className="mt-2 text-xl font-bold leading-snug text-foreground">{status.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-tag-text">{status.description}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-primary">
            <Hash size={18} />
            <p className="text-xs font-medium text-tag-text">예약번호</p>
          </div>
          <p className="mt-2 text-lg font-bold text-primary">{detail.bookingNumber}</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs text-tag-text">신청한 게더링</p>
          <h2 className="mt-2 text-lg font-bold text-foreground">{detail.gathering.title}</h2>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex gap-3">
              <Calendar size={17} className="mt-0.5 shrink-0 text-tag-text" />
              <div>
                <p className="text-xs text-tag-text">날짜</p>
                <p className="font-medium text-foreground">{eventDate}</p>
              </div>
            </div>
            {startTime && (
              <div className="flex gap-3">
                <Clock size={17} className="mt-0.5 shrink-0 text-tag-text" />
                <div>
                  <p className="text-xs text-tag-text">시작 시간</p>
                  <p className="font-medium text-foreground">{startTime}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">내가 제출한 답변</h2>
          </div>

          {detail.answers.length === 0 ? (
            <p className="text-sm text-tag-text">제출된 답변이 없어요.</p>
          ) : (
            <div className="divide-y divide-tag-bg">
              {detail.answers.map((answer) => (
                <div key={`${answer.questionKey}-${answer.label}`} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-xs font-medium text-tag-text">{answer.label}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-foreground">
                    {formatAnswerValue(answer.value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <Button className="mt-6 w-full" variant="outlined" onClick={() => router.push('/mypage?tab=applications')}>
        신청 내역으로 돌아가기
      </Button>
    </main>
  )
}

export default function MyApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <MyApplicationDetailContent id={decodeURIComponent(id)} />
}
