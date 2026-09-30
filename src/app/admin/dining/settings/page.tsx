import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import DiningMatchingRulesForm from '@/components/admin/DiningMatchingRulesForm'
import DiningVenuePool from '@/components/admin/DiningVenuePool'

// 우연한 식탁 설정 — 매칭 규칙 기본값, 식당 풀 (KAN-353)
export default function AdminDiningSettingsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin/dining" className="mb-3 inline-flex items-center gap-1 text-sm text-tag-text hover:text-foreground">
          <ChevronLeft size={16} /> 우연한 식탁
        </Link>
        <h1 className="text-[22px] font-bold text-foreground">우연한 식탁 설정</h1>
      </div>
      <DiningMatchingRulesForm />
      <DiningVenuePool />
    </div>
  )
}
