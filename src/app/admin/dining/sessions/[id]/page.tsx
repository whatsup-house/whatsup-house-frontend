import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

// 회차 콘솔 자리. 실제 콘솔은 KAN-352에서 만든다 — 대시보드 카드 링크가 404가 나지 않게 둔다. (KAN-351)
export default async function AdminDiningSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <Link href="/admin/dining" className="inline-flex items-center gap-1 text-sm text-tag-text hover:text-foreground mb-3">
        <ChevronLeft size={16} /> 우연한 식탁
      </Link>
      <div className="bg-card rounded-card shadow-sm p-8 text-center">
        <p className="font-bold text-foreground mb-1">회차 콘솔 준비 중</p>
        <p className="text-sm text-tag-text break-all">회차 ID: {id}</p>
      </div>
    </div>
  )
}
