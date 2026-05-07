import AllReviewList from '@/components/gathering/AllReviewList'

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-lg font-bold text-foreground">다녀온 사람들의 후기</h1>
      </div>
      <AllReviewList />
    </div>
  )
}
