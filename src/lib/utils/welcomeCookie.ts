const WELCOME_COOKIE_NAME = 'wh_seen_welcome'
const WELCOME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function hasSeenWelcome(): boolean {
  if (typeof document === 'undefined') return false

  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie === `${WELCOME_COOKIE_NAME}=1`)
}

export function markWelcomeSeen(): void {
  if (typeof document === 'undefined') return

  document.cookie = `${WELCOME_COOKIE_NAME}=1; path=/; max-age=${WELCOME_COOKIE_MAX_AGE}; SameSite=Lax`
}
