import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import DiningMatchingRulesForm from '@/components/admin/DiningMatchingRulesForm'

// 우연한 식탁 설정 — 매칭 규칙 기본값 (KAN-353). 식당은 장소 관리 > 식당 탭으로 옮겼다 (KAN-429)
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
    </div>
  )
}
