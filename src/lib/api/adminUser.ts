import apiClient from './client'
import type { ApiResponse } from './types'
import { IS_MOCK, MOCK_USERS, MOCK_USER_DETAIL, getMockUserPage } from './mockData'

export interface AdminUserListItem {
  id: string
  nickname: string
  name: string | null
  phone: string | null
  email: string
  gender: string | null
  age: number | null
  job: string | null
  mbti: string | null
  createdAt: string
  applicationCount: number
  mileage: number
  accountStatus: string  // ACTIVE / SUSPENDED / ADMIN
}

export interface AdminUserDetail extends AdminUserListItem {
  bio: string | null
  animalType: string | null
  interests: string[] | null
  applicationHistory: AdminUserApplicationItem[]
}

export interface AdminUserApplicationItem {
  id: string
  gatheringTitle?: string
  status: string
  createdAt: string
  isGuest: boolean
}

export interface AdminUserPage {
  content: AdminUserListItem[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const adminUserApi = {
  getUsers: async (keyword?: string, page = 0, size = 10): Promise<AdminUserPage> => {
    if (IS_MOCK) return getMockUserPage(keyword, page, size)
    const params = new URLSearchParams()
    if (keyword) params.append('keyword', keyword)
    params.append('page', String(page))
    params.append('size', String(size))
    params.append('sort', 'createdAt,desc')
    const res = await apiClient.get<ApiResponse<AdminUserPage>>(`/api/admin/users?${params}`)
    return res.data.data
  },

  getUserDetail: async (id: string): Promise<AdminUserDetail> => {
    if (IS_MOCK) {
      const baseUser = MOCK_USERS.find((u) => u.id === id)
      return baseUser
        ? { ...MOCK_USER_DETAIL, ...baseUser }
        : MOCK_USER_DETAIL
    }
    const res = await apiClient.get<ApiResponse<AdminUserDetail>>(`/api/admin/users/${id}`)
    return res.data.data
  },

  updateStatus: async (id: string, suspend: boolean): Promise<void> => {
    if (IS_MOCK) { alert(`[Mock] 상태가 변경되었습니다 (실제 변경 안 됨)`); return }
    await apiClient.patch(`/api/admin/users/${id}/status?suspend=${suspend}`)
  },
}
