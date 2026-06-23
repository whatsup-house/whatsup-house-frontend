'use client'

import { useState } from 'react'
import { ExternalLink, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface MapLinkButtonProps {
  provider: 'naver' | 'kakao'
  href: string
}

// 공식 로고 에셋 경로 (각사 BI 가이드 준수: 원본 변형 없이 그대로 사용)
// 파일이 없으면 중립 핀 아이콘으로 자동 폴백한다.
const PROVIDER_META = {
  naver: { labelKey: 'naverLabel', shortKey: 'naverShort', src: '/assets/map-naver.png' },
  kakao: { labelKey: 'kakaoLabel', shortKey: 'kakaoShort', src: '/assets/map-kakao.png' },
} as const

export default function MapLinkButton({ provider, href }: MapLinkButtonProps) {
  const t = useTranslations('gathering.map')
  const meta = PROVIDER_META[provider]
  const [useFallback, setUseFallback] = useState(false)
  const label = t(meta.labelKey)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-1.5 h-9 pl-2 pr-3 rounded-full border border-tag-bg bg-card active:bg-tag-bg/40 transition-colors"
    >
      {useFallback ? (
        <MapPin size={18} className="text-primary" aria-hidden />
      ) : (
        // 공식 로고 원본을 변형 없이 표시. 누락 시 폴백.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.src}
          alt=""
          width={22}
          height={22}
          className="w-[22px] h-[22px] object-contain"
          onError={() => setUseFallback(true)}
        />
      )}
      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
        {/* 네모+화살표: 외부(지도 앱/웹)로 이동을 의미 */}
        <ExternalLink size={13} className="text-tag-text" aria-hidden />
        {t(meta.shortKey)}
      </span>
    </a>
  )
}
