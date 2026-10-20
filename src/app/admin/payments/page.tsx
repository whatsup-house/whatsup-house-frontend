import AdminPayments from '@/components/admin/AdminPayments'

// 입금 알림 로그·송금 목록 (KAN-411). ?case={예외 ID}는 예외함 PAYMENT 건에서 넘어온 강조 대상
export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { case: caseId } = await searchParams
  return (
    <div className="max-w-5xl">
      <AdminPayments highlightCaseId={caseId} />
    </div>
  )
}
