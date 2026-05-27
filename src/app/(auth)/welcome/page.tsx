import { Suspense } from 'react'
import WelcomePageClient from '@/components/auth/WelcomePageClient'

export default function WelcomePage() {
  return (
    <Suspense>
      <WelcomePageClient />
    </Suspense>
  )
}
