export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return fallback
  }

  const response = (error as { response?: { data?: { message?: unknown } } }).response
  const message = response?.data?.message
  return typeof message === 'string' && message.length > 0 ? message : fallback
}

export function getApiErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return null
  }

  const response = (error as { response?: { data?: { code?: unknown } } }).response
  const code = response?.data?.code
  return typeof code === 'string' && code.length > 0 ? code : null
}

export function resolveApiErrorMessage(
  error: unknown,
  t: (key: string) => string
): string {
  const code = getApiErrorCode(error)
  if (code) {
    try {
      return t(`errors.${code}`)
    } catch {
      // Fall through to backend message fallback for unmapped legacy codes.
    }
  }

  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response
    const message = response?.data?.message
    if (typeof message === 'string' && message.length > 0) return message
  }

  return t('errors.UNKNOWN')
}
