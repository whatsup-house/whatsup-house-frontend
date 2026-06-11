import DesktopBrandPanel from '@/components/layout/DesktopBrandPanel'

/**
 * 데스크탑 앱 셸.
 * lg↑에서 풀블리드 배경 사진 + 좌측 브랜드 패널 + 둥근 모바일 카드(고정 높이/내부 스크롤)를 구성한다.
 * lg 미만(모바일/태블릿)에서는 기존 .mobile-layout 풀블리드 레이아웃 그대로다.
 *
 * (main)·(auth) 그룹 레이아웃이 공통으로 사용한다. admin은 그룹 밖이라 셸이 적용되지 않는다.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:mx-auto lg:flex lg:max-w-[1120px] lg:items-center">
      <DesktopBrandPanel />
      <div className="mobile-layout relative flex flex-col min-h-screen bg-background lg:mx-0 lg:h-[calc(100vh-48px)] lg:min-h-0 lg:overflow-hidden lg:rounded-[15px] lg:shadow-2xl">
        {children}
      </div>
    </div>
  )
}
