'use client'

import { useSearchParams } from 'next/navigation'
import GuestApplicationCheck from './GuestApplicationCheck'
import TokenApplicationCheck from './TokenApplicationCheck'

export default function ApplicationCheckContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  if (token) {
    return <TokenApplicationCheck token={token} />
  }
  return <GuestApplicationCheck />
}
