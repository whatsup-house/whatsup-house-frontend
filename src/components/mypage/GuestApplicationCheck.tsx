'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Hash, Calendar } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useCheckGuestApplication } from '@/lib/hooks/useApplications'
import { Button, Card, Input } from '@/components/ui'
import PaymentStatusBadge from '@/components/mypage/PaymentStatusBadge'
import { formatLocalizedFullDate } from '@/lib/utils/date'
import type { ApplicationStatus, GuestApplicationCheckResponse } from '@/lib/api/types'

type FormValues = {
  bookingNumber: string
  phone: string
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
  const t = useTranslations('mypage.guestApplication')
  const tApplications = useTranslations('mypage.applications')
  const locale = useLocale()
  const router = useRouter()
  const formattedDate = formatLocalizedFullDate(result.gathering.eventDate, locale)
  const isConfirmed = result.status === 'CONFIRMED'

  const goToConfirmed = () => {
    router.push(
      `/gatherings/${result.gathering.id}/apply/confirmed?bookingNumber=${result.bookingNumber}`,
    )
  }

  return (
    <div
      className={`mt-6 ${isConfirmed ? 'cursor-pointer transition-opacity hover:opacity-90' : ''}`}
      onClick={isConfirmed ? goToConfirmed : undefined}
      role={isConfirmed ? 'button' : undefined}
      tabIndex={isConfirmed ? 0 : undefined}
      onKeyDown={
        isConfirmed
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                goToConfirmed()
              }
            }
          : undefined
      }
    >
      <Card className="w-full p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-tag-text">{t('resultLabel')}</p>
          <div className="flex items-center gap-1.5">
            <PaymentStatusBadge status={result.status === 'CONFIRMED' || result.status === 'ATTENDED' ? result.paymentStatus : null} />
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[result.status]}`}>
              {tApplications(`status.${result.status}`)}
            </span>
          </div>
        </div>

        <h2 className="text-base font-bold text-foreground mb-3">{result.gathering.title}</h2>

        <div className="flex items-center gap-2 mb-4">
          <Calendar size={14} className="text-tag-text shrink-0" />
          <p className="text-sm text-tag-text">{formattedDate}</p>
        </div>

        <div className="bg-primary-light rounded-card px-4 py-3 flex items-center gap-2">
          <Hash size={14} className="text-primary shrink-0" />
          <div>
            <p className="text-xs text-tag-text">{t('bookingNumber')}</p>
            <p className="text-sm font-bold text-primary tracking-wider">{result.bookingNumber}</p>
          </div>
        </div>

        {isConfirmed && (
          <p className="text-xs text-primary text-center mt-4">
            {t('confirmedHelp')}
          </p>
        )}
      </Card>
    </div>
  )
}

export default function GuestApplicationCheck() {
  const t = useTranslations('mypage.guestApplication')
  const checkMutation = useCheckGuestApplication()
  const [notFound, setNotFound] = useState(false)
  const schema = useMemo(
    () =>
      z.object({
        bookingNumber: z.string().min(1, t('validation.bookingNumber')),
        phone: z.string().min(10, t('validation.phoneRequired')).max(11, t('validation.phoneInvalid')),
      }),
    [t],
  )

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
      <p className="text-sm text-tag-text mb-8">
        {t('intro')}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">{t('bookingNumber')}</label>
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
          <label className="block text-sm font-medium text-foreground mb-1.5">{t('phone')}</label>
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
          {checkMutation.isPending ? t('checking') : t('check')}
        </Button>
      </form>

      {notFound && (
        <p className="text-sm text-tag-text text-center mt-6">
          {t('notFound')}
        </p>
      )}

      {checkMutation.data && <ResultCard result={checkMutation.data} />}
    </div>
  )
}
