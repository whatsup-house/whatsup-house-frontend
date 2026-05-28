import {
  LEGACY_WELCOME_SEEN_KEY,
  WELCOME_SEEN_COOKIE,
  WELCOME_SEEN_COOKIE_VALUE,
  WELCOME_SEEN_MAX_AGE,
} from '@/lib/constants/welcome'

export function getLegacyWelcomeSeen(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(LEGACY_WELCOME_SEEN_KEY) === 'true'
}

export function markWelcomeSeen(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${WELCOME_SEEN_COOKIE}=${WELCOME_SEEN_COOKIE_VALUE}; Path=/; Max-Age=${WELCOME_SEEN_MAX_AGE}; SameSite=Lax`
}
