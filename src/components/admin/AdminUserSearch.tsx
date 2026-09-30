'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAdminUsers } from '@/lib/hooks/useAdminUsers'

interface SearchedUser {
  id: string
  nickname: string
}

interface AdminUserSearchProps {
  // 검색 결과 행 오른쪽 버튼 (추가·채팅 금지 등)
  renderActions: (user: SearchedUser) => ReactNode
}

interface SearchResultsProps extends AdminUserSearchProps {
  keyword: string
}

// 검색어가 있을 때만 마운트해 빈 검색(전체 회원) 조회를 하지 않는다
function SearchResults({ keyword, renderActions }: SearchResultsProps) {
  const { data, isLoading } = useAdminUsers(keyword, 0)
  const users = data?.content ?? []

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <LoadingSpinner size="sm" />
      </div>
    )
  }
  if (users.length === 0) return <p className="py-3 text-center text-xs text-tag-text">검색 결과가 없어요.</p>

  return (
    <ul className="mt-2 divide-y divide-tag-bg rounded-input border border-tag-bg">
      {users.map((user) => (
        <li key={user.id} className="flex items-center gap-2 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{user.nickname}</p>
            <p className="truncate text-[11px] text-tag-text">{user.email}</p>
          </div>
          <div className="shrink-0">{renderActions({ id: user.id, nickname: user.nickname })}</div>
        </li>
      ))}
    </ul>
  )
}

// 기존 회원 관리 검색 API(닉네임·이메일)로 사람을 찾는다. 상위 10명만 보여준다.
export default function AdminUserSearch({ renderActions }: AdminUserSearchProps) {
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setKeyword(input.trim())
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="닉네임으로 검색"
          className="h-10 min-w-0 flex-1 rounded-input border border-tag-bg bg-card px-3 text-sm text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-input bg-foreground text-white"
          aria-label="회원 검색"
        >
          <Search size={16} />
        </button>
      </form>
      {keyword && <SearchResults keyword={keyword} renderActions={renderActions} />}
    </div>
  )
}
