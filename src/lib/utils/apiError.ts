export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return fallback
  }

  const response = (error as { response?: { data?: { message?: unknown } } }).response
  const message = response?.data?.message
  return typeof message === 'string' && message.length > 0 ? message : fallback
}
