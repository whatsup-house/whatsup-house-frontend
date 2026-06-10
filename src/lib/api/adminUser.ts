import apiClient from './client'
import type { ApiResponse, AdminUserListItem, AdminUserDetail, AdminUserPage } from './types'

export type UserAccountStatus = 'ACTIVE' | 'SUSPENDED'

export const adminUserApi = {
  // 백엔드 검색 파라미터는 search. (KAN-187) sort는 백엔드 미지원이라 보내지 않는다.
  getUsers: async (search?: string, page = 0, size = 10): Promise<AdminUserPage> => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    params.append('page', String(page))
    params.append('size', String(size))
    const res = await apiClient.get<ApiResponse<AdminUserPage>>(`/api/admin/users?${params}`)
    return res.data.data
  },

  getUserDetail: async (id: string): Promise<AdminUserDetail> => {
    const res = await apiClient.get<ApiResponse<AdminUserDetail>>(`/api/admin/users/${id}`)
    return res.data.data
  },

  // 계정 상태 변경. 백엔드는 body { status } 를 받는다. (KAN-188)
  updateStatus: async (id: string, status: UserAccountStatus): Promise<void> => {
    await apiClient.patch(`/api/admin/users/${id}/status`, { status })
  },
}

export type { AdminUserListItem, AdminUserDetail, AdminUserPage }
