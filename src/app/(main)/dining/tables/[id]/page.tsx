import DiningTableView from '@/components/gathering/DiningTableView'

// 우연한 식탁 테이블 상세 — 확정된 테이블 멤버 전용 (KAN-355)
export default async function DiningTablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DiningTableView tableId={id} />
}
