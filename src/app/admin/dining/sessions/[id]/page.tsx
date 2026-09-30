import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import DiningSessionConsole from '@/components/admin/DiningSessionConsole'

// 우연한 식탁 회차 콘솔 (KAN-352)
export default async function AdminDiningSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="max-w-[1280px]">
      <Link href="/admin/dining" className="inline-flex items-center gap-1 text-sm text-tag-text hover:text-foreground mb-3">
        <ChevronLeft size={16} /> 우연한 식탁
      </Link>
      <DiningSessionConsole sessionId={id} />
    </div>
  )
}
