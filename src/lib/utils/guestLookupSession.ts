const GUEST_LOOKUP_SESSION_KEY = 'whatsup_guest_application_lookup'
const VERIFIED_SESSION_TTL_MS = 30 * 60 * 1000

export interface GuestLookupSession {
  phone: string
  email: string
  verifiedAt: number
}

export function normalizeGuestPhone(value: string) {
  return value.replace(/\D/g, '').slice(0, 11)
}

export function normalizeGuestEmail(value: string) {
  return value.trim().toLowerCase()
}

export function readGuestLookupSession(): GuestLookupSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(GUEST_LOOKUP_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GuestLookupSession
    if (!parsed.phone || !parsed.email || Date.now() - parsed.verifiedAt > VERIFIED_SESSION_TTL_MS) {
      window.sessionStorage.removeItem(GUEST_LOOKUP_SESSION_KEY)
      return null
    }
    return parsed
  } catch {
    window.sessionStorage.removeItem(GUEST_LOOKUP_SESSION_KEY)
    return null
  }
}

export function writeGuestLookupSession(phone: string, email: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(GUEST_LOOKUP_SESSION_KEY, JSON.stringify({
    phone,
    email,
    verifiedAt: Date.now(),
  }))
}

export function clearGuestLookupSession() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(GUEST_LOOKUP_SESSION_KEY)
}

export function getApiErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}
