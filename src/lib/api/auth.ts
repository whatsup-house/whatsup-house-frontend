import apiClient from './client'
import type {
  ApiResponse,
  FindEmailRequest,
  FindEmailResponse,
  LoginResponse,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  PasswordResetRequest,
  PasswordResetRequestResponse,
  ProfileUpdateRequest,
  RegisterRequest,
  RegisterResponse,
  UserProfile,
  UserWithdrawRequest,
  UserWithdrawResponse,
} from './types'

// 로그인
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await apiClient.post<ApiResponse<LoginResponse>>('/api/auth/login', {
    email,
    password,
  })
  return response.data.data
}

// 로그아웃
export const logout = async (): Promise<void> => {
  await apiClient.post('/api/auth/logout')
}

// 회원가입 (토큰 미반환 — 이후 별도 로그인 필요)
export const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const response = await apiClient.post<ApiResponse<RegisterResponse>>('/api/auth/register', data)
  return response.data.data
}

// 아이디 찾기
export const findEmail = async (data: FindEmailRequest): Promise<FindEmailResponse> => {
  const response = await apiClient.post<ApiResponse<FindEmailResponse>>('/api/auth/find-email', data)
  return response.data.data
}

// 비밀번호 재설정 요청
export const requestPasswordReset = async (
  data: PasswordResetRequest
): Promise<PasswordResetRequestResponse> => {
  const response = await apiClient.post<ApiResponse<PasswordResetRequestResponse>>(
    '/api/auth/password-reset/request',
    data
  )
  return response.data.data
}

// 비밀번호 재설정 확정
export const confirmPasswordReset = async (
  data: PasswordResetConfirmRequest
): Promise<PasswordResetConfirmResponse> => {
  const response = await apiClient.post<ApiResponse<PasswordResetConfirmResponse>>(
    '/api/auth/password-reset/confirm',
    data
  )
  return response.data.data
}

// 내 프로필 조회
export const fetchMyProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<ApiResponse<UserProfile>>('/api/users/me')
  return response.data.data
}

// 내 프로필 수정
export const updateMyProfile = async (data: ProfileUpdateRequest): Promise<UserProfile> => {
  const response = await apiClient.put<ApiResponse<UserProfile>>('/api/users/me', data)
  return response.data.data
}

// 회원탈퇴
export const withdrawMyAccount = async (data: UserWithdrawRequest): Promise<UserWithdrawResponse> => {
  const response = await apiClient.delete<ApiResponse<UserWithdrawResponse>>('/api/users/me', {
    data,
  })
  return response.data.data
}

// 닉네임 중복 확인 (true = 사용 가능)
export const checkNickname = async (nickname: string): Promise<boolean> => {
  const response = await apiClient.get<ApiResponse<{ available: boolean }>>(
    `/api/users/check-nickname?nickname=${encodeURIComponent(nickname)}`
  )
  return response.data.data.available
}

// 이메일 중복 확인 (true = 사용 가능)
export const checkEmail = async (email: string): Promise<boolean> => {
  const response = await apiClient.get<ApiResponse<{ available: boolean }>>(
    `/api/users/check-email?email=${encodeURIComponent(email)}`
  )
  return response.data.data.available
}
