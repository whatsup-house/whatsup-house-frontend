import Image from 'next/image'
import Link from 'next/link'

const KEYWORDS = ['#소규모', '#오프라인', '#잔잔한_모임', '#2030']

/**
 * 데스크탑(lg↑) 전용 브랜드 패널.
 * 호스트 이미지 풀블리드 + 다크 오버레이 + 흰색 카피로 앱 프레임 좌측 여백을
 * 와썹하우스 브랜딩/소개로 채운다 (/welcome 톤과 일치).
 * 모바일·태블릿(<1024px)에서는 렌더되지 않는다.
 */
export default function DesktopBrandPanel() {
  return (
    <aside className="relative hidden text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-1 lg:flex-col lg:justify-between lg:overflow-hidden lg:px-14 lg:py-16">
      <Image
        src="/assets/host-1.jpg"
        alt=""
        fill
        sizes="700px"
        className="object-cover object-[60%_center]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground/75 via-foreground/55 to-foreground/85" />

      <div className="relative">
        <h2 className="font-brand-kr text-[44px] font-bold leading-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)]">
          와썹하우스
        </h2>
        <p className="font-brand-script text-[28px] leading-none text-white/90">
          What&apos;s up house
        </p>
      </div>

      <div className="relative">
        <p className="text-[36px] font-bold leading-snug drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)]">
          잔잔한 게 좋은
          <br />
          사람들의 공간
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-white/85">
          혼자 사는 2030을 위한 오프라인 소셜 게더링.
          <br />
          부담 없는 소규모 모임을 오른쪽에서 둘러보세요.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {KEYWORDS.map((k) => (
            <span
              key={k}
              className="rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
            >
              {k}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-button bg-primary px-6 py-3 text-[15px] font-bold text-white shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
        >
          게더링 둘러보기 →
        </Link>
      </div>
    </aside>
  )
}
