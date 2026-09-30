import AdminGatheringTypeDetail from '@/components/admin/AdminGatheringTypeDetail'

// 관리자 모임 종류 상세 — 회차 관리 (KAN-340)
export default async function AdminGatheringDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminGatheringTypeDetail gatheringId={id} />
}
