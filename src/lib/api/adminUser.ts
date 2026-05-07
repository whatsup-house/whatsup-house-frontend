import apiClient from './client'
import type { ApiResponse, AdminUserListItem, AdminUserDetail, AdminUserPage } from './types'

export const adminUserApi = {
  getUsers: async (keyword?: string, page = 0, size = 10): Promise<AdminUserPage> => {
    const params = new URLSearchParams()
    if (keyword) params.append('keyword', keyword)
    params.append('page', String(page))
    params.append('size', String(size))
    params.append('sort', 'createdAt,desc')
    const res = await apiClient.get<ApiResponse<AdminUserPage>>(`/api/admin/users?${params}`)
    return res.data.data
  },

  getUserDetail: async (id: string): Promise<AdminUserDetail> => {
    const res = await apiClient.get<ApiResponse<AdminUserDetail>>(`/api/admin/users/${id}`)
    return res.data.data
  },

  updateStatus: async (id: string, suspend: boolean): Promise<void> => {
    await apiClient.patch(`/api/admin/users/${id}/status?suspend=${suspend}`)
  },
}

export type { AdminUserListItem, AdminUserDetail, AdminUserPage }
