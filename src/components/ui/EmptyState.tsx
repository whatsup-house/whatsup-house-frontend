'use client'

import { useState } from 'react'
import { LucideIcon } from 'lucide-react'
import AppImage from '@/components/ui/AppImage'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  // 일러스트가 있으면 아이콘 대신 노출하고, 로드 실패 시 아이콘으로 폴백한다. (KAN-307)
  illustration?: string
  illustrationAlt?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  illustration,
  illustrationAlt,
}: EmptyStateProps) {
  const [illustrationFailed, setIllustrationFailed] = useState(false)
  const showIllustration = Boolean(illustration) && !illustrationFailed

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {showIllustration ? (
        <div className="relative w-40 h-40">
          <AppImage
            src={illustration as string}
            alt={illustrationAlt ?? title}
            sizes="160px"
            className="object-contain"
            onError={() => setIllustrationFailed(true)}
          />
        </div>
      ) : (
        <Icon size={48} className="text-tag-text opacity-50" />
      )}
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-tag-text">{description}</p>
      )}
    </div>
  )
}
