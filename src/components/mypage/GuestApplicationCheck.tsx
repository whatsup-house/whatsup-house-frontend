'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Hash, Calendar } from 'lucide-react'
import { useCheckGuestApplication } from '@/lib/hooks/useApplications'
import { Button, Card, Input } from '@/components/ui'
import type { ApplicationStatus, GuestApplicationCheckResponse } from '@/lib/api/types'
import dayjs from 'dayjs'

const schema = z.object({
  bookingNumber: z.string().min(1, '예약번호를 입력해주세요'),
  phone: z.string().min(10, '연락처를 입력해주세요').max(11, '올바른 연락처를 입력해주세요'),
})

type FormValues = z.infer<typeof schema>

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  PENDING: '검토 중',
  CONFIRMED: '확정',
  CANCELLED: '취소됨',
  ATTENDED: '참석 완료',
}

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  PENDING: 'bg-tag-bg text-tag-text',
  CONFIRMED: 'bg-primary-light text-primary',
  CANCELLED: 'bg-tag-bg text-tag-text opacity-60',
  ATTENDED: 'bg-primary-light text-primary',
}

interface ResultCardProps {
  result: GuestApplicationCheckResponse
}

function ResultCard({ result }: ResultCardProps) {
  const formattedDate = dayjs(result.gathering.eventDate).format('YYYY년 M월 D일 (ddd)')

  return (
    <Card className="w-full p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-tag-text">신청 내역</p>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[result.status]}`}>
          {STATUS_LABEL[result.status]}
        </span>
      </div>

      <h2 className="text-base font-bold text-foreground mb-3">{result.gathering.title}</h2>

      <div className="flex items-center gap-2 mb-4">
        <Calendar size={14} className="text-tag-text shrink-0" />
        <p className="text-sm text-tag-text">{formattedDate}</p>
      </div>

      <div className="bg-primary-light rounded-card px-4 py-3 flex items-center gap-2">
        <Hash size={14} className="text-primary shrink-0" />
        <div>
          <p className="text-xs text-tag-text">예약번호</p>
          <p className="text-sm font-bold text-primary tracking-wider">{result.bookingNumber}</p>
        </div>
      </div>
    </Card>
  )
}

export default function GuestApplicationCheck() {
  const checkMutation = useCheckGuestApplication()
  const [notFound, setNotFound] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = (values: FormValues) => {
    setNotFound(false)
    checkMutation.mutate(values, {
      onError: () => setNotFound(true),
    })
  }

  return (
    <div className="px-5 py-8">
      <h1 className="text-xl font-bold text-foreground mb-2">신청 내역 조회</h1>
      <p className="text-sm text-tag-text mb-8">
        예약번호와 연락처로 신청 내역을 확인할 수 있어요
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">예약번호</label>
          <Input
            {...register('bookingNumber')}
            placeholder="WH260421A3F2"
            className="w-full"
          />
          {errors.bookingNumber && (
            <p className="text-xs text-red-500 mt-1">{errors.bookingNumber.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">연락처</label>
          <Input
            {...register('phone')}
            placeholder="01012345678"
            inputMode="tel"
            className="w-full"
          />
          {errors.phone && (
            <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full mt-2"
          disabled={checkMutation.isPending}
        >
          <Search size={16} className="mr-1" />
          {checkMutation.isPending ? '조회 중...' : '조회하기'}
        </Button>
      </form>

      {notFound && (
        <p className="text-sm text-tag-text text-center mt-6">
          예약번호 또는 연락처를 확인해주세요
        </p>
      )}

      {checkMutation.data && <ResultCard result={checkMutation.data} />}
    </div>
  )
}
