import { Suspense } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ApplicationCheckContent from '@/components/mypage/ApplicationCheckContent'

export default function ApplicationCheckPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
      <ApplicationCheckContent />
    </Suspense>
  )
}
