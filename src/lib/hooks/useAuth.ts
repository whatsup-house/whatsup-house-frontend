'use client'

import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  checkNickname,
  checkEmail,
  confirmPasswordReset,
  changeMyPassword,
  fetchMyProfile,
  findEmail,
  login,
  logout as logoutApi,
  register,
  requestPasswordReset,
  updateMyProfile,
  withdrawMyAccount,
} from '@/lib/api/auth'
import { useAuthStore } from '@/lib/store/authStore'
import { markWelcomeSeen } from '@/lib/utils/welcomeCookie'
import { useRouter } from 'next/navigation'
import type {
  FindEmailRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  ProfileUpdateRequest,
  RegisterRequest,
  UserWithdrawRequest,
} from '@/lib/api/types'

export function useInitAuth() {
  const { login: storeLogin, logout: storeLogout } = useAuthStore()

  const query = useQuery({
    queryKey: ['auth-me'],
    queryFn: fetchMyProfile,
    staleTime: Infinity,
    // 게스트(401)는 data가 undefined라 staleTime과 무관하게 stale로 판정돼
    // 포커스·재연결마다 /me → /refresh를 재호출한다. 갱신은 로그인·로그아웃 경로에서만. (KAN-326)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    throwOnError: false,
  })

  useEffect(() => {
    if (query.isSuccess && query.data) {
      storeLogin(query.data.id, query.data.nickname, query.data.admin ?? false)
    } else if (query.isError) {
      storeLogout()
    }
  }, [query.isSuccess, query.isError, query.data, storeLogin, storeLogout])

  return query
}

export function useLogin(returnUrl: string = '/') {
  const { login: storeLogin } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: (data) => {
      // 이전 세션의 서버 캐시를 폐기해 다른 계정 로그인 시 stale 데이터 노출을 막는다. (KAN-249)
      queryClient.clear()
      storeLogin(data.user.id, data.user.nickname, data.user.admin)
      // proxy.ts는 인증 쿠키를 볼 수 없어 이 쿠키로 로그인 사용자의 /welcome 리다이렉트를 막는다. (KAN-323)
      markWelcomeSeen()
      router.push(returnUrl)
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) => register(data),
  })
}

export function useRegisterAndLogin() {
  const { login: storeLogin } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      await register(data)
      return login(data.email, data.password)
    },
    onSuccess: (loginData) => {
      // 이전 세션의 서버 캐시를 폐기해 새 계정 데이터로 갱신되게 한다. (KAN-249)
      queryClient.clear()
      storeLogin(loginData.user.id, loginData.user.nickname, loginData.user.admin)
      markWelcomeSeen() // KAN-323: proxy.ts 오리다이렉트 방지
      router.push('/mypage')
    },
  })
}

export function useFindEmail() {
  return useMutation({
    mutationFn: (data: FindEmailRequest) => findEmail(data),
  })
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (data: PasswordResetRequest) => requestPasswordReset(data),
  })
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: (data: PasswordResetConfirmRequest) => confirmPasswordReset(data),
  })
}

export function useCheckNickname(nickname: string) {
  return useQuery({
    queryKey: ['nickname-check', nickname],
    queryFn: () => checkNickname(nickname),
    enabled: nickname.length >= 2,
    staleTime: 1000 * 10,
  })
}

export function useCheckEmail(email: string) {
  return useQuery({
    queryKey: ['email-check', email],
    queryFn: () => checkEmail(email),
    enabled: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    staleTime: 1000 * 10,
  })
}

export function useMyProfile() {
  const { isLoggedIn } = useAuthStore()
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: fetchMyProfile,
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ProfileUpdateRequest) => updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
    },
  })
}

export function useLogout() {
  const { logout: storeLogout } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      storeLogout()
      // 로그아웃 후 이전 사용자 서버 캐시가 남지 않도록 폐기한다. (KAN-249)
      queryClient.clear()
      router.push('/')
    },
  })
}

// 비밀번호 변경 (KAN-223)
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      changeMyPassword(data),
  })
}

export function useWithdrawAccount() {
  const { logout: storeLogout } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (data: UserWithdrawRequest) => withdrawMyAccount(data),
    onSuccess: () => {
      storeLogout()
      queryClient.clear()
      router.push('/login?withdrawn=1')
    },
  })
}
