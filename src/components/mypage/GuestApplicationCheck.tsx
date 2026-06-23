'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { requestGuestEmailVerification, confirmGuestEmailVerification } from '@/lib/api/auth'
import { fetchGuestApplications } from '@/lib/api/application'
import { Button, Card, Input } from '@/components/ui'
import PaymentStatusBadge from '@/components/mypage/PaymentStatusBadge'
import { formatLocalizedFullDate } from '@/lib/utils/date'
import type { ApplicationListItem, ApplicationStatus } from '@/lib/api/types'

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
  const isConfirmed = item.status === 'CONFIRMED'
  const isPaymentPending = item.status === 'PAYMENT_PENDING'
  const clickable = isConfirmed || isPaymentPending

  const go = () => {
    if (isConfirmed) {
      router.push(`/gatherings/${item.gathering.id}/apply/confirmed?bookingNumber=${item.bookingNumber}`)
    } else if (isPaymentPending) {
      router.push(`/payments/random-table?bookingNumber=${item.bookingNumber}`)
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
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-tag-text">예약번호 {item.bookingNumber}</p>
          <div className="flex items-center gap-1.5">
            <PaymentStatusBadge status={item.status === 'CONFIRMED' || item.status === 'ATTENDED' ? item.paymentStatus : null} />
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[item.status]}`}>
              {tApplications(`status.${item.status}`)}
            </span>
          </div>
        </div>

        <h2 className="text-base font-bold text-foreground mb-3">{item.gathering.title}</h2>

        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-tag-text shrink-0" />
          <p className="text-sm text-tag-text">{formattedDate}</p>
        </div>

        {isPaymentPending && <p className="text-xs text-primary text-center mt-3">결제하러 가기 →</p>}
        {isConfirmed && <p className="text-xs text-primary text-center mt-3">참가 확정 내역 보기 →</p>}
      </Card>
    </div>
  )
}

export default function GuestApplicationCheck() {
  const t = useTranslations('mypage.guestApplication')

  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailRequested, setEmailRequested] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [results, setResults] = useState<ApplicationListItem[] | null>(null)

  // 인증번호 유효시간(5분) 카운트다운
  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const requestCode = async () => {
    if (!EMAIL_PATTERN.test(email)) {
      setEmailError('올바른 이메일을 입력해주세요.')
      return
    }
    setEmailBusy(true)
    setEmailError(null)
    try {
      await requestGuestEmailVerification(email)
      setEmailRequested(true)
      setEmailVerified(false)
      setEmailCode('')
      setSecondsLeft(300)
      setResults(null)
    } catch {
      setEmailError('인증번호 발송에 실패했어요.')
    } finally {
      setEmailBusy(false)
    }
  }

  // 인증 확인 → 성공 시 그 사람(전화+이메일)의 신청 목록을 바로 조회한다.
  const confirmCode = async () => {
    if (!phone.trim()) {
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
      await confirmGuestEmailVerification(email, emailCode)
      setEmailVerified(true)
      const list = await fetchGuestApplications(phone.trim(), email.trim())
      setResults(list)
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
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="01012345678"
            inputMode="tel"
            className="w-full"
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
              setResults(null)
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

      {results !== null &&
        (results.length === 0 ? (
          <p className="text-sm text-tag-text text-center mt-8">{t('notFound')}</p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {results.map((item) => (
              <ResultCard key={item.id} item={item} />
            ))}
          </div>
        ))}
    </div>
  )
}
