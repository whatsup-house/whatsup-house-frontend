import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import AdminDiningExceptions from '@/components/admin/AdminDiningExceptions'

// 우연한 식탁 예외함 (KAN-353). ?type= 으로 유형 필터를 골라 들어온다 (대시보드 문제 지표, KAN-440)
export default async function AdminDiningExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { type } = await searchParams
  return (
    <div className="max-w-3xl">
      <Link href="/admin/dining" className="mb-3 inline-flex items-center gap-1 text-sm text-tag-text hover:text-foreground">
        <ChevronLeft size={16} /> 우연한 식탁
      </Link>
      <AdminDiningExceptions key={String(type)} initialType={typeof type === 'string' ? type : undefined} />
    </div>
  )
}
