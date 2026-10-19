import apiClient from './client'
import type { ApiResponse, DemoDepositRequest, DemoDepositResponse } from './types'

// 심사용 입금 시뮬레이터 — 데모 회원만 가능(그 외 403). 대상 결제 대기 건으로 샘플 입금 알림을 만들어 자동 대사를 태운다. (KAN-409)
export const submitDemoDeposit = async (data: DemoDepositRequest): Promise<DemoDepositResponse> => {
  const response = await apiClient.post<ApiResponse<DemoDepositResponse>>('/api/payments/demo-deposit', data)
  return response.data.data
}
