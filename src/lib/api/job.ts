import apiClient from './client'
import type { ApiResponse, JobGroup } from './types'

// 직업군 + 세부직업 카탈로그 조회 (회원가입 직업 콤보박스용). 공개 API. (KAN-270)
export const fetchJobs = async (): Promise<JobGroup[]> => {
  const response = await apiClient.get<ApiResponse<JobGroup[]>>('/api/jobs')
  return response.data.data
}
