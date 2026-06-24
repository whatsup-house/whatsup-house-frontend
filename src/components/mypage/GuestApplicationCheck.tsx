'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Ticket } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { requestGuestEmailVerification, confirmGuestEmailVerification } from '@/lib/api/auth'
import { fetchGuestOverview } from '@/lib/api/guest'
import { Button, Card, Input } from '@/components/ui'
import PaymentStatusBadge from '@/components/mypage/PaymentStatusBadge'
import { formatLocalizedFullDate } from '@/lib/utils/date'
import {
  clearGuestLookupSession,
  getApiErrorStatus,
  normalizeGuestEmail,
  normalizeGuestPhone,
  readGuestLookupSession,
  writeGuestLookupSession,
} from '@/lib/utils/guestLookupSession'
import { getApplicationDisplayStatus, isDepositPendingApplication } from '@/lib/utils/applicationDisplay'
import type { ApplicationListItem, ApplicationStatus, GuestOverview } from '@/lib/api/types'

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  PENDING: 'bg-tag-bg text-tag-text',
  PAYMENT_PENDING: 'bg-blue-50 text-blue-700',
  REJECTED: 'bg-red-50 text-red-700',
  CONFIRMED: 'bg-primary-light text-primary',
  CANCELLED: 'bg-tag-bg text-tag-text opacity-60',
  ATTENDED: 'bg-primary-light text-primary',
}

