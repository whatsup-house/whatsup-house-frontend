import { LoadingSpinner } from '@/components/ui'

// 서버가 상세 API를 기다리는 동안 바로 보여준다. (KAN-395)
export default function GatheringDetailLoading() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <LoadingSpinner size="lg" />
    </div>
  )
}
