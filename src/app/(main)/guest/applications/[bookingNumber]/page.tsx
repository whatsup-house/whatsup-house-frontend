'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ClipboardList, Clock, Ticket } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import { fetchGuestApplicationDetail } from '@/lib/api/application'
import { formatLocalizedFullDate, formatTime } from '@/lib/utils/date'
import { readGuestLookupSession } from '@/lib/utils/guestLookupSession'
import { useLocale } from 'next-intl'
import { useLocalizedJobs } from '@/lib/hooks/useLocalizedJobs'
import type { AnswerView } from '@/lib/api/types'

const STATUS_TEXT = {
  PENDING: {
    label: '심사중',
    title: '신청 내용을 검토하고 있어요',
    description: '호스트가 확인한 뒤 심사 결과를 이메일로 안내드릴게요. 잠시만 기다려 주세요.',
  },
  REJECTED: {
    label: '승인 거절',
    title: '아쉽지만 이번 신청은 승인되지 않았어요',
    description: '자세한 내용은 안내받은 이메일을 확인해 주세요.',
  },
  CANCELLED: {
    label: '취소',
    title: '취소된 신청이에요',
    description: '이미 취소된 신청 내역입니다.',
  },
} as const

const GENDER_LABEL: Record<string, string> = {
  MALE: '남성',
  FEMALE: '여성',
}

function formatAnswerValue(
  answer: AnswerView,
  jobLabels: Record<string, string>,
) {
  const formatSingleValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return '미입력'
    const text = String(value)
    if (answer.questionKey === 'gender') return GENDER_LABEL[text] ?? text
    if (answer.questionKey === 'job' || answer.questionKey === 'job_category') return jobLabels[text] ?? text
    return text
  }

  if (Array.isArray(answer.value)) return answer.value.map((value) => formatSingleValue(value)).join(', ')
  const value = answer.value
  if (value === null || value === undefined || value === '') return '미입력'
  return formatSingleValue(value)
}

function GuestApplicationDetailContent({ bookingNumber }: { bookingNumber: string }) {
  const router = useRouter()
  const locale = useLocale()
  const { data: jobGroups } = useLocalizedJobs()
  const [session] = useState(() => readGuestLookupSession())
  const {
    data: detail,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['guest-application-detail', session?.phone, bookingNumber],
    queryFn: () => fetchGuestApplicationDetail(session!.phone, bookingNumber),
    enabled: Boolean(session),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!session || isError || !detail) {
    return (
      <main className="min-h-screen bg-background px-5 py-8">
        <Card className="p-5">
          <p className="text-sm text-tag-text">
            {!session ? '비회원 인증이 필요해요. 다시 인증한 뒤 신청 내역을 확인해 주세요.' : '신청 내역을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'}
          </p>
          <Button className="mt-5 w-full" onClick={() => router.push('/guest')}>
            비회원 이용내역으로 가기
          </Button>
        </Card>
      </main>
    )
  }

  const status = STATUS_TEXT[detail.status as keyof typeof STATUS_TEXT] ?? STATUS_TEXT.PENDING
  const eventDate = formatLocalizedFullDate(detail.gathering.eventDate, locale)
  const startTime = formatTime(detail.gathering.startTime)
  const jobLabels = Object.fromEntries(
    (jobGroups ?? []).flatMap((group) => group.jobs.map((job) => [job.code, job.label])),
  )

  return (
    <main className="min-h-screen bg-background px-5 py-7">
      <section className="space-y-4">
        <Card className="border border-primary/20 bg-primary-light p-5">
          <p className="text-xs font-bold text-primary">{status.label}</p>
          <h1 className="mt-2 text-xl font-bold leading-snug text-foreground">{status.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-tag-text">{status.description}</p>
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
            <div className="flex gap-3">
              <Ticket size={17} className="mt-0.5 shrink-0 text-tag-text" />
              <div>
                <p className="text-xs text-tag-text">참가 안내</p>
                <p className="font-medium text-foreground">심사 완료 후 다음 단계를 안내드릴게요.</p>
              </div>
            </div>
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
                    {formatAnswerValue(answer, jobLabels)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <Button className="mt-6 w-full" variant="outlined" onClick={() => router.push('/guest')}>
        비회원 이용내역으로 돌아가기
      </Button>
    </main>
  )
}

export default function GuestApplicationDetailPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>
}) {
  const { bookingNumber } = use(params)
  return <GuestApplicationDetailContent bookingNumber={decodeURIComponent(bookingNumber)} />
}
