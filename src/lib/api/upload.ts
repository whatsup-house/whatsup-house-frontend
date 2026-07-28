import apiClient from './client'
import type { ApiResponse, ImageUploadResponse, UploadFolder } from './types'

// 백엔드 ImageController는 POST /api/images 이며 folder를 필수 쿼리 파라미터로 받는다.
// 업로드 결과인 tempPath를 도메인 등록/수정 요청에 그대로 넘겨야 정식 폴더로 이동된다.
export const uploadImage = async (
  blob: Blob,
  filename = 'image.jpg',
  folder: UploadFolder = 'review',
): Promise<ImageUploadResponse> => {
  const formData = new FormData()
  formData.append('file', blob, filename)
  const response = await apiClient.post<ApiResponse<ImageUploadResponse>>(
    `/api/images?folder=${folder}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
  return response.data.data
}
