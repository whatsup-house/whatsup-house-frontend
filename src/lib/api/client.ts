import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터: JWT 토큰 자동 첨부
apiClient.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const token = JSON.parse(stored)?.state?.accessToken
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // localStorage 파싱 실패 시 무시
  }
  return config
})

// 응답 인터셉터: 401/403 시 auth 상태 초기화 후 로그인 페이지 이동
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401 || status === 403) {
      try { localStorage.removeItem('auth-storage') } catch { /* ignore */ }
      if (typeof window !== 'undefined') {
        const returnUrl = encodeURIComponent(window.location.pathname)
        window.location.href = `/login?returnUrl=${returnUrl}`
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
