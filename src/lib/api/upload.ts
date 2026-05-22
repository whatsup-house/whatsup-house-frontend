import apiClient from './client'
import type { ApiResponse, ImageUploadResponse } from './types'

export const uploadImage = async (blob: Blob, filename = 'image.jpg'): Promise<string> => {
  const formData = new FormData()
  formData.append('file', blob, filename)
  const response = await apiClient.post<ApiResponse<ImageUploadResponse>>('/api/images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data.data.imageUrl
}
