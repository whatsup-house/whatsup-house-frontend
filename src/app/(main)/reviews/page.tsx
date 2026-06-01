import { Suspense } from 'react'
import AllReviewList from '@/components/gathering/AllReviewList'

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Suspense>
        <AllReviewList />
      </Suspense>
    </div>
  )
}
