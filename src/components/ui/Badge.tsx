import { useTranslations } from 'next-intl'
import type { GatheringStatus } from '@/lib/api/types'

type AttendanceStatus = 'ATTENDED' | 'PENDING'
type BadgeVariant = GatheringStatus | AttendanceStatus

interface BadgeProps {
  variant: BadgeVariant
}

const BADGE_CONFIG: Record<BadgeVariant, { labelKey: string; className: string }> = {
  OPEN:       { labelKey: 'OPEN', className: 'bg-green-100 text-green-700' },
  CLOSED:     { labelKey: 'CLOSED', className: 'bg-gray-100 text-gray-500' },
  COMPLETED:  { labelKey: 'COMPLETED', className: 'bg-blue-100 text-blue-700' },
  CANCELLED:  { labelKey: 'CANCELLED', className: 'bg-red-100 text-red-500' },
  ATTENDED:   { labelKey: 'ATTENDED', className: 'bg-teal-100 text-teal-700' },
  PENDING:    { labelKey: 'PENDING', className: 'bg-yellow-100 text-yellow-700' },
}

export default function Badge({ variant }: BadgeProps) {
  const t = useTranslations('common.status')
  const { labelKey, className } = BADGE_CONFIG[variant]
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${className}`}>
      {t(labelKey)}
    </span>
  )
}
