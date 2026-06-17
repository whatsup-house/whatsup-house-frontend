'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
import { formatKoreanFullDate, formatTime } from '@/lib/utils/date'
import { PAYMENT_ACCOUNT } from '@/lib/constants/payment'
import type { GatheringDetail } from '@/lib/api/types'

type Mode = 'completed' | 'confirmed'

interface ApplicationResultViewProps {
  gathering: GatheringDetail
  mode: Mode
  bookingNumber?: string | null
}

const HEADLINE: Record<Mode, string> = {
  completed: '신청이 완료됐어요! 🎉',
  confirmed: '예약이 확정되었어요! 🎉',
}

const SUBCOPY: Record<Mode, string> = {
  completed: '호스트가 확인 후 예약 확정을 알려드릴게요',
  confirmed: '게더링 당일에 뵙겠습니다',
}

export default function ApplicationResultView({
  gathering,
  mode,
  bookingNumber,
}: ApplicationResultViewProps) {
  const router = useRouter()

  const formattedDate = formatKoreanFullDate(gathering.eventDate)
  const formattedTime = formatTime(gathering.startTime)

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

        <h1 className="text-2xl font-bold text-foreground mb-2">{HEADLINE[mode]}</h1>
        <p className="text-sm text-tag-text mb-8">{SUBCOPY[mode]}</p>

        {bookingNumber && <BookingNumberCard bookingNumber={bookingNumber} />}

        <Card className="w-full p-5 mb-4">
          <p className="text-xs text-tag-text mb-1">신청한 게더링</p>
          <h2 className="text-base font-bold text-foreground mb-4">{gathering.title}</h2>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-tag-text shrink-0" />
              <div>
                <p className="text-xs text-tag-text">날짜 + 시간</p>
                <p className="text-sm font-medium text-foreground">
                  {formattedDate} {formattedTime}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-tag-text shrink-0" />
              <div>
                <p className="text-xs text-tag-text">장소</p>
                <p className="text-sm font-medium text-foreground">{gathering.location?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CreditCard size={16} className="text-tag-text shrink-0" />
              <div>
                <p className="text-xs text-tag-text">참가비</p>
                <p className="text-sm font-medium text-foreground">
                  {(gathering.price ?? 0).toLocaleString()}원
                </p>
              </div>
            </div>
          </div>
        </Card>

        {mode === 'confirmed' && <PaymentAccountCard price={gathering.price ?? 0} />}

        <div className="w-full flex flex-col gap-3 mt-4">
          {bookingNumber ? (
            <Button
              variant="outlined"
              size="lg"
              className="w-full"
              onClick={() => router.push('/applications/check')}
            >
              예약번호로 신청 상태 조회하기
            </Button>
          ) : (
            <Button
              variant="outlined"
              size="lg"
              className="w-full"
              onClick={() => router.push('/mypage?tab=applications')}
            >
              마이페이지에서 확정 여부 확인하기
            </Button>
          )}

          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-tag-text underline py-3 min-h-[44px]"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}

function BookingNumberCard({ bookingNumber }: { bookingNumber: string }) {
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
          <p className="text-xs text-tag-text">예약번호</p>
          <p className="text-base font-bold text-primary tracking-wider">{bookingNumber}</p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-primary font-medium shrink-0"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <p className="text-xs text-tag-text mt-2 px-1">
        예약번호와 연락처로 신청 내역을 조회할 수 있어요
      </p>
    </div>
  )
}

function PaymentAccountCard({ price }: { price: number }) {
  const [copied, setCopied] = useState(false)
  const accountText = `${PAYMENT_ACCOUNT.bankName} ${PAYMENT_ACCOUNT.accountNumber}`

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
          <p className="text-xs text-tag-text">참가비 입금 계좌</p>
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
            {copied ? '복사됨' : '복사'}
          </span>
        </button>

        <div className="flex flex-col gap-1 pt-2 border-t border-primary/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-tag-text">예금주</span>
            <span className="text-foreground font-medium">{PAYMENT_ACCOUNT.accountHolder}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-tag-text">입금액</span>
            <span className="text-foreground font-medium">{price.toLocaleString()}원</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-tag-text mt-2 px-1">계좌번호를 누르면 복사돼요</p>
    </div>
  )
}
