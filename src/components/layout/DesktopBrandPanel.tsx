import Image from 'next/image'
import { useTranslations } from 'next-intl'

/**
 * 데스크탑(lg↑) 전용 브랜드 영역.
 * - 뷰포트 전체를 호스트 사진으로 덮고(fixed), 그 위에 앱 프레임을 띄운다.
 * - 좌측에는 브랜드 카피를 오버레이로 둔다(비상호작용, 조작은 프레임 안에서만).
 * 모바일·태블릿(<1024px)에서는 렌더되지 않는다.
 */
export default function DesktopBrandPanel() {
  const t = useTranslations('desktopBrand')
  const keywords = t.raw('keywords') as string[]

  return (
    <>
      {/* 뷰포트 전체 배경 사진 */}
      <div aria-hidden className="fixed inset-0 -z-10 hidden lg:block">
        <Image
          src="/home/desktop-background.jpeg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/80 via-foreground/65 to-foreground/90" />
      </div>

      {/* 브랜드 카피 (앱 프레임 좌측 오버레이) */}
      <aside className="pointer-events-none relative hidden text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-1 lg:flex-col lg:justify-center lg:gap-8 lg:px-14 lg:py-16">
        <div>
          <h2 className="font-brand-kr text-[44px] font-bold leading-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.5)]">
            {t('brand')}
          </h2>
          <p className="font-brand-script text-[28px] leading-none text-white/90">
            What&apos;s up house
          </p>
        </div>

        <div>
          <p className="text-[36px] font-bold leading-snug drop-shadow-[0_2px_18px_rgba(0,0,0,0.5)]">
            {t('headlineLine1')}
            <br />
            {t('headlineLine2')}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-white/85">
            {t('descriptionLine1')}
            <br />
            {t('descriptionLine2')}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span
                key={k}
                className="rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}
