'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Ticket, CalendarDays } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { confirmGuestEmailVerification, requestGuestEmailVerification } from '@/lib/api/auth'
import { fetchGuestOverview } from '@/lib/api/guest'
import {
  clearGuestLookupSession,
  getApiErrorStatus,
  normalizeGuestEmail,
  normalizeGuestPhone,
  readGuestLookupSession,
  writeGuestLookupSession,
} from '@/lib/utils/guestLookupSession'
import { getApplicationDisplayStatus } from '@/lib/utils/applicationDisplay'
import type { ApplicationStatus, GuestOverview } from '@/lib/api/types'

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  PENDING: '심사중',
  PAYMENT_PENDING: '입금확인중',
  CONFIRMED: '참가 확정',
  REJECTED: '승인 거절',
  CANCELLED: '취소',
  ATTENDED: '참석 완료',
}

function getGuestApplicationHref(application: GuestOverview['applications'][number]) {
  const bookingNumber = encodeURIComponent(application.bookingNumber)
  if (application.status === 'PAYMENT_PENDING' && application.gathering.gatheringType === 'RANDOM_TABLE') {
    return `/payments/random-table?bookingNumber=${bookingNumber}`
  }
  if (application.status === 'PAYMENT_PENDING'
    || application.status === 'CONFIRMED'
    || application.status === 'ATTENDED') {
    return `/gatherings/${application.gathering.id}/apply/confirmed?bookingNumber=${bookingNumber}`
  }
  return `/guest/applications/${bookingNumber}`
}

function getGuestApplicationStatusLabel(application: GuestOverview['applications'][number]) {
  const displayStatus = getApplicationDisplayStatus(application.status, application.paymentStatus)
  return STATUS_LABEL[displayStatus]
}

export default function GuestOverviewPage() {
  const router = useRouter()
  const restoredSession = readGuestLookupSession()
  const [phone, setPhone] = useState(restoredSession?.phone ?? '')
  const [email, setEmail] = useState(restoredSession?.email ?? '')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [overview, setOverview] = useState<GuestOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadOverview = useCallback(async (targetPhone: string, targetEmail: string) => {
    const data = await fetchGuestOverview(targetPhone, targetEmail)
    setOverview(data)
  }, [])

  useEffect(() => {
    if (!codeSent || secondsLeft <= 0) return
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [codeSent, secondsLeft])

  useEffect(() => {
    const session = readGuestLookupSession()
    if (!session) return
    setLoading(true)
    setError('')
    loadOverview(session.phone, session.email)
      .catch(() => {
        clearGuestLookupSession()
        setError('인증이 만료됐어요. 이메일 인증을 다시 진행해주세요.')
      })
      .finally(() => setLoading(false))
  }, [loadOverview])

  const requestCode = async () => {
    const normalizedPhone = normalizeGuestPhone(phone)
    const normalizedEmail = normalizeGuestEmail(email)
    if (!/^01\d{8,9}$/.test(normalizedPhone)) {
      setError('올바른 연락처를 입력해 주세요.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('올바른 이메일을 입력해 주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await requestGuestEmailVerification(normalizedEmail)
      setPhone(normalizedPhone)
      setEmail(normalizedEmail)
      setCodeSent(true)
      setCode('')
      setSecondsLeft(300)
      setOverview(null)
      clearGuestLookupSession()
    } catch (cause) {
      setError(getApiErrorStatus(cause) === 429
        ? '인증번호 요청이 너무 잦아요. 잠시 후 다시 시도해주세요.'
        : '인증번호 발송에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  const verifyAndLoad = async () => {
    if (secondsLeft === 0) {
      setError('인증번호가 만료됐어요. 재발송해주세요.')
      return
    }
    if (!/^\d{6}$/.test(code)) {
      setError('6자리 인증번호를 입력해주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const normalizedPhone = normalizeGuestPhone(phone)
      const normalizedEmail = normalizeGuestEmail(email)
      await confirmGuestEmailVerification(normalizedEmail, code.trim())
      setPhone(normalizedPhone)
      setEmail(normalizedEmail)
      writeGuestLookupSession(normalizedPhone, normalizedEmail)
      await loadOverview(normalizedPhone, normalizedEmail)
    } catch (cause) {
      const message = (cause as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message ?? '인증번호 또는 입력 정보를 확인해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  if (overview) {
    return (
      <main className="min-h-screen bg-background px-5 py-7">
        <h1 className="text-xl font-bold">비회원 이용내역</h1>
        <p className="mt-1 text-sm text-tag-text">{overview.name}님의 이용권과 신청 내역이에요.</p>

        <Card className="mt-6 p-5 bg-primary-light">
          <div className="flex items-center gap-2 text-primary"><Ticket size={20} /><strong>보유 이용권</strong></div>
          <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
            우연한식탁 전용 이용권
          </p>
          <p className="mt-4 text-3xl font-bold text-primary">{overview.totalRemaining}회</p>
          <p className="mt-1 text-xs text-tag-text">우연한식탁 신청에만 사용할 수 있는 잔여 횟수예요.</p>
        </Card>

        <section className="mt-7">
          <div className="mb-3 flex items-center gap-2"><CalendarDays size={19} className="text-primary" /><h2 className="font-bold">신청 내역</h2></div>
          <div className="space-y-3">
            {overview.applications.length === 0 && <Card className="p-5 text-sm text-tag-text">신청 내역이 없어요.</Card>}
            {overview.applications.map((application) => (
              <button
                key={application.id}
                type="button"
                className="w-full text-left"
                onClick={() => router.push(getGuestApplicationHref(application))}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-bold">{application.gathering.title}</p><p className="mt-1 text-xs text-tag-text">{application.gathering.eventDate} · {application.bookingNumber}</p></div>
                    <span className="shrink-0 text-xs font-bold text-primary">{getGuestApplicationStatusLabel(application)}</span>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-2"><Mail size={22} className="text-primary" /><h1 className="text-xl font-bold">비회원 이용내역 조회</h1></div>
        <p className="mt-2 text-sm text-tag-text">신청할 때 사용한 연락처와 이메일을 인증해 주세요.</p>

        <Card className="mt-7 space-y-4 p-5">
          <Input label="연락처" placeholder="01012345678" value={phone} onChange={(event) => setPhone(normalizeGuestPhone(event.target.value))} disabled={codeSent} />
          <Input label="이메일" type="email" placeholder="email@example.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={codeSent} />
          {codeSent && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">인증번호</label>
              <div className="relative">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6자리 인증번호"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-input border border-tag-bg bg-card px-4 py-3 pr-16 text-foreground placeholder:text-tag-text focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {secondsLeft > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold tabular-nums text-primary">
                    {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
              {secondsLeft === 0 && <p className="text-xs text-tag-text">인증번호가 만료됐어요. 재발송해주세요.</p>}
            </div>
          )}
          {error && <p className="text-sm text-primary">{error}</p>}
          <Button className="w-full" size="lg" isLoading={loading} disabled={codeSent && secondsLeft === 0} onClick={codeSent ? verifyAndLoad : requestCode}>
            {codeSent ? '인증하고 이용내역 보기' : '인증번호 받기'}
          </Button>
          {codeSent && <button type="button" className="w-full text-xs text-tag-text underline" onClick={() => { setCodeSent(false); setCode(''); setSecondsLeft(0); setOverview(null); clearGuestLookupSession(); setError('') }}>연락처·이메일 다시 입력</button>}
        </Card>
      </div>
    </main>
  )
}
