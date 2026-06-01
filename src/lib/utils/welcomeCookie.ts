import {
  WELCOME_SEEN_COOKIE,
  WELCOME_SEEN_COOKIE_VALUE,
  WELCOME_SEEN_MAX_AGE,
} from '@/lib/constants/welcome'

export function markWelcomeSeen(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${WELCOME_SEEN_COOKIE}=${WELCOME_SEEN_COOKIE_VALUE}; Path=/; Max-Age=${WELCOME_SEEN_MAX_AGE}; SameSite=Lax`
}
