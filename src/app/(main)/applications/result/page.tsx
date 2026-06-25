import { Suspense } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import TokenApplicationResultRoute from '@/components/gathering/TokenApplicationResultRoute'

export default function ApplicationResultPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
      <TokenApplicationResultRoute />
    </Suspense>
  )
}
