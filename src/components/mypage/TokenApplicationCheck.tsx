'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Hash } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useApplicationByToken } from '@/lib/hooks/useApplications'
import { Card, LoadingSpinner } from '@/components/ui'
import PaymentStatusBadge from '@/components/mypage/PaymentStatusBadge'
import { formatLocalizedFullDate } from '@/lib/utils/date'
import type { ApplicationStatus } from '@/lib/api/types'

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  PENDING: 'bg-tag-bg text-tag-text',
  CONFIRMED: 'bg-primary-light text-primary',
  CANCELLED: 'bg-tag-bg text-tag-text opacity-60',
  ATTENDED: 'bg-primary-light text-primary',
}

interface TokenApplicationCheckProps {
  token: string
}

export default function TokenApplicationCheck({ token }: TokenApplicationCheckProps) {
  const t = useTranslations('mypage.guestApplication')
  const tApplications = useTranslations('mypage.applications')
  const locale = useLocale()
  const router = useRouter()
  const { data, isLoading, isError } = useApplicationByToken(token)

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="px-5 py-16 flex flex-col items-center text-center">
        <p className="text-4xl mb-4">🔗</p>
        <h1 className="text-lg font-bold text-foreground mb-2">{t('invalidTitle')}</h1>
        <p className="text-sm text-tag-text mb-8">{t('invalidDescription')}</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/applications/check"
            className="text-sm text-primary underline text-center"
          >
            {t('checkDirectly')}
          </Link>
          <Link href="/" className="text-sm text-tag-text text-center">
            {t('goHome')}
          </Link>
        </div>
      </div>
    )
  }

  const formattedDate = formatLocalizedFullDate(data.gathering.eventDate, locale)
  const startTime = data.gathering.startTime?.slice(0, 5)
  const isConfirmed = data.status === 'CONFIRMED'

  const goToConfirmed = () => {
    router.push(
      `/gatherings/${data.gathering.id}/apply/confirmed?bookingNumber=${data.bookingNumber}`,
    )
  }

  return (
    <div className="px-5 py-8">
      <h1 className="text-xl font-bold text-foreground mb-2">{t('title')}</h1>
      <p className="text-sm text-tag-text mb-6">{t('description')}</p>

      <div
        className={isConfirmed ? 'cursor-pointer transition-opacity hover:opacity-90' : ''}
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
            {data.applicantName && (
              <p className="text-sm font-medium text-foreground">{data.applicantName}</p>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <PaymentStatusBadge status={data.status === 'CONFIRMED' || data.status === 'ATTENDED' ? data.paymentStatus : null} />
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[data.status]}`}>
                {tApplications(`status.${data.status}`)}
              </span>
            </div>
          </div>

          <h2 className="text-base font-bold text-foreground mb-4">{data.gathering.title}</h2>

          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-tag-text shrink-0" />
              <p className="text-sm text-tag-text">
                {formattedDate}{startTime ? ` ${startTime}` : ''}
              </p>
            </div>

            {data.gathering.locationName && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-tag-text shrink-0" />
                <p className="text-sm text-tag-text">{data.gathering.locationName}</p>
              </div>
            )}
          </div>

          <div className="bg-primary-light rounded-card px-4 py-3 flex items-center gap-2">
            <Hash size={14} className="text-primary shrink-0" />
            <div>
              <p className="text-xs text-tag-text">{t('bookingNumber')}</p>
              <p className="text-sm font-bold text-primary tracking-wider">{data.bookingNumber}</p>
            </div>
          </div>

          {isConfirmed && (
            <p className="text-xs text-primary text-center mt-4">
              {t('confirmedHelp')}
            </p>
          )}
        </Card>
      </div>

      <div className="mt-8 flex flex-col gap-3 items-center">
        <Link href="/login" className="text-sm text-primary underline">
          {t('loginToView')}
        </Link>
        <Link href="/" className="text-sm text-tag-text">
          {t('goHome')}
        </Link>
      </div>
    </div>
  )
}
