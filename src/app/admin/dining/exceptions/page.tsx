import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import AdminDiningExceptions from '@/components/admin/AdminDiningExceptions'

// 우연한 식탁 예외함 (KAN-353)
export default function AdminDiningExceptionsPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/admin/dining" className="mb-3 inline-flex items-center gap-1 text-sm text-tag-text hover:text-foreground">
        <ChevronLeft size={16} /> 우연한 식탁
      </Link>
      <AdminDiningExceptions />
    </div>
  )
}
