import DiningFeedbackForm from '@/components/gathering/DiningFeedbackForm'

// 우연한 식탁 행사 후 피드백 — 테이블 멤버 전용 (KAN-356)
export default async function DiningFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DiningFeedbackForm tableId={id} />
}
