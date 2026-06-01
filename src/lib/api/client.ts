import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/lib/store/authStore'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

type RefreshQueueItem = {
  resolve: () => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let refreshQueue: RefreshQueueItem[] = []

function processQueue(error: unknown): void {
  refreshQueue.forEach((item) => {
    if (error) item.reject(error)
    else item.resolve()
  })
  refreshQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // refresh 대상이 아닌 경우 그대로 reject
    // - 401이 아닌 에러
    // - 이미 재시도한 요청 (_retry)
    // - /api/auth/refresh 자체의 실패 (무한루프 방지)
    // - /api/users/me: useInitAuth에서 비로그인 여부 판단하는 경로
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/api/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    // 이미 재발급 진행 중이면 큐에 쌓아두었다가 완료 후 재시도
    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      }).then(() => {
        original._retry = true
        return apiClient(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      await apiClient.post('/api/auth/refresh')
      processQueue(null)
      return apiClient(original)
    } catch (refreshError) {
      processQueue(refreshError)
      // 리프레시 실패 = 세션 종료. 단 "원래 로그인 상태였던 사용자"만 로그인 페이지로 보낸다.
      // 비로그인 게스트의 /api/users/me 401(로그인 여부 probe)은 정상 흐름이므로
      // 리다이렉트하지 않는다 → 공유 링크로 들어온 게스트가 상세에 머묾.
      // (authStore는 메모리 전용이라 게스트는 항상 isLoggedIn=false)
      const wasLoggedIn = useAuthStore.getState().isLoggedIn
      useAuthStore.getState().logout()
      if (wasLoggedIn && typeof window !== 'undefined' && window.location.pathname !== '/login') {
        const returnUrl = encodeURIComponent(window.location.pathname)
        window.location.href = `/login?returnUrl=${returnUrl}`
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default apiClient
