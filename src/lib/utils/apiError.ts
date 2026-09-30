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

export function getApiErrorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return null
  }

  const status = (error as { response?: { status?: unknown } }).response?.status
  return typeof status === 'number' ? status : null
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

// 관리자 화면용. 채팅 도메인 403(CHAT_NOT_MEMBER·CHAT_MUTED 등)이 아닌 403 은 관리자 권한이 없다는 뜻이다.
export function getAdminApiErrorMessage(error: unknown, fallback: string): string {
  if (getApiErrorStatus(error) === 403 && !getApiErrorCode(error)?.startsWith('CHAT_')) {
    return '관리자만 할 수 있는 작업이에요. 관리자 계정으로 다시 로그인해주세요.'
  }
  return getApiErrorMessage(error, fallback)
}