function ResultCard({ item }: { item: ApplicationListItem }) {
  const tApplications = useTranslations('mypage.applications')
  const locale = useLocale()
  const router = useRouter()
  const formattedDate = formatLocalizedFullDate(item.gathering.eventDate, locale)
  const isRandomTable = item.gathering.gatheringType === 'RANDOM_TABLE'
  const isConfirmed = item.status === 'CONFIRMED'
  const isPaymentPending = item.status === 'PAYMENT_PENDING'
  const isAttended = item.status === 'ATTENDED'
  const isDepositPending = isDepositPendingApplication(item.status, item.paymentStatus)
  const displayStatus = getApplicationDisplayStatus(item.status, item.paymentStatus)
  const clickable = isConfirmed || isPaymentPending || isAttended

  const go = () => {
    if (isPaymentPending && isRandomTable) {
      router.push(`/payments/random-table?bookingNumber=${encodeURIComponent(item.bookingNumber)}`)
    } else if (isConfirmed || isAttended || isPaymentPending) {
      router.push(`/gatherings/${item.gathering.id}/apply/confirmed?bookingNumber=${item.bookingNumber}`)
    }
  }

  return (
    <div
      className={clickable ? 'cursor-pointer transition-opacity hover:opacity-90' : ''}
      onClick={clickable ? go : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                go()
              }
            }
          : undefined
      }
    >
      <Card className="w-full p-5">
        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center gap-1.5">
            <PaymentStatusBadge status={!isDepositPending && (item.status === 'CONFIRMED' || item.status === 'ATTENDED') ? item.paymentStatus : null} />
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[displayStatus]}`}>
              {tApplications(`status.${displayStatus}`)}
            </span>
          </div>
        </div>

        <h2 className="text-base font-bold text-foreground mb-3">{item.gathering.title}</h2>

        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-tag-text shrink-0" />
          <p className="text-sm text-tag-text">{formattedDate}</p>
        </div>

        {(isPaymentPending || isDepositPending) && <p className="text-xs text-primary text-center mt-3">{isRandomTable ? '이용권 구매하러 가기 →' : '입금 안내 보기 →'}</p>}
        {(isConfirmed || isAttended) && !isDepositPending && <p className="text-xs text-primary text-center mt-3">참가 확정 내역 보기 →</p>}
      </Card>
    </div>
  )
}

export default function GuestApplicationCheck() {
  const t = useTranslations('mypage.guestApplication')
  const restoredSession = readGuestLookupSession()

  const [phone, setPhone] = useState(restoredSession?.phone ?? '')
  const [email, setEmail] = useState(restoredSession?.email ?? '')
  const [emailCode, setEmailCode] = useState('')
  const [emailRequested, setEmailRequested] = useState(false)
  const [emailVerified, setEmailVerified] = useState(Boolean(restoredSession))
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [overview, setOverview] = useState<GuestOverview | null>(null)

  const loadGuestOverview = useCallback(async (targetPhone: string, targetEmail: string) => {
    const data = await fetchGuestOverview(targetPhone, targetEmail)
    setOverview(data)
  }, [])

  // 인증번호 유효시간(5분) 카운트다운
  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  useEffect(() => {
    const session = readGuestLookupSession()
    if (!session) return
    loadGuestOverview(session.phone, session.email).catch(() => {
      clearGuestLookupSession()
      setEmailVerified(false)
      setEmailError('인증이 만료됐어요. 이메일 인증을 다시 진행해주세요.')
    })
  }, [loadGuestOverview])

  const requestCode = async () => {
    const normalizedEmail = normalizeGuestEmail(email)
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setEmailError('올바른 이메일을 입력해주세요.')
      return
    }
    setEmailBusy(true)
    setEmailError(null)
    try {
      await requestGuestEmailVerification(normalizedEmail)
      setEmailRequested(true)
      setEmailVerified(false)
      setEmailCode('')
      setSecondsLeft(300)
      setOverview(null)
      clearGuestLookupSession()
    } catch (error) {
      setEmailError(getApiErrorStatus(error) === 429
        ? '인증번호 요청이 너무 잦아요. 잠시 후 다시 시도해주세요.'
        : '인증번호 발송에 실패했어요.')
    } finally {
      setEmailBusy(false)
    }
  }

  // 인증 확인 → 성공 시 그 사람(전화+이메일)의 신청 목록을 바로 조회한다.
  const confirmCode = async () => {
    const normalizedPhone = normalizeGuestPhone(phone)
    const normalizedEmail = normalizeGuestEmail(email)
    if (!normalizedPhone) {
      setEmailError('연락처를 입력해주세요.')
      return
    }
    if (!/^\d{6}$/.test(emailCode)) {
      setEmailError('6자리 인증번호를 입력해주세요.')
      return
    }
    setEmailBusy(true)
    setEmailError(null)
    try {
      await confirmGuestEmailVerification(normalizedEmail, emailCode)
      setEmailVerified(true)
      setPhone(normalizedPhone)
      setEmail(normalizedEmail)
      writeGuestLookupSession(normalizedPhone, normalizedEmail)
      await loadGuestOverview(normalizedPhone, normalizedEmail)
    } catch {
      setEmailError('인증번호가 올바르지 않거나 만료됐어요.')
    } finally {
      setEmailBusy(false)
    }
  }

  return (
    <div className="px-5 py-8">
      <p className="text-sm text-tag-text mb-8">전화번호와 이메일 인증으로 신청 내역을 조회할 수 있어요.</p>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">{t('phone')}</label>
          <Input
            value={phone}
            onChange={(e) => {
              setPhone(normalizeGuestPhone(e.target.value))
              if (emailVerified) {
                setEmailVerified(false)
                setOverview(null)
                clearGuestLookupSession()
              }
            }}
            placeholder="01012345678"
            inputMode="tel"
            className="w-full"
            disabled={emailVerified}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">이메일</label>
          <Input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailRequested(false)
              setEmailVerified(false)
              setEmailCode('')
              setSecondsLeft(0)
              setOverview(null)
              clearGuestLookupSession()
            }}
            placeholder="guest@example.com"
            inputMode="email"
            className="w-full"
            disabled={emailVerified}
          />
        </div>

        <Button
          type="button"
          variant="outlined"
          size="default"
          onClick={requestCode}
          disabled={emailBusy || emailVerified}
        >
          {emailVerified ? '이메일 인증 완료' : emailRequested ? '인증번호 재발송' : '인증번호 요청'}
        </Button>

        {emailRequested && !emailVerified && (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 min-w-0">
                <input
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  placeholder="6자리 인증번호"
                  className="w-full px-4 py-3 pr-16 rounded-input border border-tag-bg bg-card text-sm"
                />
                {secondsLeft > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary tabular-nums">
                    {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="primary"
                size="default"
                onClick={confirmCode}
                disabled={emailBusy || secondsLeft === 0}
              >
                {emailBusy ? '조회 중' : '조회'}
              </Button>
            </div>
            {secondsLeft === 0 && <p className="text-xs text-tag-text">인증번호가 만료됐어요. 재발송해주세요.</p>}
          </div>
        )}

        {emailError && <p className="text-xs text-primary">{emailError}</p>}
      </div>

      {overview !== null && (
        <>
          <Card className="mt-6 p-5 bg-primary-light">
            <div className="flex items-center gap-2 text-primary">
              <Ticket size={20} />
              <strong>보유 이용권</strong>
            </div>
            <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
              우연한식탁 전용 이용권
            </p>
            <p className="mt-4 text-3xl font-bold text-primary">{overview.totalRemaining}회</p>
            <p className="mt-1 text-xs text-tag-text">우연한식탁 신청에만 사용할 수 있는 잔여 횟수예요.</p>
          </Card>

          {overview.applications.length === 0 ? (
          <p className="text-sm text-tag-text text-center mt-8">{t('notFound')}</p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {overview.applications.map((item) => (
              <ResultCard key={item.id} item={item} />
            ))}
          </div>
          )}
        </>
      )}
    </div>
  )
}
