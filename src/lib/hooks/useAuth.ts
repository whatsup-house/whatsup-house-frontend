'use client'

import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  checkNickname,
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
  const router = useRouter()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: (data) => {
      storeLogin(data.user.id, data.user.nickname, data.user.admin)
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
  const router = useRouter()

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      await register(data)
      return login(data.email, data.password)
    },
    onSuccess: (loginData) => {
      storeLogin(loginData.user.id, loginData.user.nickname, loginData.user.admin)
      router.push('/')
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
  const router = useRouter()

  return useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      storeLogout()
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
