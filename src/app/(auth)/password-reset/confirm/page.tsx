import { Suspense } from 'react'
import PasswordResetConfirmPageClient from '@/components/auth/PasswordResetConfirmPageClient'

export default function PasswordResetConfirmPage() {
  return (
    <Suspense>
      <PasswordResetConfirmPageClient />
    </Suspense>
  )
}
