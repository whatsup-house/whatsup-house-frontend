'use client'

import { useState } from 'react'
import dayjs from 'dayjs'
import type { AdminUserListItem } from '@/lib/api/types'
import { useAdminUsers } from '@/lib/hooks/useAdminUsers'
import { UserDetailPanel } from '@/components/admin/UserDetailPanel'
import { LoadingSpinner, Pagination } from '@/components/ui'

export default function AdminUsersPage() {
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(0)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data, isLoading } = useAdminUsers(keyword, page)
  const users: AdminUserListItem[] = data?.content ?? []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
    setKeyword(searchInput)
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-5">
          <h1 className="font-bold text-[22px] text-foreground">회원 관리</h1>
          <span className="text-sm text-[#767676]">총 {data?.totalElements ?? 0}명</span>
        </div>

        <form
          onSubmit={handleSearch}
          className="bg-white rounded-[12px] p-4 mb-4 flex flex-col sm:flex-row gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
        >
          <input
            id="input-user-search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="닉네임 또는 이메일로 검색"
            className="flex-1 min-w-0 h-11 px-4 border border-tag-bg rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="px-5 h-11 bg-primary text-white rounded-[12px] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            검색
          </button>
          {keyword && (
            <button
              type="button"
              onClick={() => { setKeyword(''); setSearchInput(''); setPage(0) }}
              className="px-4 h-11 border border-[#E0E0E0] text-[#767676] rounded-[12px] text-sm hover:border-primary transition-colors"
            >
              초기화
            </button>
          )}
        </form>

        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[#F5F5F5] text-xs text-[#767676] uppercase">
                {['닉네임', '연락처', '이메일', '신청/출석', '마일리지', '가입일', '구분', '상세'].map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="py-12 text-center"><LoadingSpinner /></td></tr>
              )}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[#767676]">
                    {keyword ? `"${keyword}" 검색 결과가 없습니다.` : '등록된 회원이 없습니다.'}
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#F0EBE8] hover:bg-[#F5F0EB] transition-colors">
                  <td className="px-4 py-3 font-medium text-[14px]">{u.nickname}</td>
                  <td className="px-4 py-3 text-[13px] text-[#767676] whitespace-nowrap">{u.phone ?? '-'}</td>
                  <td className="px-4 py-3 text-[13px] text-[#767676] max-w-[200px] truncate">{u.email}</td>
                  <td className="px-4 py-3 text-[13px] text-[#767676]">
                    {u.totalApplications}건 / 출석 {u.attendedCount}
                  </td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap">{u.mileage.toLocaleString()}M</td>
                  <td className="px-4 py-3 text-[13px] text-[#767676] whitespace-nowrap">
                    {dayjs(u.createdAt).format('YY.MM.DD')}
                  </td>
                  <td className="px-4 py-3">
                    {u.admin ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#E3F2FD] text-[#1976D2]">관리자</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#F5F5F5] text-[#767676]">회원</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedUserId(u.id)}
                      className="text-primary text-[13px] hover:underline"
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={data?.totalPages ?? 0}
          onPageChange={setPage}
        />
      </div>

      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  )
}
