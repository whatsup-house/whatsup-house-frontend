import DiningApplyFlow from '@/components/gathering/DiningApplyFlow'

// 우연한 식탁 신청: 희망 회차 → 표준 폼 → 이용권 → 제출 (KAN-344)
export default async function DiningApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const { session } = await searchParams
  return <DiningApplyFlow gatheringId={id} initialSessionId={typeof session === 'string' ? session : null} />
}
