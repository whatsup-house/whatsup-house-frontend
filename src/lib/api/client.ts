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
      original.url?.includes('/api/auth/refresh') ||
      original.url?.includes('/api/users/me')
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
      useAuthStore.getState().logout()
      if (typeof window !== 'undefined') {
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
