'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  CheckCircle,
  Calendar,
  MapPin,
  CreditCard,
  Hash,
  Copy,
  Check,
} from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { formatLocalizedFullDate, formatTime } from '@/lib/utils/date'
import { PAYMENT_ACCOUNT } from '@/lib/constants/payment'
import type { GatheringDetail } from '@/lib/api/types'

type Mode = 'completed' | 'confirmed'

interface ApplicationResultViewProps {
  gathering: GatheringDetail
  mode: Mode
  bookingNumber?: string | null
}

export default function ApplicationResultView({
  gathering,
  mode,
  bookingNumber,
}: ApplicationResultViewProps) {
  const t = useTranslations('gathering.apply.result')
  const locale = useLocale()
  const router = useRouter()

  const formattedDate = formatLocalizedFullDate(gathering.eventDate, locale)
  const formattedTime = formatTime(gathering.startTime)
  const isRandomTable = gathering.gatheringType === 'RANDOM_TABLE'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-6">
        <div className="w-40 h-40 mb-6 flex items-center justify-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-primary-light flex items-center justify-center">
              <CheckCircle size={56} className="text-primary" />
            </div>
            <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-tag-bg" />
            <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-tag-bg" />
            <div className="absolute top-4 -left-4 w-2 h-2 rounded-full bg-tag-bg" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">{t(`headline.${mode}`)}</h1>
        <p className="text-sm text-tag-text mb-8">{t(`subcopy.${mode}`)}</p>

        {bookingNumber && <BookingNumberCard bookingNumber={bookingNumber} />}

        <Card className="w-full p-5 mb-4">
          <p className="text-xs text-tag-text mb-1">{t('appliedGathering')}</p>
          <h2 className="text-base font-bold text-foreground mb-4">{gathering.title}</h2>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-tag-text shrink-0" />
              <div>
                <p className="text-xs text-tag-text">{t('dateTime')}</p>
                <p className="text-sm font-medium text-foreground">
                  {formattedDate} {formattedTime}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-tag-text shrink-0" />
              <div>
                <p className="text-xs text-tag-text">{t('location')}</p>
                <p className="text-sm font-medium text-foreground">{gathering.location?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CreditCard size={16} className="text-tag-text shrink-0" />
              <div>
                <p className="text-xs text-tag-text">{isRandomTable ? '참가 방식' : t('price')}</p>
                <p className="text-sm font-medium text-foreground">
                  {isRandomTable
                    ? mode === 'confirmed' ? '이용권 1회 사용 완료' : '심사 승인 후 이용권으로 참가해요'
                    : t('priceValue', { price: (gathering.price ?? 0).toLocaleString(locale) })}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {mode === 'confirmed' && !isRandomTable && <PaymentAccountCard price={gathering.price ?? 0} />}

        <div className="w-full flex flex-col gap-3 mt-4">
          {bookingNumber ? (
            <Button
              variant="outlined"
              size="lg"
              className="w-full"
              onClick={() => router.push('/applications/check')}
            >
              {t('checkWithBookingNumber')}
            </Button>
          ) : (
            <Button
              variant="outlined"
              size="lg"
              className="w-full"
              onClick={() => router.push('/mypage?tab=applications')}
            >
              {t('checkInMypage')}
            </Button>
          )}

          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-tag-text underline py-3 min-h-[44px]"
          >
            {t('goHome')}
          </button>
        </div>
      </div>
    </div>
  )
}

function BookingNumberCard({ bookingNumber }: { bookingNumber: string }) {
  const t = useTranslations('gathering.apply.result')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookingNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard 미지원 환경: silent
    }
  }

  return (
    <div className="w-full mb-4">
      <div className="bg-primary-light rounded-card px-5 py-4 flex items-center gap-3">
        <Hash size={18} className="text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-tag-text">{t('bookingNumber')}</p>
          <p className="text-base font-bold text-primary tracking-wider">{bookingNumber}</p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-primary font-medium shrink-0"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
      <p className="text-xs text-tag-text mt-2 px-1">
        {t('bookingNumberHelp')}
      </p>
    </div>
  )
}

function PaymentAccountCard({ price }: { price: number }) {
  const t = useTranslations('gathering.apply.result')
  const tPayment = useTranslations('payment.account')
  const locale = useLocale()
  const [copied, setCopied] = useState(false)
  const accountText = `${tPayment('bankName')} ${PAYMENT_ACCOUNT.accountNumber}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accountText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard 미지원 환경: silent
    }
  }

  return (
    <div className="w-full mb-4">
      <div className="bg-primary-light rounded-card px-5 py-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-primary shrink-0" />
          <p className="text-xs text-tag-text">{t('paymentAccount')}</p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-between gap-3 text-left"
        >
          <span className="text-base font-bold text-primary underline tracking-wide">
            {accountText}
          </span>
          <span className="flex items-center gap-1 text-xs text-primary font-medium shrink-0">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t('copied') : t('copy')}
          </span>
        </button>

        <div className="flex flex-col gap-1 pt-2 border-t border-primary/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-tag-text">{t('accountHolder')}</span>
            <span className="text-foreground font-medium">{tPayment('accountHolder')}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-tag-text">{t('depositAmount')}</span>
            <span className="text-foreground font-medium">{t('priceValue', { price: price.toLocaleString(locale) })}</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-tag-text mt-2 px-1">{t('accountCopyHelp')}</p>
    </div>
  )
}
