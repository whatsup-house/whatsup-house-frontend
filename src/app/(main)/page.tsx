import HeroCarousel from '@/components/home/HeroCarousel'
import CuratedSection from '@/components/home/CuratedSection'
import ReviewsSection from '@/components/home/ReviewsSection'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background pb-6">
      <HeroCarousel />
      <CuratedSection />
      <ReviewsSection />
    </div>
  )
}
