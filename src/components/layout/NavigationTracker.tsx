'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useNavigationStore } from '@/lib/store/navigationStore'

export default function NavigationTracker() {
  const pathname = usePathname()
  const push = useNavigationStore((state) => state.push)

  useEffect(() => {
    push(pathname)
  }, [pathname, push])

  return null
}
