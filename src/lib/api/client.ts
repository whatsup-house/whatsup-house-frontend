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

    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/api/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    // /api/users/me 는 앱 초기 인증 확인용 — refresh 실패 시 login 리다이렉트 하지 않음
    const isInitAuthCall = original.url?.includes('/api/users/me') ?? false

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
      if (!isInitAuthCall && typeof window !== 'undefined') {
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
