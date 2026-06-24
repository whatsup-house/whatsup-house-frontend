import GuestApplicationCheck from '@/components/mypage/GuestApplicationCheck'

// 신청 접수 메일 링크 진입점. 비회원은 전화번호+이메일 인증으로 신청 내역을 조회한다. (KAN-308)
export default function GuestApplicationsPage() {
  return (
    <main className="min-h-screen bg-background">
      <GuestApplicationCheck />
    </main>
  )
}
